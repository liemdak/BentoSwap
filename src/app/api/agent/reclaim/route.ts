import { NextRequest, NextResponse } from "next/server";

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
// body: { walletId, walletAddress, recipientAddress, message, signature }
// Caller must sign `message` with the MetaMask wallet (personal_sign / EIP-191)
// Server verifies ecrecover(message, signature) === walletAddress
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    walletId?:         string;
    walletAddress?:    string;
    recipientAddress?: string;
    message?:          string;
    signature?:        string;
  };

  const { walletId, walletAddress, recipientAddress, message, signature } = body;

  if (!walletId || !walletAddress || !recipientAddress || !message || !signature) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── Verify EIP-191 signature ─────────────────────────────
  // Only the real owner of walletAddress can produce a valid signature
  try {
    const { verifyMessage } = await import("viem");
    const valid = await verifyMessage({
      address:   walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!valid) return NextResponse.json({ error: "Invalid signature — wallet mismatch" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

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
