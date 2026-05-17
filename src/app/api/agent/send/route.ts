import { NextRequest, NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { requireToken } from "@/lib/agentAuth";

function getClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey:       process.env.CIRCLE_AGENT_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });
}

const USDC_ARC = "0x3600000000000000000000000000000000000000";

export interface SendRecipient {
  address: string;
  amount:  string; // e.g. "10.5"
}

// POST /api/agent/send — send USDC to multiple recipients from agent wallet
export async function POST(req: NextRequest) {
  try {
    const { walletId, walletAddress, recipients, token } = (await req.json()) as {
      walletId:      string;
      walletAddress: string;
      recipients:    SendRecipient[];
      token:         string;
    };

    // Verify HMAC token
    const auth = requireToken(walletId, token);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

    if (!walletAddress || !recipients?.length) {
      return NextResponse.json({ error: "Missing walletAddress or recipients" }, { status: 400 });
    }

    // Server-side spend guard: reject single transfers > 10,000 USDC
    const MAX_PER_TX = 10_000;
    for (const r of recipients) {
      if (parseFloat(r.amount) > MAX_PER_TX) {
        return NextResponse.json({ error: `Amount ${r.amount} exceeds max ${MAX_PER_TX} USDC per transaction` }, { status: 400 });
      }
    }

    const client  = getClient();
    const results: { address: string; txId: string; status: string }[] = [];

    for (const r of recipients) {
      const amountInUnits = Math.round(parseFloat(r.amount) * 1_000_000).toString();

      const res = await client.createContractExecutionTransaction({
        walletAddress,
        blockchain:           "ARC-TESTNET",
        contractAddress:      USDC_ARC,
        abiFunctionSignature: "transfer(address,uint256)",
        abiParameters:        [r.address, amountInUnits],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      results.push({
        address: r.address,
        txId:    res.data?.id ?? "",
        status:  "submitted",
      });
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
