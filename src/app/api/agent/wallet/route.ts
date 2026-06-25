import { NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { signWalletId } from "@/lib/agentAuth";

function getClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey:       process.env.CIRCLE_AGENT_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });
}

// POST /api/agent/wallet · create a new agent wallet, return signed token
export async function POST() {
  try {
    const client = getClient();

    const setRes = await client.createWalletSet({ name: "Bento Agent Wallets" });
    const walletSetId = setRes.data?.walletSet?.id;
    if (!walletSetId) throw new Error("Failed to create wallet set");

    const walletRes = await client.createWallets({
      blockchains: ["ARC-TESTNET"],
      count:       1,
      walletSetId,
      accountType: "SCA",
    });

    const wallet = walletRes.data?.wallets?.[0];
    if (!wallet) throw new Error("Failed to create wallet");

    // Issue a token tied to this walletId · stored client-side, required for execute
    const token = signWalletId(wallet.id);

    return NextResponse.json({
      address:  wallet.address,
      walletId: wallet.id,
      token,            // client must store and send on every execute/send call
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
