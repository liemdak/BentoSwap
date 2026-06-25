import { NextRequest, NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

function getClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_AGENT_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });
}

// GET /api/agent/status?txId=xxx · poll transaction status
export async function GET(req: NextRequest) {
  const txId = req.nextUrl.searchParams.get("txId");
  if (!txId) return NextResponse.json({ error: "Missing txId" }, { status: 400 });

  try {
    const client = getClient();
    const res = await client.getTransaction({ id: txId });
    const tx = res.data?.transaction;
    return NextResponse.json({
      state: tx?.state,
      txHash: tx?.txHash,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
