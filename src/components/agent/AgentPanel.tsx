"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadTasks, saveTasks, upsertTask, toISO, fmtNextRun, countdown,
  StoredTask,
} from "@/lib/agentTasks";
import { useAgentRunner } from "@/hooks/useAgentRunner";
import { useArcUsdcBalance } from "@/hooks/useTokenBalance";

// ── Types ──────────────────────────────────────────────────
type AgentMode  = "topup" | "autosplit" | "payout" | "distribute";
type TaskStatus = "active" | "paused";
type Freq       = "daily" | "weekly" | "monthly";

// Legacy UI type — mapped from StoredTask for display
interface AgentTask {
  id:            string;
  walletAddress: string;
  mode:          AgentMode;
  label:         string;
  sublabel:      string;
  status:        TaskStatus;
  createdAt:     string;
  nextRunAt:     string;
  lastRunAt?:    string;
  lastResult?:   "ok" | "fail";
  lastError?:    string;
  runCount:      number;
}

interface SplitRule  { address: string; pct: string; }
interface PayoutRule {
  address:   string;
  amount:    string;
  name:      string;
  firstDate: string; // YYYY-MM-DD — first payment, used to derive recurring day/weekday
  time:      string; // HH:MM
}

// ── Constants ─────────────────────────────────────────────
const CHAINS = [
  { id: "arc",  name: "Arc Testnet",  color: "#C8102E" },
  { id: "base", name: "Base Sepolia", color: "#0052FF" },
  { id: "eth",  name: "Eth Sepolia",  color: "#627EEA" },
  { id: "arb",  name: "Arb Sepolia",  color: "#12AAFF" },
];

const FREQ_OPTS: { value: Freq; label: string }[] = [
  { value: "daily",   label: "Daily"   },
  { value: "weekly",  label: "Weekly"  },
  { value: "monthly", label: "Monthly" },
];

const FEATURE_CARDS = [
  {
    mode:        "topup"      as AgentMode,
    tag:         "AUTO TOP-UP",
    title:       "Auto Top-Up",
    description: "Automatically refill your wallet when balance drops below a threshold you set.",
    badges:      ["Gasless", "EIP-712"],
  },
  {
    mode:        "autosplit"  as AgentMode,
    tag:         "AUTO SPLIT",
    title:       "Auto Split",
    description: "Split USDC across multiple wallets by percentage — daily, weekly, or monthly.",
    badges:      ["Multi-wallet", "Recurring"],
    isNew:       true,
  },
  {
    mode:        "payout"     as AgentMode,
    tag:         "RECURRING PAYOUT",
    title:       "Recurring Payout",
    description: "Pay fixed USDC amounts to specific wallets on a recurring schedule. Perfect for payroll or subscriptions.",
    badges:      ["Fixed amount", "Payroll"],
    isNew:       true,
  },
  {
    mode:        "distribute" as AgentMode,
    tag:         "AUTO DISTRIBUTE",
    title:       "Auto Distribute",
    description: "When your balance exceeds a cap, automatically distribute the surplus to designated wallets.",
    badges:      ["Condition-based", "Surplus"],
    isNew:       true,
  },
];

// ── Countdown ticker (re-renders every second) ─────────────
function useCountdowns(tasks: AgentTask[]) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!tasks.some(t => t.status === "active")) return;
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [tasks]);
}

// ──────────────────────────────────────────────────────────
export default function AgentPanel() {
  const [tasks,        setTasks]        = useState<AgentTask[]>([]);
  const [modal,        setModal]        = useState<AgentMode | null>(null);
  const [deploying,    setDeploying]    = useState(false);
  const [deployedInfo, setDeployedInfo] = useState<{ address: string; label: string } | null>(null);

  // ── Load tasks from localStorage on mount ───────────────
  useEffect(() => {
    const stored = loadTasks();
    setTasks(stored as AgentTask[]);
  }, []);

  // ── Client-side runner (checks every 20s) ───────────────
  const handleRunnerUpdate = useCallback((updated: StoredTask[]) => {
    setTasks(updated as AgentTask[]);
  }, []);
  useAgentRunner({ onUpdate: handleRunnerUpdate });

  // Countdown ticker
  useCountdowns(tasks);
  const [error,     setError]     = useState("");

  // ── Auto Top-Up ──────────────────────────────────────────
  const [tuChain,     setTuChain]     = useState("arc");
  const [tuThreshold, setTuThreshold] = useState("10");
  const [tuRefill,    setTuRefill]    = useState("50");
  const [tuCap,       setTuCap]       = useState("500");

  // ── Auto Split ───────────────────────────────────────────
  const [splitTotal, setSplitTotal] = useState("1000");
  const [splitFreq,  setSplitFreq]  = useState<Freq>("weekly");
  const [splitRules, setSplitRules] = useState<SplitRule[]>([
    { address: "", pct: "50" },
    { address: "", pct: "50" },
  ]);

  const addSplit    = () => setSplitRules(p => [...p, { address: "", pct: "0" }]);
  const removeSplit = (i: number) => setSplitRules(p => p.filter((_, idx) => idx !== i));
  const updateSplit = (i: number, f: keyof SplitRule, v: string) =>
    setSplitRules(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const totalPct   = splitRules.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);
  const pctOk      = Math.abs(totalPct - 100) < 0.01;
  const validSplit = splitRules.filter(r => r.address.startsWith("0x") && parseFloat(r.pct) > 0);

  // ── Recurring Payout ─────────────────────────────────────
  const [payoutFreq,  setPayoutFreq]  = useState<Freq>("monthly");
  const [payoutRules, setPayoutRules] = useState<PayoutRule[]>([
    { address: "", amount: "", name: "", firstDate: "", time: "09:00" },
  ]);

  const addPayout    = () => setPayoutRules(p => [...p, { address: "", amount: "", name: "", firstDate: "", time: "09:00" }]);
  const removePayout = (i: number) => setPayoutRules(p => p.filter((_, idx) => idx !== i));
  const updatePayout = (i: number, f: keyof PayoutRule, v: string) =>
    setPayoutRules(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const totalPayout   = payoutRules.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const validPayouts  = payoutRules.filter(r => r.address.startsWith("0x") && parseFloat(r.amount) > 0);

  // ── Auto Distribute ──────────────────────────────────────
  const [distChain,   setDistChain]   = useState("arc");
  const [distCap,     setDistCap]     = useState("1000");
  const [distRules,   setDistRules]   = useState<SplitRule[]>([
    { address: "", pct: "50" },
    { address: "", pct: "50" },
  ]);

  const addDist    = () => setDistRules(p => [...p, { address: "", pct: "0" }]);
  const removeDist = (i: number) => setDistRules(p => p.filter((_, idx) => idx !== i));
  const updateDist = (i: number, f: keyof SplitRule, v: string) =>
    setDistRules(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const distTotalPct = distRules.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);
  const distPctOk    = Math.abs(distTotalPct - 100) < 0.01;
  const validDist    = distRules.filter(r => r.address.startsWith("0x") && parseFloat(r.pct) > 0);

  // ── Helpers ──────────────────────────────────────────────
  const openModal  = (mode: AgentMode) => { setError(""); setModal(mode); setDeployedInfo(null); };
  const closeModal = () => { setModal(null); setDeploying(false); setError(""); setDeployedInfo(null); };

  const canDeploy = () => {
    if (modal === "topup")      return !!tuThreshold && !!tuRefill && !!tuCap;
    if (modal === "autosplit")  return validSplit.length >= 2 && pctOk && parseFloat(splitTotal) > 0;
    if (modal === "payout")     return validPayouts.length >= 1;
    if (modal === "distribute") return validDist.length >= 2 && distPctOk && parseFloat(distCap) > 0;
    return false;
  };

  // ── Deploy ───────────────────────────────────────────────
  const handleDeploy = async () => {
    setDeploying(true);
    setError("");
    try {
      const res  = await fetch("/api/agent/wallet", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create wallet");

      const freqLabel = (f: Freq) => FREQ_OPTS.find(o => o.value === f)?.label ?? f;

      const MAP: Record<AgentMode, { label: string; sublabel: string }> = {
        topup:      { label: "Auto Top-Up",        sublabel: `Refill ${tuRefill} USDC when < ${tuThreshold} USDC · ${CHAINS.find(c => c.id === tuChain)?.name}` },
        autosplit:  { label: "Auto Split",          sublabel: `${freqLabel(splitFreq)} · split ${splitTotal} USDC → ${validSplit.length} wallets` },
        payout:     { label: "Recurring Payout",    sublabel: `${freqLabel(payoutFreq)} · ${totalPayout.toFixed(2)} USDC → ${validPayouts.length} recipient(s)` },
        distribute: { label: "Auto Distribute",     sublabel: `Distribute surplus above ${distCap} USDC → ${validDist.length} wallets · ${CHAINS.find(c => c.id === distChain)?.name}` },
      };

      // ── Compute first nextRunAt ──────────────────────────
      let nextRunAt = new Date(Date.now() + 60_000).toISOString(); // fallback: 1 min from now
      if (modal === "payout" && validPayouts[0]?.firstDate && validPayouts[0]?.time) {
        nextRunAt = toISO(validPayouts[0].firstDate, validPayouts[0].time);
      } else if (modal === "autosplit") {
        // First run: tomorrow same time
        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
        nextRunAt = d.toISOString();
      }

      // ── Build config ─────────────────────────────────────
      const configMap: Record<AgentMode, StoredTask["config"]> = {
        topup:      { tuChain, tuThreshold, tuRefill, tuCap },
        autosplit:  { splitTotal, splitFreq, splitRules },
        payout:     { payoutFreq, payoutRules },
        distribute: { distChain, distCap, distRules },
      };

      const storedTask: StoredTask = {
        id:            data.walletId,
        walletAddress: data.address ?? "",
        mode:          modal!,
        ...MAP[modal!],
        status:        "active",
        createdAt:     new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }),
        nextRunAt,
        runCount:      0,
        config:        configMap[modal!],
      };

      upsertTask(storedTask);
      setTasks(loadTasks() as AgentTask[]);
      // Show success state with wallet address + ArcScan link
      setDeployedInfo({ address: data.address ?? "", label: MAP[modal!].label });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeploying(false);
    }
  };

  const toggleTask = (id: string) => {
    const updated = loadTasks().map(t =>
      t.id === id ? { ...t, status: (t.status === "active" ? "paused" : "active") as TaskStatus } : t
    );
    saveTasks(updated);
    setTasks(updated as AgentTask[]);
  };
  const removeTask = (id: string) => {
    const updated = loadTasks().filter(t => t.id !== id);
    saveTasks(updated);
    setTasks(updated as AgentTask[]);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">

      {/* ══ 2×2 Feature Grid ═══════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURE_CARDS.map(card => (
          <FeatureCard
            key={card.mode}
            {...card}
            icon={<ModeIcon mode={card.mode} />}
            onClick={() => openModal(card.mode)}
          />
        ))}
      </div>

      {/* ══ Task List ══════════════════════════════════════ */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface">
        <div className="flex items-center justify-between border-b border-ink-border px-5 py-3.5">
          <span className="font-mono text-[11px] tracking-widest text-muted">{"// ACTIVE TASKS"}</span>
          {tasks.length > 0 && (
            <span className="rounded-full border border-ink-border2 px-2.5 py-0.5 font-mono text-[10px] text-muted">
              {tasks.filter(t => t.status === "active").length} running
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-border2 bg-ink-surface2">
              <EmptyIcon />
            </div>
            <p className="font-mono text-xs text-muted">No active tasks</p>
            <p className="max-w-xs text-center font-body text-sm text-muted">
              Select a feature above to deploy your first agent task
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink-border">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-ink-border2 bg-ink-surface2">
                  <ModeIcon mode={task.mode} small />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-cream-white">{task.label}</span>
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      task.status === "active" ? "bg-success animate-pulse" : "bg-muted"
                    }`} />
                    {task.lastResult === "ok" && (
                      <span className="rounded bg-success/20 px-1.5 py-0.5 font-mono text-[9px] text-success">
                        ✓ ran {task.runCount}×
                      </span>
                    )}
                    {task.lastResult === "fail" && (
                      <span className="rounded bg-red-bg px-1.5 py-0.5 font-mono text-[9px] text-red-primary" title={task.lastError}>
                        ✗ failed
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted">{task.sublabel}</div>

                  {/* Agent Wallet address + balance */}
                  {task.walletAddress && (
                    <AgentWalletRow address={task.walletAddress} />
                  )}

                  <div className="mt-0.5 flex items-center gap-2">
                    {task.status === "active" && task.nextRunAt && (
                      <span className="font-mono text-[10px] text-red-primary">
                        ⏱ {countdown(task.nextRunAt)}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-ink-border2">
                      Next: {fmtNextRun(task.nextRunAt)}
                    </span>
                    {task.lastRunAt && (
                      <span className="font-mono text-[10px] text-muted">
                        · Last: {fmtNextRun(task.lastRunAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="rounded border border-ink-border px-2.5 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-ink-border2 hover:text-cream-white"
                  >
                    {task.status === "active" ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="rounded border border-red-primary/25 px-2.5 py-1.5 font-mono text-[11px] text-red-primary transition-colors hover:bg-red-bg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-center gap-2 rounded-card border border-ink-border bg-ink-surface px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <p className="font-mono text-[11px] text-muted">
          Powered by Circle Developer Controlled Wallets · Arc Testnet · Gasless via Circle Paymaster
        </p>
      </div>

      {/* ══ MODAL ══════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-card2 border border-ink-border bg-ink-surface shadow-card-hover">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-border px-5 py-4">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-muted">
                  {{ topup: "{ AUTO TOP-UP }", autosplit: "{ AUTO SPLIT }", payout: "{ RECURRING PAYOUT }", distribute: "{ AUTO DISTRIBUTE }" }[modal]}
                </div>
                <div className="mt-0.5 font-display text-base text-cream-white">
                  {{ topup: "Configure Auto Top-Up", autosplit: "Configure Auto Split", payout: "Configure Recurring Payout", distribute: "Configure Auto Distribute" }[modal]}
                </div>
              </div>
              <button onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-border2 text-muted transition-colors hover:text-cream-white">
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-4">

              {/* ── SUCCESS SCREEN ────────────────────────── */}
              {deployedInfo ? (
                <div className="space-y-4">
                  {/* Success header */}
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-success/40 bg-success/10">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="#2D9B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-lg text-cream-white">Agent Deployed!</p>
                      <p className="mt-1 font-mono text-xs text-muted">{deployedInfo.label} is now active</p>
                    </div>
                  </div>

                  {/* Agent wallet info */}
                  {deployedInfo.address && (
                    <div className="rounded-card border border-success/30 bg-success/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-widest text-success">AGENT WALLET</span>
                        <a
                          href={`https://testnet.arcscan.app/address/${deployedInfo.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-[10px] text-muted hover:text-cream-white transition-colors"
                        >
                          View on ArcScan
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </a>
                      </div>

                      <p className="break-all font-mono text-xs text-cream-dim leading-relaxed">
                        {deployedInfo.address}
                      </p>

                      {/* Fund reminder */}
                      <div className="rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
                        <p className="font-mono text-[11px] text-yellow-400 leading-relaxed">
                          ⚠ Fund this wallet with USDC before the agent runs
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted">
                          Send USDC to the address above. The agent will use it to execute transactions on your behalf.
                        </p>
                      </div>

                      {/* What is this wallet? */}
                      <div className="space-y-1 border-t border-ink-border pt-2">
                        <p className="font-mono text-[10px] text-muted">
                          · This is a <span className="text-cream-dim">Circle Developer Controlled Wallet</span> — unique to this task
                        </p>
                        <p className="font-mono text-[10px] text-muted">
                          · Transactions are signed by Circle infrastructure — gasless via Paymaster
                        </p>
                        <p className="font-mono text-[10px] text-muted">
                          · You can cancel this task anytime from the dashboard
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={closeModal}
                    className="w-full rounded-lg bg-success py-3 font-body text-sm font-medium text-white transition-colors hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : (
              <>{/* ── AUTO TOP-UP ──────────────────────────── */}
              {modal === "topup" && (
                <>
                  <ConfigRow label="Source chain">
                    <ChainPicker value={tuChain} onChange={setTuChain} />
                  </ConfigRow>
                  <ConfigRow label="Trigger when balance drops below">
                    <AmountInput value={tuThreshold} onChange={setTuThreshold} />
                  </ConfigRow>
                  <ConfigRow label="Refill amount per trigger">
                    <AmountInput value={tuRefill} onChange={setTuRefill} />
                  </ConfigRow>
                  <ConfigRow label="Safety cap per 24h">
                    <AmountInput value={tuCap} onChange={setTuCap} />
                  </ConfigRow>
                  <PreviewBox>
                    <PreviewLine icon="→" text={`Monitor wallet on ${CHAINS.find(c => c.id === tuChain)?.name}`} />
                    <PreviewLine icon="→" text={`Trigger when balance < ${tuThreshold || "?"} USDC`} />
                    <PreviewLine icon="→" text={`Refill ${tuRefill || "?"} USDC · max ${tuCap || "?"} USDC/24h`} />
                    <PreviewLine icon="✓" text="Gasless · Circle Paymaster" success />
                  </PreviewBox>
                </>
              )}

              {/* ── AUTO SPLIT ───────────────────────────── */}
              {modal === "autosplit" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <ConfigRow label="Total amount to split">
                      <AmountInput value={splitTotal} onChange={setSplitTotal} />
                    </ConfigRow>
                    <ConfigRow label="Frequency">
                      <FreqPicker value={splitFreq} onChange={setSplitFreq} />
                    </ConfigRow>
                  </div>
                  <ConfigRow label={`Split rules — ${totalPct.toFixed(0)}% ${pctOk ? "✓" : "(must equal 100%)"}`}>
                    <SplitRuleList
                      rules={splitRules} totalAmount={parseFloat(splitTotal)}
                      onUpdate={updateSplit} onRemove={removeSplit} onAdd={addSplit}
                      minRules={2}
                    />
                  </ConfigRow>
                  {!pctOk && totalPct > 0 && <PctWarning current={totalPct} />}
                  {validSplit.length >= 2 && pctOk && (
                    <PreviewBox>
                      <PreviewLine icon="→" text={`${FREQ_OPTS.find(f => f.value === splitFreq)?.label} · split ${splitTotal} USDC`} />
                      {validSplit.map((r, i) => (
                        <PreviewLine key={i} icon="·" text={`${r.pct}% → ${r.address.slice(0,6)}...${r.address.slice(-4)} (${((parseFloat(splitTotal) * parseFloat(r.pct)) / 100).toFixed(2)} USDC)`} />
                      ))}
                      <PreviewLine icon="✓" text="Gasless · Circle Paymaster" success />
                    </PreviewBox>
                  )}
                </>
              )}

              {/* ── RECURRING PAYOUT ─────────────────────── */}
              {modal === "payout" && (
                <>
                  <ConfigRow label="Repeat every">
                    <FreqPicker value={payoutFreq} onChange={setPayoutFreq} row />
                  </ConfigRow>

                  <ConfigRow label="Recipients — each with their own first payment date">
                    <div className="space-y-3">
                      {payoutRules.map((r, i) => (
                        <div key={i} className="rounded-card border border-ink-border2 bg-ink-surface2 p-3 space-y-2.5">

                          {/* Row 1: name + address + amount */}
                          <div className="flex gap-2 items-center">
                            <input
                              type="text" value={r.name}
                              onChange={e => updatePayout(i, "name", e.target.value)}
                              placeholder="Name"
                              className="w-24 flex-shrink-0 rounded border border-ink-border bg-black px-2.5 py-2 font-mono text-xs text-white placeholder:text-muted focus:outline-none"
                            />
                            <input
                              type="text" value={r.address}
                              onChange={e => updatePayout(i, "address", e.target.value)}
                              placeholder="0x wallet address"
                              className="min-w-0 flex-1 rounded border border-ink-border bg-black px-2.5 py-2 font-mono text-xs text-white placeholder:text-muted focus:outline-none"
                            />
                            <div className="flex flex-shrink-0 items-center gap-1 rounded border border-ink-border bg-black px-2 py-2">
                              <input
                                type="number" value={r.amount}
                                onChange={e => updatePayout(i, "amount", e.target.value)}
                                placeholder="0"
                                className="w-14 bg-transparent font-mono text-xs text-cream-white focus:outline-none"
                              />
                              <span className="font-mono text-[10px] text-muted">USDC</span>
                            </div>
                            {payoutRules.length > 1 && (
                              <button onClick={() => removePayout(i)} className="flex-shrink-0 text-muted hover:text-red-primary transition-colors px-1">✕</button>
                            )}
                          </div>

                          {/* Row 2: first date + time */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] text-muted">First payment</span>
                            <input
                              type="date" value={r.firstDate}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={e => updatePayout(i, "firstDate", e.target.value)}
                              className="rounded border border-ink-border bg-black px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none"
                            />
                            <span className="font-mono text-[10px] text-muted">at</span>
                            <input
                              type="time" value={r.time}
                              onChange={e => updatePayout(i, "time", e.target.value)}
                              className="rounded border border-ink-border bg-black px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none"
                            />
                            {r.firstDate && (
                              <span className="font-mono text-[10px] text-muted">
                                → then repeats {payoutFreq === "monthly"
                                  ? `every month on day ${new Date(r.firstDate + "T12:00:00").getDate()}`
                                  : payoutFreq === "weekly"
                                  ? `every ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(r.firstDate + "T12:00:00").getDay()]}`
                                  : "every day"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addPayout}
                        className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-ink-border2 py-2 font-mono text-xs text-muted transition-colors hover:border-red-primary/40 hover:text-cream-white"
                      >
                        + Add recipient
                      </button>
                    </div>
                  </ConfigRow>

                  {validPayouts.length >= 1 && (
                    <PreviewBox>
                      <PreviewLine icon="→" text={`${FREQ_OPTS.find(f => f.value === payoutFreq)?.label} payout · ${totalPayout.toFixed(2)} USDC total`} />
                      {validPayouts.map((r, i) => {
                        const d = r.firstDate ? new Date(r.firstDate + "T12:00:00") : null;
                        const repeatStr = !d ? "" : payoutFreq === "monthly"
                          ? `every month on day ${d.getDate()}`
                          : payoutFreq === "weekly"
                          ? `every ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}`
                          : "every day";
                        const dateStr = d
                          ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "date not set";
                        return (
                          <PreviewLine key={i} icon="·"
                            text={`${parseFloat(r.amount).toFixed(2)} USDC → ${r.name || `${r.address.slice(0,6)}...${r.address.slice(-4)}`} · starts ${dateStr} at ${r.time}${repeatStr ? `, ${repeatStr}` : ""}`}
                          />
                        );
                      })}
                      <PreviewLine icon="✓" text="Gasless · Circle Paymaster" success />
                    </PreviewBox>
                  )}
                </>
              )}

              {/* ── AUTO DISTRIBUTE ──────────────────────── */}
              {modal === "distribute" && (
                <>
                  <ConfigRow label="Monitor chain">
                    <ChainPicker value={distChain} onChange={setDistChain} />
                  </ConfigRow>
                  <ConfigRow label="Trigger when balance exceeds">
                    <AmountInput value={distCap} onChange={setDistCap} />
                  </ConfigRow>
                  <ConfigRow label={`Distribute surplus by — ${distTotalPct.toFixed(0)}% ${distPctOk ? "✓" : "(must equal 100%)"}`}>
                    <SplitRuleList
                      rules={distRules} totalAmount={0}
                      onUpdate={updateDist} onRemove={removeDist} onAdd={addDist}
                      minRules={2} hidePctAmount
                    />
                  </ConfigRow>
                  {!distPctOk && distTotalPct > 0 && <PctWarning current={distTotalPct} />}
                  {validDist.length >= 2 && distPctOk && (
                    <PreviewBox>
                      <PreviewLine icon="→" text={`Monitor wallet on ${CHAINS.find(c => c.id === distChain)?.name}`} />
                      <PreviewLine icon="→" text={`Trigger when balance > ${distCap} USDC`} />
                      <PreviewLine icon="→" text={`Distribute surplus to ${validDist.length} wallets`} />
                      {validDist.map((r, i) => (
                        <PreviewLine key={i} icon="·" text={`${r.pct}% → ${r.address.slice(0,6)}...${r.address.slice(-4)}`} />
                      ))}
                      <PreviewLine icon="✓" text="Gasless · Circle Paymaster" success />
                    </PreviewBox>
                  )}
                </>
              )}

              {error && (
                <div className="rounded border border-red-primary/40 bg-red-bg p-3">
                  <p className="font-mono text-xs text-red-primary">{error}</p>
                </div>
              )}
              </>)}
            </div>

            {/* Footer — hidden on success screen */}
            {!deployedInfo && (
              <div className="border-t border-ink-border px-5 py-4">
                <button
                  onClick={handleDeploy}
                  disabled={deploying || !canDeploy()}
                  className="w-full rounded-lg bg-red-primary py-3 font-body text-sm font-medium text-white transition-colors hover:bg-red-dim disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deploying ? "Creating agent wallet..." : "Deploy Agent"}
                </button>
                <p className="mt-2.5 text-center font-mono text-[10px] text-muted">
                  1 EIP-712 signature · No gas required · Cancel anytime
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══ Feature Card ═══════════════════════════════════════════
function FeatureCard({ tag, icon, title, description, badges, onClick, isNew }: {
  tag: string; icon: React.ReactNode; title: string; description: string;
  badges: string[]; onClick: () => void; isNew?: boolean;
}) {
  return (
    <div className="group flex flex-col rounded-card2 border border-ink-border bg-ink-surface p-5 shadow-card transition-all hover:border-red-primary/40 hover:shadow-card-hover">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-red-primary">{"{ " + tag + " }"}</span>
          {isNew && (
            <span className="rounded bg-red-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">NEW</span>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-border2 bg-ink-surface2 transition-colors group-hover:border-red-primary/30">
          {icon}
        </div>
      </div>
      <h3 className="font-display text-xl text-cream-white">{title}</h3>
      <p className="mt-2 flex-1 font-body text-sm leading-relaxed text-muted">{description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {badges.map(b => (
          <span key={b} className="rounded-full border border-ink-border2 px-2.5 py-0.5 font-mono text-[10px] text-cream-dim">{b}</span>
        ))}
      </div>
      <button onClick={onClick} className="mt-4 w-full rounded-lg bg-red-primary py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-red-dim">
        Set up →
      </button>
    </div>
  );
}

// ══ Shared form components ═════════════════════════════════
function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[11px] text-muted">{label}</label>
      {children}
    </div>
  );
}

function AmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded border border-ink-border2 bg-ink-surface2 px-3 py-2">
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0"
        className="w-28 bg-transparent font-mono text-sm text-cream-white focus:outline-none" />
      <span className="font-mono text-xs text-muted">USDC</span>
    </div>
  );
}

function ChainPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHAINS.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)}
          className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
            value === c.id ? "border-red-primary bg-red-bg text-red-primary" : "border-ink-border2 text-muted hover:text-cream-white"
          }`}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
          {c.name}
        </button>
      ))}
    </div>
  );
}

function FreqPicker({ value, onChange, row }: { value: Freq; onChange: (v: Freq) => void; row?: boolean }) {
  return (
    <div className={`flex gap-1.5 ${row ? "flex-row" : "flex-col"}`}>
      {FREQ_OPTS.map(f => (
        <button key={f.value} onClick={() => onChange(f.value)}
          className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
            value === f.value ? "border-red-primary bg-red-bg text-red-primary" : "border-ink-border2 text-muted hover:text-cream-white"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function SplitRuleList({ rules, totalAmount, onUpdate, onRemove, onAdd, minRules, hidePctAmount }: {
  rules: { address: string; pct: string }[];
  totalAmount: number;
  onUpdate: (i: number, f: "address" | "pct", v: string) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  minRules: number;
  hidePctAmount?: boolean;
}) {
  return (
    <div className="space-y-2">
      {rules.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex w-20 flex-shrink-0 items-center gap-1 rounded border border-ink-border2 bg-ink-surface2 px-2.5 py-2">
            <input type="number" value={r.pct} onChange={e => onUpdate(i, "pct", e.target.value)}
              min="0" max="100"
              className="w-10 bg-transparent font-mono text-sm text-cream-white focus:outline-none" />
            <span className="font-mono text-xs text-muted">%</span>
          </div>
          <input type="text" value={r.address} onChange={e => onUpdate(i, "address", e.target.value)}
            placeholder="0x wallet address"
            className="min-w-0 flex-1 rounded border border-ink-border2 bg-black px-2.5 py-2 font-mono text-xs text-white placeholder:text-muted focus:outline-none" />
          {!hidePctAmount && (
            <span className="w-20 flex-shrink-0 text-right font-mono text-xs text-muted">
              {totalAmount > 0 && parseFloat(r.pct) > 0
                ? `${((totalAmount * parseFloat(r.pct)) / 100).toFixed(2)}`
                : "—"}
            </span>
          )}
          {rules.length > minRules && (
            <button onClick={() => onRemove(i)} className="text-muted hover:text-red-primary transition-colors">✕</button>
          )}
        </div>
      ))}
      <button onClick={onAdd}
        className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-ink-border2 py-2 font-mono text-xs text-muted transition-colors hover:border-red-primary/40 hover:text-cream-white">
        + Add wallet
      </button>
    </div>
  );
}

function PctWarning({ current }: { current: number }) {
  return (
    <div className="rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
      <p className="font-mono text-[11px] text-yellow-400">
        Percentages must add up to 100% (currently {current.toFixed(0)}%)
      </p>
    </div>
  );
}

function PreviewBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-ink-border bg-ink-DEFAULT p-3">
      <div className="mb-2 font-mono text-[10px] tracking-widest text-muted">{"// PREVIEW"}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PreviewLine({ icon, text, success }: { icon: string; text: string; success?: boolean }) {
  const isBullet = icon === "·";
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 font-mono text-xs ${success ? "text-success" : isBullet ? "text-muted" : "text-red-primary"}`}>{icon}</span>
      <span className={`font-mono text-xs ${success ? "text-success" : isBullet ? "text-muted" : "text-cream-dim"}`}>{text}</span>
    </div>
  );
}

// ── Agent Wallet Row (address + live USDC balance) ─────────
function AgentWalletRow({ address }: { address: string }) {
  const { balance, loading } = useArcUsdcBalance(address);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const balNum = parseFloat(balance);
  const needsFunding = balNum < 0.01;

  return (
    <div className={`mt-1.5 rounded border px-2 py-1.5 ${
      needsFunding
        ? "border-yellow-500/30 bg-yellow-500/5"
        : "border-success/30 bg-success/5"
    }`}>
      {/* Balance row */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-[9px] text-muted">AGENT WALLET BALANCE</span>
        <span className={`font-mono text-[11px] font-semibold ${needsFunding ? "text-yellow-400" : "text-success"}`}>
          {loading ? "…" : `${parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
        </span>
      </div>
      {/* Address row */}
      <div className="flex items-center gap-1.5">
        {needsFunding && <span className="font-mono text-[9px] text-yellow-400 flex-shrink-0">FUND →</span>}
        <span className="flex-1 truncate font-mono text-[10px] text-muted">
          {address}
        </span>
        <button
          onClick={copy}
          className="flex-shrink-0 font-mono text-[9px] text-muted hover:text-cream-white transition-colors"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      {needsFunding && (
        <p className="mt-1 font-mono text-[9px] text-yellow-400/70">
          Send USDC to this address before the agent runs
        </p>
      )}
    </div>
  );
}

// ── Mode Icons ─────────────────────────────────────────────
function ModeIcon({ mode, small }: { mode: AgentMode; small?: boolean }) {
  const s = small ? 16 : 20;
  if (mode === "topup") return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path d="M10 16V4M6 8l4-4 4 4" stroke="#C8102E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 16h12" stroke="#C8102E" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  if (mode === "autosplit") return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <circle cx="4"  cy="10" r="2" stroke="#C8102E" strokeWidth="1.5"/>
      <circle cx="16" cy="5"  r="2" stroke="#C8102E" strokeWidth="1.5"/>
      <circle cx="16" cy="15" r="2" stroke="#C8102E" strokeWidth="1.5"/>
      <path d="M6 10h3l3-5h2" stroke="#C8102E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 10h3l3 5h2" stroke="#C8102E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (mode === "payout") return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="#C8102E" strokeWidth="1.5"/>
      <path d="M3 8h14" stroke="#C8102E" strokeWidth="1.5"/>
      <path d="M7 2v3M13 2v3" stroke="#C8102E" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="13" r="2" stroke="#C8102E" strokeWidth="1.5"/>
    </svg>
  );
  // distribute
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="5"  r="2" stroke="#C8102E" strokeWidth="1.5"/>
      <circle cx="5"  cy="15" r="2" stroke="#C8102E" strokeWidth="1.5"/>
      <circle cx="15" cy="15" r="2" stroke="#C8102E" strokeWidth="1.5"/>
      <path d="M10 7v4M10 11l-3 2M10 11l3 2" stroke="#C8102E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#4A3E2A" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 17l10 5 10-5" stroke="#4A3E2A" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 12l10 5 10-5" stroke="#4A3E2A" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}
