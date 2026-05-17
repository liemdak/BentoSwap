import { NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

function getClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_AGENT_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });
}

// POST /api/agent/wallet — create a new agent wallet
export async function POST() {
  try {
    const client = getClient();

    const setRes = await client.createWalletSet({ name: "Bento Agent Wallets" });
    const walletSetId = setRes.data?.walletSet?.id;
    if (!walletSetId) throw new Error("Failed to create wallet set");

    const walletRes = await client.createWallets({
      blockchains: ["ARC-TESTNET"],
      count: 1,
      walletSetId,
      accountType: "SCA",
    });

    const wallet = walletRes.data?.wallets?.[0];
    if (!wallet) throw new Error("Failed to create wallet");

    return NextResponse.json({ address: wallet.address, walletId: wallet.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
