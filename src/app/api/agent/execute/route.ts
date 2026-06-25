import { NextRequest, NextResponse } from "next/server";
import { StoredTask } from "@/lib/agentTasks";
import { requireToken } from "@/lib/agentAuth";

// Dynamically import Circle SDK (server-only)
async function getCircleClient() {
  const apiKey       = process.env.CIRCLE_AGENT_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) return null;

  const { initiateDeveloperControlledWalletsClient } =
    await import("@circle-fin/developer-controlled-wallets");
  return initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
}

const USDC_ARC = "0x3600000000000000000000000000000000000000";

// POST /api/agent/execute  · run one task now
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { task: StoredTask; token?: string };
  const { task, token } = body;
  if (!task) return NextResponse.json({ error: "Missing task" }, { status: 400 });

  // Verify HMAC token · prevents unauthorized execution of arbitrary wallets
  const auth = requireToken(task.id, token);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const client = await getCircleClient();

    // ── Recurring Payout ────────────────────────────────────
    if (task.mode === "payout") {
      const rules = task.config.payoutRules ?? [];
      const valid = rules.filter(r => r.address.startsWith("0x") && parseFloat(r.amount) > 0);
      if (!valid.length) return NextResponse.json({ error: "No valid payout rules" }, { status: 400 });

      if (!client) {
        // No Circle keys · log and return OK (demo mode)
        console.log("[execute] DEMO payout:", valid.map(r => `${r.amount} USDC → ${r.address}`));
        return NextResponse.json({ mode: "demo", results: valid.map(r => ({ address: r.address, status: "demo" })) });
      }

      const results = [];
      for (const r of valid) {
        const units = Math.round(parseFloat(r.amount) * 1_000_000).toString();
        const res   = await client.createContractExecutionTransaction({
          walletAddress:        task.walletAddress,
          blockchain:           "ARC-TESTNET",
          contractAddress:      USDC_ARC,
          abiFunctionSignature: "transfer(address,uint256)",
          abiParameters:        [r.address, units],
          fee: { type: "level", config: { feeLevel: "MEDIUM" } },
        });
        results.push({ address: r.address, txId: res.data?.id ?? "", status: "submitted" });
      }
      return NextResponse.json({ results });
    }

    // ── Auto Top-Up ─────────────────────────────────────────
    if (task.mode === "topup") {
      if (!client) {
        console.log("[execute] DEMO top-up: refill", task.config.tuRefill, "USDC");
        return NextResponse.json({ mode: "demo", status: "demo" });
      }
      // TODO: check balance then send if needed
      return NextResponse.json({ status: "ok", note: "balance check not yet implemented" });
    }

    // ── Auto Split ──────────────────────────────────────────
    if (task.mode === "autosplit") {
      const total = parseFloat(task.config.splitTotal ?? "0");
      const rules = (task.config.splitRules ?? []).filter(r => r.address.startsWith("0x") && parseFloat(r.pct) > 0);
      if (!rules.length || total <= 0) return NextResponse.json({ error: "Invalid split config" }, { status: 400 });

      if (!client) {
        console.log("[execute] DEMO split:", rules.map(r => `${(total * parseFloat(r.pct) / 100).toFixed(2)} USDC → ${r.address}`));
        return NextResponse.json({ mode: "demo" });
      }

      const results = [];
      for (const r of rules) {
        const amount = (total * parseFloat(r.pct) / 100).toFixed(6);
        const units  = Math.round(parseFloat(amount) * 1_000_000).toString();
        const res    = await client.createContractExecutionTransaction({
          walletAddress:        task.walletAddress,
          blockchain:           "ARC-TESTNET",
          contractAddress:      USDC_ARC,
          abiFunctionSignature: "transfer(address,uint256)",
          abiParameters:        [r.address, units],
          fee: { type: "level", config: { feeLevel: "MEDIUM" } },
        });
        results.push({ address: r.address, txId: res.data?.id ?? "" });
      }
      return NextResponse.json({ results });
    }

    // ── Auto Distribute ─────────────────────────────────────
    if (task.mode === "distribute") {
      if (!client) {
        console.log("[execute] DEMO distribute surplus above", task.config.distCap, "USDC");
        return NextResponse.json({ mode: "demo" });
      }
      return NextResponse.json({ status: "ok", note: "balance check not yet implemented" });
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[execute] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
