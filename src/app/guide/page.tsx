"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/context/WalletContext";
import { useArcUsdcBalance } from "@/hooks/useTokenBalance";
import type { StoredTask } from "@/lib/agentTasks";

// ── Sidebar sections ──────────────────────────────────────
const SECTIONS = [
  { id: "wallets",   num: "01", label: "Wallet Architecture" },
  { id: "topup",     num: "02", label: "Auto Top-Up" },
  { id: "split",     num: "03", label: "Split & Payout" },
  { id: "security",  num: "04", label: "Security" },
  { id: "reclaim",   num: "05", label: "Reclaim Funds" },
  { id: "faq",       num: "06", label: "FAQ" },
];

export default function GuidePage() {
  const [activeId, setActiveId] = useState("wallets");

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #1a1510 0%, #16120E 60%)" }}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">

        {/* ── Hero ─────────────────────────────────────── */}
        <div className="mb-12">
          <div className="mb-3 font-mono text-[11px] tracking-widest text-red-primary">{"{ AGENT GUIDE }"}</div>
          <h1 className="font-display text-5xl text-cream-white">Agent Guide</h1>
          <p className="mt-3 max-w-xl font-body text-base text-muted leading-relaxed">
            Understand how Agent Wallets work before deploying. Covers fund recovery, security model, and step-by-step walkthroughs.
          </p>
        </div>

        {/* ── Layout: sidebar + content ─────────────────── */}
        <div className="flex gap-10">

          {/* Sticky sidebar */}
          <aside className="hidden w-48 flex-shrink-0 lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="mb-3 font-mono text-[10px] tracking-widest text-muted">{"// CONTENTS"}</p>
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                    activeId === s.id
                      ? "bg-red-bg border border-red-primary/30 text-red-primary"
                      : "text-muted hover:text-cream-white"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-60">{s.num}</span>
                  <span className="font-mono text-[11px]">{s.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1 space-y-16">

            {/* ── 01 — Wallet Architecture ─────────────── */}
            <section id="wallets" className="scroll-mt-24">
              <SectionHeader num="01" title="Wallet Architecture" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Each agent task uses a separate <strong className="text-cream-dim">Developer Controlled Wallet (DCW)</strong> managed by Circle — completely isolated from your MetaMask wallet.
                </p>

                {/* Flow diagram */}
                <div className="rounded-card border border-ink-border bg-ink-surface p-5">
                  <div className="font-mono text-[10px] tracking-widest text-muted mb-4">{"// ARCHITECTURE"}</div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
                    <FlowBox label="MetaMask Wallet" sub="Your wallet" color="blue" />
                    <FlowArrow label="fund" />
                    <FlowBox label="Agent Wallet" sub="Circle DCW" color="red" />
                    <FlowArrow label="execute" />
                    <FlowBox label="Target Wallets" sub="Configured addresses" color="green" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoCard icon="🔑" title="Your wallet stays safe" body="The agent has NO access to MetaMask. It only receives funds from you and never pulls back." />
                  <InfoCard icon="🏦" title="1 task = 1 unique wallet" body="Deploy Auto Top-Up and Multi-send → 2 completely different 0x... addresses." />
                  <InfoCard icon="🔄" title="Tasks survive device switch" body="Tasks are synced to Firebase by your MetaMask address — reconnect from any device." />
                </div>
              </div>
            </section>

            {/* ── 02 — Auto Top-Up ─────────────────────── */}
            <section id="topup" className="scroll-mt-24">
              <SectionHeader num="02" title="Auto Top-Up" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Automatically refill your MetaMask wallet when balance drops below the threshold you set. Fund the agent wallet once and let it run.
                </p>

                <div className="rounded-card border border-ink-border bg-ink-surface p-5 space-y-3">
                  <div className="font-mono text-[10px] tracking-widest text-muted">{"// HOW IT WORKS"}</div>
                  {[
                    { n: 1, text: "Set a threshold — e.g. trigger when MetaMask balance < $10" },
                    { n: 2, text: "Deploy the agent → a new Agent Wallet (0xABC...) is created" },
                    { n: 3, text: "Fund the Agent Wallet with your desired reserve amount" },
                    { n: 4, text: "Bento server polls your MetaMask balance every ~20 seconds" },
                    { n: 5, text: "When balance < $10 → Agent Wallet automatically sends $50 to MetaMask" },
                    { n: 6, text: "Safety cap limits the total sent per 24h to prevent runaway spending" },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-primary font-mono text-[10px] font-bold text-white">{s.n}</span>
                      <span className="font-mono text-xs text-cream-dim leading-relaxed">{s.text}</span>
                    </div>
                  ))}
                </div>

                <Callout type="tip" text="Fund enough to cover multiple refills. Example: $50 refill amount × 5 cycles = fund $250 into the agent wallet." />
              </div>
            </section>

            {/* ── 03 — Split & Payout ──────────────────── */}
            <section id="split" className="scroll-mt-24">
              <SectionHeader num="03" title="Split & Payout" />
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ModeCard
                    tag="AUTO SPLIT"
                    title="Split by percentage"
                    steps={["Set total amount (e.g. $1,000)", "Assign %: Wallet A 60%, Wallet B 40%", "Choose schedule: Daily / Weekly / Monthly", "Agent splits automatically on schedule"]}
                  />
                  <ModeCard
                    tag="RECURRING PAYOUT"
                    title="Recurring payroll"
                    steps={["Add recipient list with names", "Set fixed USDC amount per person", "Choose start date and time", "Agent sends on the exact date and time"]}
                  />
                  <ModeCard
                    tag="AUTO DISTRIBUTE"
                    title="Distribute surplus"
                    steps={["Set an upper cap (e.g. > $5,000)", "When exceeded → distribute surplus", "Allocate by % to each wallet", "Fully automatic, no manual action"]}
                  />
                </div>
                <Callout type="info" text="All 3 modes are gasless — Circle Paymaster covers gas fees. You only need USDC inside the Agent Wallet." />
              </div>
            </section>

            {/* ── 04 — Security ────────────────────────── */}
            <section id="security" className="scroll-mt-24">
              <SectionHeader num="04" title="Security" />
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SecurityCard
                    icon="🔐"
                    title="HMAC Token"
                    body="Each task has its own security token. The server only executes commands when the token matches — even the developer cannot run your task without it."
                  />
                  <SecurityCard
                    icon="🛡️"
                    title="Safety Cap"
                    body="Limits total USDC the agent can send per 24h. If the agent misbehaves or is compromised, losses are bounded by this cap."
                  />
                  <SecurityCard
                    icon="📋"
                    title="Address whitelist"
                    body="Agent can only send to addresses configured at deploy time. No funds can be sent to arbitrary addresses outside the list."
                  />
                  <SecurityCard
                    icon="⏸️"
                    title="Pause / Cancel anytime"
                    body="Stop or cancel tasks at any time. When canceling, the Reclaim Funds popup lets you withdraw remaining USDC back to MetaMask immediately."
                  />
                </div>

                <Callout
                  type="warning"
                  text="Agent Wallets are Circle Developer Controlled Wallets — technically the developer has access. Use testnet only and keep amounts small."
                />
              </div>
            </section>

            {/* ── 05 — Reclaim Funds ───────────────────── */}
            <section id="reclaim" className="scroll-mt-24">
              <SectionHeader num="05" title="Reclaim Funds" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  When you cancel a task, any USDC remaining in the Agent Wallet needs to be withdrawn back to your MetaMask. There are 2 ways:
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-card border border-success/30 bg-success/5 p-4 space-y-2">
                    <div className="font-mono text-[10px] tracking-widest text-success">METHOD 1 — AUTOMATIC</div>
                    <p className="font-mono text-xs text-cream-dim leading-relaxed">
                      Click <strong>Cancel</strong> in the task list → balance popup appears → click <strong>Reclaim & Cancel</strong> → funds sent back immediately.
                    </p>
                    <div className="flex items-center gap-2 rounded border border-success/20 bg-success/10 px-3 py-2">
                      <span className="font-mono text-[9px] text-success">✓ Recommended</span>
                    </div>
                  </div>
                  <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4 space-y-2">
                    <div className="font-mono text-[10px] tracking-widest text-cream-dim">METHOD 2 — MANUAL RECOVERY</div>
                    <p className="font-mono text-xs text-muted leading-relaxed">
                      If tasks are lost (cleared cache, switched device), use the <strong className="text-cream-dim">backup.json</strong> file downloaded at deploy time to recover funds below.
                    </p>
                  </div>
                </div>

                {/* Manual Withdraw Widget */}
                <ManualWithdrawWidget />
              </div>
            </section>

            {/* ── 06 — FAQ ─────────────────────────────── */}
            <section id="faq" className="scroll-mt-24">
              <SectionHeader num="06" title="FAQ" />
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <FaqItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}

// ══ Manual Withdraw Widget ══════════════════════════════════
function ManualWithdrawWidget() {
  const { address: userAddress, isConnected } = useWallet();
  const [file,       setFile]       = useState<File | null>(null);
  const [tasks,      setTasks]      = useState<StoredTask[]>([]);
  const [parseErr,   setParseErr]   = useState("");
  const [selected,   setSelected]   = useState<StoredTask | null>(null);
  const [state,      setState]      = useState<"idle"|"loading"|"done"|"error">("idle");
  const [txUrl,      setTxUrl]      = useState("");
  const [reclaimErr, setReclaimErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f); setParseErr(""); setTasks([]); setSelected(null);
    try {
      const text = await f.text();
      const json = JSON.parse(text) as { tasks?: StoredTask[] };
      if (!Array.isArray(json.tasks) || json.tasks.length === 0) {
        throw new Error("No tasks found in this file");
      }
      setTasks(json.tasks);
      if (json.tasks.length === 1) setSelected(json.tasks[0]);
    } catch (e: unknown) {
      setParseErr((e as Error).message ?? "Invalid backup file");
    }
  };

  const handleReclaim = async () => {
    if (!selected || !userAddress) return;
    setState("loading"); setReclaimErr("");
    try {
      const res  = await fetch("/api/agent/reclaim", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          walletId:         selected.id,
          token:            selected.token,
          walletAddress:    selected.walletAddress,
          recipientAddress: userAddress,
        }),
      });
      const data = await res.json() as { explorerUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Reclaim failed");
      setTxUrl(data.explorerUrl ?? "");
      setState("done");
    } catch (e: unknown) {
      setReclaimErr((e as Error).message ?? "Reclaim failed");
      setState("error");
    }
  };

  return (
    <div className="rounded-card2 border border-ink-border bg-ink-surface">
      <div className="border-b border-ink-border px-5 py-3.5">
        <span className="font-mono text-[11px] tracking-widest text-muted">{"// MANUAL WITHDRAW"}</span>
      </div>
      <div className="p-5 space-y-4">
        {state === "done" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success/40 bg-success/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#2D9B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="font-mono text-sm text-success">Funds sent to your wallet!</p>
            {txUrl && (
              <a href={txUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] text-success/70 hover:text-success">
                View on ArcScan
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </a>
            )}
            <button
              onClick={() => { setState("idle"); setFile(null); setTasks([]); setSelected(null); }}
              className="font-mono text-[10px] text-muted hover:text-cream-white"
            >
              Withdraw another task →
            </button>
          </div>
        ) : (
          <>
            <p className="font-mono text-xs text-muted">
              Upload the <span className="text-cream-dim">backup.json</span> file you downloaded at deploy time to withdraw funds to your connected MetaMask wallet.
            </p>

            {/* File drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-ink-border2 py-8 transition-colors hover:border-red-primary/40"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#6B5D4F" strokeWidth="1.5"/>
                <path d="M14 2v6h6M12 12v6M9 15l3-3 3 3" stroke="#6B5D4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {file ? (
                <span className="font-mono text-xs text-cream-dim">{file.name}</span>
              ) : (
                <>
                  <span className="font-mono text-xs text-cream-dim">Click or drag & drop backup.json</span>
                  <span className="font-mono text-[10px] text-muted">JSON files only</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {parseErr && (
              <div className="rounded border border-red-primary/40 bg-red-bg px-3 py-2">
                <p className="font-mono text-xs text-red-primary">{parseErr}</p>
              </div>
            )}

            {/* Task selector */}
            {tasks.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-muted">Select the task to withdraw from:</p>
                {tasks.map(t => (
                  <button key={t.id} onClick={() => setSelected(t)}
                    className={`flex w-full items-center justify-between rounded-card border px-4 py-3 transition-colors ${
                      selected?.id === t.id
                        ? "border-red-primary/50 bg-red-bg"
                        : "border-ink-border2 bg-ink-surface2 hover:border-ink-border"
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-mono text-xs text-cream-white">{t.label}</p>
                      <p className="font-mono text-[10px] text-muted truncate max-w-xs">{t.walletAddress}</p>
                    </div>
                    {selected?.id === t.id && (
                      <span className="font-mono text-[10px] text-red-primary">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Balance + Reclaim */}
            {selected && (
              <AgentBalanceRow
                walletAddress={selected.walletAddress}
                isConnected={isConnected}
                userAddress={userAddress ?? ""}
                onReclaim={handleReclaim}
                state={state}
                err={reclaimErr}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AgentBalanceRow({ walletAddress, isConnected, userAddress, onReclaim, state, err }: {
  walletAddress: string;
  isConnected:   boolean;
  userAddress:   string;
  onReclaim:     () => void;
  state:         "idle"|"loading"|"done"|"error";
  err:           string;
}) {
  const { balance, loading } = useArcUsdcBalance(walletAddress);
  const balNum     = parseFloat(balance);
  const hasBalance = !loading && balNum >= 0.01;

  return (
    <div className="space-y-3">
      <div className={`rounded-card border p-4 ${hasBalance ? "border-yellow-500/30 bg-yellow-500/5" : "border-ink-border2 bg-ink-surface2"}`}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted">Agent Wallet Balance</span>
          <span className={`font-mono text-sm font-semibold ${hasBalance ? "text-yellow-400" : "text-muted"}`}>
            {loading ? "..." : `${balNum.toFixed(2)} USDC`}
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted truncate">{walletAddress}</p>
      </div>

      {err && <p className="font-mono text-[10px] text-red-primary">{err}</p>}

      {!isConnected ? (
        <div className="rounded border border-ink-border2 px-4 py-3 text-center">
          <p className="font-mono text-xs text-muted">Connect wallet to receive funds</p>
        </div>
      ) : hasBalance ? (
        <button
          onClick={onReclaim}
          disabled={state === "loading"}
          className="w-full rounded-lg border border-yellow-500/50 bg-yellow-500/15 py-3 font-body text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "loading"
            ? "Withdrawing…"
            : `↩ Withdraw ${balNum.toFixed(2)} USDC → ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`}
        </button>
      ) : (
        <div className="rounded border border-ink-border2 px-4 py-3 text-center">
          <p className="font-mono text-xs text-muted">
            {loading ? "Checking balance…" : "No USDC remaining in this agent wallet."}
          </p>
        </div>
      )}
    </div>
  );
}

// ══ FAQ Data ═══════════════════════════════════════════════
const FAQ_ITEMS = [
  {
    q: "Is my MetaMask wallet at risk?",
    a: "No. The Agent Wallet is completely separate. The agent only receives USDC from you and sends to pre-configured addresses — it never has access to your MetaMask private key.",
  },
  {
    q: "If I clear my browser cache or switch devices, will I lose my tasks?",
    a: "No — tasks are now synced to Firebase by your MetaMask address. Simply reconnect the same wallet on any device and all tasks will appear.",
  },
  {
    q: "What if I lose both my tasks AND my backup.json?",
    a: "This is the worst case. USDC is still in the Agent Wallet but you no longer have the token to withdraw it. Contact support with your MetaMask address so we can look up the wallet history. This is why saving backup.json and enabling Firebase sync both matter.",
  },
  {
    q: "Can other users see my tasks?",
    a: "No. Each user only sees tasks created from their own MetaMask address. Firestore stores data by wallet_address — no one else can read your data.",
  },
  {
    q: "What is a DCW (Developer Controlled Wallet)?",
    a: "A Circle-managed EVM wallet created under the developer's Circle account. Unlike MetaMask (user-controlled), a DCW doesn't need a private key from you. The developer programs it to execute transactions within a predefined policy.",
  },
  {
    q: "After a task is completed or canceled, where do leftover funds go?",
    a: "USDC stays in the Agent Wallet until you actively withdraw it. When you cancel, the Reclaim Funds popup appears automatically. If you skip it, you can use the Manual Withdraw widget on this page at any time.",
  },
  {
    q: "Are there any fees?",
    a: "No fees. All transactions are gasless thanks to Circle Paymaster. You only need USDC in the Agent Wallet for the actual transaction value.",
  },
  {
    q: "Does the agent run when my computer is off?",
    a: "Yes. The agent runner runs on Bento's server, not your machine. As long as the task is Active and the Agent Wallet has funds, it executes on schedule.",
  },
];

// ══ FAQ accordion ══════════════════════════════════════════
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-card border transition-colors ${open ? "border-red-primary/30 bg-red-bg" : "border-ink-border bg-ink-surface"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-mono text-sm text-cream-dim pr-4">{q}</span>
        <span className={`flex-shrink-0 font-mono text-lg transition-transform ${open ? "rotate-45 text-red-primary" : "text-muted"}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="font-body text-sm leading-relaxed text-muted">{a}</p>
        </div>
      )}
    </div>
  );
}

// ══ Helper Components ═══════════════════════════════════════
function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-primary font-mono text-[11px] font-bold text-white">
        {num}
      </span>
      <h2 className="font-display text-2xl text-cream-white">{title}</h2>
    </div>
  );
}

function FlowBox({ label, sub, color }: { label: string; sub: string; color: "blue"|"red"|"green" }) {
  const borderColor = { blue: "border-blue-500/40", red: "border-red-primary/40", green: "border-success/40" }[color];
  const textColor   = { blue: "text-blue-400",      red: "text-red-primary",      green: "text-success"     }[color];
  return (
    <div className={`flex flex-1 flex-col items-center justify-center rounded-card border ${borderColor} bg-ink-surface2 px-4 py-3 text-center`}>
      <span className={`font-mono text-xs font-semibold ${textColor}`}>{label}</span>
      <span className="mt-0.5 font-mono text-[10px] text-muted">{sub}</span>
    </div>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center px-2 sm:px-3">
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[9px] text-muted">{label}</span>
        <span className="text-red-primary">→</span>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-card border border-ink-border bg-ink-surface p-4 space-y-1.5">
      <div className="text-xl">{icon}</div>
      <p className="font-mono text-xs font-semibold text-cream-dim">{title}</p>
      <p className="font-body text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function ModeCard({ tag, title, steps }: { tag: string; title: string; steps: string[] }) {
  return (
    <div className="rounded-card border border-ink-border bg-ink-surface p-4 space-y-3">
      <div className="font-mono text-[10px] tracking-widest text-red-primary">{"{ " + tag + " }"}</div>
      <p className="font-mono text-sm font-semibold text-cream-white">{title}</p>
      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-0.5 font-mono text-[10px] text-red-primary flex-shrink-0">{i + 1}.</span>
            <span className="font-mono text-[11px] text-muted leading-relaxed">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-card border border-ink-border bg-ink-surface p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="font-mono text-xs font-semibold text-cream-dim">{title}</span>
      </div>
      <p className="font-body text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Callout({ type, text }: { type: "tip"|"warning"|"info"; text: string }) {
  const styles = {
    tip:     { border: "border-success/30",    bg: "bg-success/5",    icon: "✓", color: "text-success"     },
    warning: { border: "border-yellow-500/30", bg: "bg-yellow-500/5", icon: "⚠", color: "text-yellow-400"  },
    info:    { border: "border-blue-500/30",   bg: "bg-blue-500/5",   icon: "ℹ", color: "text-blue-400"    },
  }[type];
  return (
    <div className={`flex items-start gap-3 rounded-card border ${styles.border} ${styles.bg} px-4 py-3`}>
      <span className={`mt-0.5 flex-shrink-0 font-mono text-sm ${styles.color}`}>{styles.icon}</span>
      <p className="font-body text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
