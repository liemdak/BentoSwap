"use client";

import { useState, useEffect } from "react";

// ── Sidebar sections ──────────────────────────────────────
const SECTIONS = [
  { id: "overview",  num: "01", label: "Overview" },
  { id: "trade",     num: "02", label: "Trade & Multi-send" },
  { id: "memos",     num: "03", label: "Transaction Memos" },
  { id: "bridge",    num: "04", label: "Bridge & Balance" },
  { id: "wallets",   num: "05", label: "Agent Wallets" },
  { id: "topup",     num: "06", label: "Auto Top-Up" },
  { id: "split",     num: "07", label: "Split & Payout" },
  { id: "security",  num: "08", label: "Security" },
  { id: "reclaim",   num: "09", label: "Reclaim Funds" },
  { id: "faq",       num: "10", label: "FAQ" },
];

export default function GuidePage() {
  const [activeId, setActiveId] = useState("overview");

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
          <div className="mb-3 font-mono text-[11px] tracking-widest text-red-primary">{"{ BENTO GUIDE }"}</div>
          <h1 className="font-display text-5xl text-cream-white">Bento Guide</h1>
          <p className="mt-3 max-w-xl font-body text-base text-muted leading-relaxed">
            Everything Bento does on Arc Testnet: swap and multi-send with memos, bridge USDC across chains,
            pool a unified balance, and automate flows with agent wallets. Gas is paid in USDC and settles in
            about half a second.
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
                      ? "bg-[#C8A87A]/10 border border-[#C8A87A]/40 text-[#C8A87A]"
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

            {/* ── 01 · Overview ────────────────────────── */}
            <section id="overview" className="scroll-mt-24">
              <SectionHeader num="01" title="Overview" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Bento is a stablecoin app built on <strong className="text-cream-dim">Arc Testnet</strong> (Chain ID 5042002).
                  It runs entirely on Circle infrastructure, so there are no custom smart contracts to audit and no gas token
                  to manage. Gas is paid in USDC and blocks finalize in roughly 0.48 seconds.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard icon="🔄" title="Trade" body="Swap USDC, EURC, USYC, and cirBTC, then send to many wallets at once with an optional memo per recipient." />
                  <InfoCard icon="🏷️" title="Memos" body="Attach an invoice id or note to a transfer. It lands on-chain in the same transaction and Bento reads it back as text." />
                  <InfoCard icon="🌉" title="Bridge" body="Move USDC across 8 chains using CCTP v2, with the burn, attestation, and mint steps tracked live." />
                  <InfoCard icon="🤖" title="Agent" body="Automate top-ups, percentage splits, and recurring payouts with one signature and no gas." />
                </div>
                <Callout type="info" text="Everything here is testnet. Get free USDC from the Circle faucet, then experiment with small amounts." />
              </div>
            </section>

            {/* ── 02 · Trade & Multi-send ───────────────── */}
            <section id="trade" className="scroll-mt-24">
              <SectionHeader num="02" title="Trade & Multi-send" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  The Trade page has two modes. <strong className="text-cream-dim">Swap</strong> exchanges one stablecoin for
                  another on Arc, and <strong className="text-cream-dim">Multi-send</strong> pays many addresses in a single flow.
                </p>

                <div className="rounded-card border border-ink-border bg-ink-surface p-5 space-y-3">
                  <div className="font-mono text-[10px] tracking-widest text-muted">{"// SWAP"}</div>
                  {[
                    "Pick a pair across USDC, EURC, USYC, and cirBTC",
                    "Review the live rate, your slippage, and the minimum received",
                    "Confirm in your wallet. Circle App Kit routes the swap on Arc",
                  ].map((t, i) => <Step key={i} n={i + 1} text={t} />)}
                </div>

                <div className="rounded-card border border-ink-border bg-ink-surface p-5 space-y-3">
                  <div className="font-mono text-[10px] tracking-widest text-muted">{"// MULTI-SEND"}</div>
                  {[
                    "Add up to 20 recipients, each with an amount and token",
                    "Optionally add a memo per recipient (invoice id, note)",
                    "Bento sends them one by one and shows progress for each",
                  ].map((t, i) => <Step key={i} n={i + 1} text={t} />)}
                </div>

                <Callout type="info" text="Multi-send uses a kit.send() loop rather than a batch contract. Arc's sub-second finality keeps it fast even for many recipients." />
              </div>
            </section>

            {/* ── 03 · Transaction Memos ────────────────── */}
            <section id="memos" className="scroll-mt-24">
              <SectionHeader num="03" title="Transaction Memos" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  A memo attaches readable context to a transfer so you can reconcile it later. Arc&apos;s
                  <strong className="text-cream-dim"> Memo contract</strong> wraps the transfer, keeps your wallet as the
                  original sender, and records the note on-chain in the same transaction.
                </p>

                <div className="rounded-card border border-ink-border bg-ink-surface p-5 space-y-3">
                  <div className="font-mono text-[10px] tracking-widest text-muted">{"// HOW IT WORKS"}</div>
                  {[
                    "You send USDC or EURC and type a memo (e.g. invoice-2026-0001)",
                    "The Memo contract forwards the transfer and emits a Memo event",
                    "Your wallet stays the sender via the CallFrom precompile",
                    "Bento reads the event back and decodes it into plain text",
                    "Open a receipt by tx hash, or paste a full ArcScan link",
                  ].map((t, i) => <Step key={i} n={i + 1} text={t} />)}
                </div>

                <Callout type="warning" text="Memos are public and permanent on-chain. Anyone can read them. Never put private or sensitive data in a memo. Treat it like a public payment reference." />
                <Callout type="tip" text="Explorers show the memo only as raw hex. Bento decodes it into readable text, so share a Bento receipt link when you want people to actually read the note." />
              </div>
            </section>

            {/* ── 04 · Bridge & Balance ─────────────────── */}
            <section id="bridge" className="scroll-mt-24">
              <SectionHeader num="04" title="Bridge & Balance" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Bridge moves real USDC between chains, while Unified Balance pools your USDC into a single number
                  you can spend from anywhere.
                </p>

                <div className="rounded-card border border-ink-border bg-ink-surface p-5">
                  <div className="font-mono text-[10px] tracking-widest text-muted mb-4">{"// BRIDGE (CCTP v2)"}</div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
                    <FlowBox label="Burn" sub="On source chain" color="red" />
                    <FlowArrow label="attest" />
                    <FlowBox label="Attestation" sub="Circle signs it" color="blue" />
                    <FlowArrow label="mint" />
                    <FlowBox label="Mint" sub="On Arc" color="green" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard icon="🌉" title="8 chains supported" body="Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, Unichain, and Pharos, paired with Arc Testnet." />
                  <InfoCard icon="🏦" title="Unified Balance" body="Deposit USDC into Circle Gateway, aggregate it across chains, spend from any chain, and withdraw back anytime." />
                </div>

                <Callout type="info" text="A bridge usually finishes in about 20 seconds. Bento polls the attestation and shows each step so you are never left guessing." />
              </div>
            </section>

            {/* ── 05 · Wallet Architecture ─────────────── */}
            <section id="wallets" className="scroll-mt-24">
              <SectionHeader num="05" title="Agent Wallets" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Each agent task uses a separate <strong className="text-cream-dim">Developer Controlled Wallet (DCW)</strong> managed
                  by Circle, kept completely isolated from your MetaMask wallet.
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
                  <InfoCard icon="🔑" title="Your wallet stays safe" body="The agent has no access to MetaMask. It only receives funds from you and never pulls them back." />
                  <InfoCard icon="🏦" title="1 task = 1 unique wallet" body="Deploy Auto Top-Up and Multi-send and you get two completely different 0x addresses." />
                  <InfoCard icon="🔄" title="Tasks survive device switch" body="Tasks are synced to Firebase by your MetaMask address, so reconnect from any device." />
                </div>
              </div>
            </section>

            {/* ── 06 · Auto Top-Up ─────────────────────── */}
            <section id="topup" className="scroll-mt-24">
              <SectionHeader num="06" title="Auto Top-Up" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Automatically refill your MetaMask wallet when its balance drops below the threshold you set.
                  Fund the agent wallet once and let it run.
                </p>

                <div className="rounded-card border border-ink-border bg-ink-surface p-5 space-y-3">
                  <div className="font-mono text-[10px] tracking-widest text-muted">{"// HOW IT WORKS"}</div>
                  {[
                    "Set a threshold (e.g. trigger when MetaMask balance is under $10)",
                    "Deploy the agent and a new Agent Wallet (0xABC...) is created",
                    "Fund the Agent Wallet with your desired reserve amount",
                    "Bento polls your MetaMask balance every 20 seconds or so",
                    "When the balance is under $10, the agent sends $50 to MetaMask",
                    "A safety cap limits the total sent per 24h to stop runaway spending",
                  ].map((t, i) => <Step key={i} n={i + 1} text={t} />)}
                </div>

                <Callout type="tip" text="Fund enough to cover multiple refills. Example: a $50 refill times 5 cycles means funding $250 into the agent wallet." />
              </div>
            </section>

            {/* ── 07 · Split & Payout ──────────────────── */}
            <section id="split" className="scroll-mt-24">
              <SectionHeader num="07" title="Split & Payout" />
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ModeCard
                    tag="AUTO SPLIT"
                    title="Split by percentage"
                    steps={["Set total amount (e.g. $1,000)", "Assign %: Wallet A 60%, Wallet B 40%", "Choose schedule: Daily, Weekly, Monthly", "Agent splits automatically on schedule"]}
                  />
                  <ModeCard
                    tag="RECURRING PAYOUT"
                    title="Recurring payroll"
                    steps={["Add recipient list with names", "Set fixed USDC amount per person", "Choose start date and time", "Agent sends on the exact date and time"]}
                  />
                  <ModeCard
                    tag="AUTO DISTRIBUTE"
                    title="Distribute surplus"
                    steps={["Set an upper cap (e.g. over $5,000)", "When exceeded, distribute the surplus", "Allocate by % to each wallet", "Fully automatic, no manual action"]}
                  />
                </div>
                <Callout type="info" text="All 3 modes are gasless. Circle Paymaster covers gas fees, so you only need USDC inside the Agent Wallet." />
              </div>
            </section>

            {/* ── 08 · Security ────────────────────────── */}
            <section id="security" className="scroll-mt-24">
              <SectionHeader num="08" title="Security" />
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SecurityCard
                    icon="✍️"
                    title="Wallet Signature"
                    body="Reclaiming funds requires a personal_sign (EIP-191) from your MetaMask. The server verifies the signature cryptographically, so only the holder of your private key can authorize a withdrawal."
                  />
                  <SecurityCard
                    icon="🛡️"
                    title="Safety Cap"
                    body="Limits the total USDC the agent can send per 24h. If the agent misbehaves or is compromised, losses are bounded by this cap."
                  />
                  <SecurityCard
                    icon="📋"
                    title="Address whitelist"
                    body="The agent can only send to addresses configured at deploy time. No funds can go to arbitrary addresses outside the list."
                  />
                  <SecurityCard
                    icon="⏸️"
                    title="Pause / Cancel anytime"
                    body="Stop or cancel tasks at any time. When canceling, the Reclaim Funds popup lets you withdraw remaining USDC back to MetaMask immediately."
                  />
                </div>

                <Callout
                  type="warning"
                  text="Agent Wallets are Circle Developer Controlled Wallets, so technically the developer has access. Use testnet only and keep amounts small."
                />
              </div>
            </section>

            {/* ── 09 · Reclaim Funds ───────────────────── */}
            <section id="reclaim" className="scroll-mt-24">
              <SectionHeader num="09" title="Reclaim Funds" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  When you cancel a task, any USDC remaining in the Agent Wallet is sent back to your MetaMask automatically.
                </p>

                <div className="rounded-card border border-success/30 bg-success/5 p-5 space-y-3">
                  <div className="font-mono text-[10px] tracking-widest text-success">HOW TO RECLAIM</div>
                  {[
                    "Click Cancel on any active task in the Agent panel",
                    "A popup shows the remaining USDC balance in the Agent Wallet",
                    'Click "Reclaim & Cancel" and MetaMask asks you to sign a message',
                    "The server verifies your signature and transfers all USDC back to your wallet",
                    "No token, no secret file, just your MetaMask signature",
                  ].map((s, i) => (
                    <Step key={i} n={i + 1} text={s} tone="success" />
                  ))}
                </div>

                <Callout type="info" text="Tasks are synced to Firebase by your MetaMask address. Clearing cache or switching devices will not lose your tasks, just reconnect the same wallet." />
                <Callout type="warning" text="If you lose access to your MetaMask wallet (lost private key or seed phrase), funds in the Agent Wallet cannot be recovered. Always keep your seed phrase safe." />
              </div>
            </section>

            {/* ── 10 · FAQ ─────────────────────────────── */}
            <section id="faq" className="scroll-mt-24">
              <SectionHeader num="10" title="FAQ" />
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

// ══ FAQ Data ═══════════════════════════════════════════════
const FAQ_ITEMS = [
  {
    q: "Can people read my memos?",
    a: "Yes. Memos are public, permanent on-chain data that anyone can read. Bento simply decodes the raw bytes into text. Never put private information in a memo. Treat it like a bank-transfer reference everyone can see.",
  },
  {
    q: "Why does the memo not show on ArcScan?",
    a: "The memo is stored as bytes in an event log, and explorers display bytes as raw hex, not text. That is a display limitation, not a security feature. Open the Bento receipt for that transaction to read the memo in plain text.",
  },
  {
    q: "Is my MetaMask wallet at risk when using the Agent?",
    a: "No. The Agent Wallet is completely separate. The agent only receives USDC from you and sends to pre-configured addresses, and it never has access to your MetaMask private key.",
  },
  {
    q: "If I clear my browser cache or switch devices, will I lose my tasks?",
    a: "No. Tasks are synced to Firebase by your MetaMask address. Just reconnect the same wallet on any device and all tasks reload automatically.",
  },
  {
    q: "Can other users see my tasks?",
    a: "No. Each user only sees tasks created from their own MetaMask address. Firestore stores data by wallet address, so no one else can read your data.",
  },
  {
    q: "What is a DCW (Developer Controlled Wallet)?",
    a: "A Circle-managed EVM wallet created under the developer's Circle account. Unlike MetaMask (user-controlled), a DCW does not need a private key from you. The developer programs it to execute transactions within a predefined policy.",
  },
  {
    q: "Are there any fees?",
    a: "No fees. All transactions are gasless thanks to Circle Paymaster. You only need USDC in the Agent Wallet for the actual transaction value.",
  },
  {
    q: "Does the agent run when my computer is off?",
    a: "No, this is a testnet demo. The agent runner executes inside your browser tab. If you close the tab, execution pauses. Your task config and history are saved to Firebase, so everything resumes the next time you open the app. This limitation will be replaced by a server-side scheduler in the mainnet version.",
  },
];

// ══ FAQ accordion ══════════════════════════════════════════
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`hover-glow rounded-card border transition-colors ${open ? "border-[#C8A87A]/30 bg-[#C8A87A]/5" : "border-ink-border bg-ink-surface"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-mono text-sm text-cream-dim pr-4">{q}</span>
        <span className={`flex-shrink-0 font-mono text-lg transition-transform ${open ? "rotate-45 text-[#C8A87A]" : "text-muted"}`}>+</span>
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

function Step({ n, text, tone }: { n: number; text: string; tone?: "success" }) {
  const badge = tone === "success"
    ? "bg-success/20 text-success"
    : "bg-red-primary text-white";
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${badge}`}>{n}</span>
      <span className="font-mono text-xs text-cream-dim leading-relaxed">{text}</span>
    </div>
  );
}

function FlowBox({ label, sub, color }: { label: string; sub: string; color: "blue"|"red"|"green" }) {
  const borderColor = { blue: "border-blue-500/40", red: "border-[#C8A87A]/50", green: "border-success/40" }[color];
  const textColor   = { blue: "text-blue-400",      red: "text-[#C8A87A]",      green: "text-success"     }[color];
  return (
    <div className={`hover-glow flex flex-1 flex-col items-center justify-center rounded-card border ${borderColor} bg-ink-surface2 px-4 py-3 text-center`}>
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
    <div className="hover-glow rounded-card border border-ink-border bg-ink-surface p-4 space-y-1.5">
      <div className="text-xl">{icon}</div>
      <p className="font-mono text-xs font-semibold text-cream-dim">{title}</p>
      <p className="font-body text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function ModeCard({ tag, title, steps }: { tag: string; title: string; steps: string[] }) {
  return (
    <div className="hover-glow rounded-card border border-ink-border bg-ink-surface p-4 space-y-3">
      <div className="font-mono text-[10px] tracking-widest text-[#C8A87A]">{"{ " + tag + " }"}</div>
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
    <div className="hover-glow rounded-card border border-ink-border bg-ink-surface p-4 space-y-2">
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
