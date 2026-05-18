import { NextRequest, NextResponse } from "next/server";
import { requireToken } from "@/lib/agentAuth";

const ARC_USDC    = "0x3600000000000000000000000000000000000000";
const ARC_RPC     = "https://rpc.testnet.arc.network";

async function getCircleClient() {
  const apiKey       = process.env.CIRCLE_AGENT_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) return null;
  const { initiateDeveloperControlledWalletsClient } =
    await import("@circle-fin/developer-controlled-wallets");
  return initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
}

// POST /api/agent/reclaim
// body: { walletId, token, walletAddress, recipientAddress }
// Sends all USDC from agent wallet back to the user's wallet
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    walletId?:        string;
    token?:           string;
    walletAddress?:   string;
    recipientAddress?: string;
  };

  const { walletId, token, walletAddress, recipientAddress } = body;

  if (!walletId || !walletAddress || !recipientAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify HMAC — only the original deployer can reclaim
  const auth = requireToken(walletId, token);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    // ── Query on-chain USDC balance ──────────────────────────
    const { createPublicClient, http, erc20Abi } = await import("viem");
    const { arcTestnet }                          = await import("@/lib/chains");

    const publicClient = createPublicClient({
      chain:     arcTestnet,
      transport: http(ARC_RPC),
    });

    const rawBalance = await publicClient.readContract({
      address:      ARC_USDC as `0x${string}`,
      abi:          erc20Abi,
      functionName: "balanceOf",
      args:         [walletAddress as `0x${string}`],
    }) as bigint;

    const { formatUnits } = await import("viem");
    const balance = formatUnits(rawBalance, 6);

    if (parseFloat(balance) < 0.01) {
      return NextResponse.json(
        { error: "Balance too low to reclaim", balance },
        { status: 400 }
      );
    }

    // ── Demo mode (no Circle keys) ───────────────────────────
    const client = await getCircleClient();
    if (!client) {
      console.log("[reclaim] DEMO mode — would send", balance, "USDC →", recipientAddress);
      return NextResponse.json({
        status:  "demo",
        balance,
        note:    "Circle API not configured — demo only",
      });
    }

    // ── Execute transfer via Circle DCW ──────────────────────
    const units = rawBalance.toString();
    const res   = await client.createContractExecutionTransaction({
      walletAddress,
      blockchain:           "ARC-TESTNET",
      contractAddress:      ARC_USDC,
      abiFunctionSignature: "transfer(address,uint256)",
      abiParameters:        [recipientAddress, units],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });

    const txId = res.data?.id ?? "";
    return NextResponse.json({
      status:      "submitted",
      txId,
      balance,
      explorerUrl: txId ? `https://testnet.arcscan.app/tx/${txId}` : "",
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[reclaim] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
