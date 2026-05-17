"use client";

import { useState } from "react";

// ── Supported chains ───────────────────────────────────────
const CHAINS = [
  { id: "arc",      name: "Arc Testnet",       short: "Arc",    color: "#C8102E" },
  { id: "eth",      name: "Ethereum Sepolia",   short: "ETH",    color: "#627EEA" },
  { id: "base",     name: "Base Sepolia",       short: "Base",   color: "#0052FF" },
  { id: "arb",      name: "Arbitrum Sepolia",   short: "ARB",    color: "#12AAFF" },
  { id: "op",       name: "Optimism Sepolia",   short: "OP",     color: "#FF0420" },
  { id: "poly",     name: "Polygon Amoy",       short: "MATIC",  color: "#8247E5" },
  { id: "avax",     name: "Avalanche Fuji",     short: "AVAX",   color: "#E84142" },
  { id: "uni",      name: "Unichain Sepolia",   short: "UNI",    color: "#FF007A" },
] as const;
type ChainId = (typeof CHAINS)[number]["id"];

// Bridge step definitions
type StepStatus = "pending" | "active" | "done" | "idle";
interface BridgeStep {
  key: string;
  label: string;
  desc: string;
  duration: number; // ms
}
const STEPS: BridgeStep[] = [
  { key: "burn",        label: "Burn",        desc: "USDC burned on source chain",    duration: 4000 },
  { key: "attest",      label: "Attestation", desc: "Circle validators sign proof",   duration: 12000 },
  { key: "mint",        label: "Mint",        desc: "USDC minted on destination",     duration: 4000 },
];

// Mock stats
const BRIDGE_STATS = [
  { label: "Total bridged", value: "$1.24M" },
  { label: "Transactions",  value: "3,847" },
  { label: "Avg time",      value: "~20s" },
  { label: "Fee saved",     value: "$0" },
];

// ──────────────────────────────────────────────────────────
export default function BridgeCard() {
  const [fromChain, setFromChain] = useState<ChainId>("eth");
  const [toChain,   setToChain]   = useState<ChainId>("arc");
  const [amount,    setAmount]    = useState("");
  const [fromOpen,  setFromOpen]  = useState(false);
  const [toOpen,    setToOpen]    = useState(false);

  // Bridge state
  type BridgeState = "idle" | "running" | "done" | "error";
  const [bridgeState, setBridgeState] = useState<BridgeState>("idle");
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(["idle","idle","idle"]);
  const [txHash, setTxHash] = useState("");

  const canBridge = fromChain !== toChain && amount && parseFloat(amount) > 0;

  const flipChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
  };

  const getChain = (id: ChainId) => CHAINS.find((c) => c.id === id)!;

  // Simulate CCTP v2 bridge flow
  const handleBridge = async () => {
    if (!canBridge) return;
    setBridgeState("running");
    setStepStatuses(["idle","idle","idle"]);
    setTxHash("");

    for (let i = 0; i < STEPS.length; i++) {
      setStepStatuses((prev) => {
        const next = [...prev] as StepStatus[];
        next[i] = "active";
        return next;
      });
      await new Promise((res) => setTimeout(res, STEPS[i].duration));
      setStepStatuses((prev) => {
        const next = [...prev] as StepStatus[];
        next[i] = "done";
        return next;
      });
    }

    setTxHash("0x" + Math.random().toString(16).slice(2, 18));
    setBridgeState("done");
  };

  const reset = () => {
    setBridgeState("idle");
    setStepStatuses(["idle","idle","idle"]);
    setAmount("");
    setTxHash("");
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4">

      {/* ── Bridge form ─────────────────────────────────── */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-5">

        {/* FROM chain */}
        <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4">
          <div className="mb-3 font-mono text-[11px] text-muted">FROM</div>
          <div className="flex items-center gap-3">
            <ChainPicker
              value={fromChain}
              exclude={toChain}
              open={fromOpen}
              onToggle={() => { setFromOpen(!fromOpen); setToOpen(false); }}
              onSelect={(c) => { setFromChain(c); setFromOpen(false); }}
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={bridgeState === "running"}
              className="min-w-0 flex-1 bg-transparent font-mono text-2xl text-cream-white placeholder:text-ink-border2 focus:outline-none text-right disabled:opacity-50"
            />
          </div>
          <div className="mt-1 text-right font-mono text-[11px] text-muted">USDC</div>
        </div>

        {/* Flip button */}
        <div className="my-2 flex justify-center">
          <button
            onClick={flipChains}
            disabled={bridgeState === "running"}
            className="rounded-full border border-ink-border2 bg-ink-surface2 p-2 text-muted hover:border-red-primary/40 hover:text-red-primary transition-all disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M4 10l4 4 4-4M12 6L8 2 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* TO chain */}
        <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4">
          <div className="mb-3 font-mono text-[11px] text-muted">TO</div>
          <div className="flex items-center gap-3">
            <ChainPicker
              value={toChain}
              exclude={fromChain}
              open={toOpen}
              onToggle={() => { setToOpen(!toOpen); setFromOpen(false); }}
              onSelect={(c) => { setToChain(c); setToOpen(false); }}
            />
            <div className="flex-1 text-right font-mono text-2xl text-cream-white/60">
              {amount || "0.00"}
            </div>
          </div>
          <div className="mt-1 text-right font-mono text-[11px] text-muted">USDC · no fee</div>
        </div>

        {/* Info row */}
        {canBridge && bridgeState === "idle" && (
          <div className="mt-4 space-y-1.5 rounded-card border border-ink-border bg-ink-DEFAULT p-3">
            <InfoRow label="Protocol" value="CCTP v2" />
            <InfoRow label="Est. time" value="~20 seconds" />
            <InfoRow label="Bridge fee" value="Free (Circle Paymaster)" />
            <InfoRow label="You receive" value={`${amount} USDC on ${getChain(toChain).name}`} highlight />
          </div>
        )}

        {/* Bridge progress */}
        {(bridgeState === "running" || bridgeState === "done") && (
          <div className="mt-4 rounded-card border border-ink-border bg-ink-DEFAULT p-4">
            <div className="mb-3 font-mono text-[11px] text-muted">
              {bridgeState === "done" ? "Bridge complete" : "Bridge in progress..."}
            </div>
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const status = stepStatuses[i];
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    {/* Step indicator */}
                    <div className="mt-0.5 flex-shrink-0">
                      {status === "done" && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                          <span className="text-[10px] text-white">✓</span>
                        </div>
                      )}
                      {status === "active" && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-red-primary">
                          <span className="h-2 w-2 rounded-full bg-red-primary animate-pulse" />
                        </div>
                      )}
                      {(status === "idle" || status === "pending") && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-border2">
                          <span className="font-mono text-[10px] text-muted">{i + 1}</span>
                        </div>
                      )}
                    </div>
                    {/* Step text */}
                    <div>
                      <div className={`font-mono text-sm font-medium ${
                        status === "done" ? "text-success" :
                        status === "active" ? "text-cream-white" : "text-muted"
                      }`}>
                        {step.label}
                      </div>
                      <div className="font-mono text-[11px] text-muted">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tx hash */}
            {txHash && (
              <div className="mt-3 border-t border-ink-border pt-3">
                <div className="font-mono text-[10px] text-muted">Transaction hash</div>
                <div className="mt-1 font-mono text-[11px] text-cream-dim break-all">{txHash}</div>
              </div>
            )}
          </div>
        )}

        {/* Button */}
        {bridgeState === "idle" && (
          <button
            disabled={!canBridge}
            onClick={handleBridge}
            className={`mt-4 w-full rounded-lg py-3.5 font-body text-base font-medium transition-all ${
              canBridge
                ? "bg-red-primary text-white hover:bg-red-dim"
                : "cursor-not-allowed bg-ink-border2 text-muted"
            }`}
          >
            {!amount || parseFloat(amount) === 0
              ? "Enter amount"
              : fromChain === toChain
              ? "Select different chains"
              : `Bridge ${amount} USDC → ${getChain(toChain).short}`}
          </button>
        )}

        {bridgeState === "running" && (
          <button
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-lg bg-ink-border2 py-3.5 font-body text-base text-muted"
          >
            Bridging...
          </button>
        )}

        {bridgeState === "done" && (
          <button
            onClick={reset}
            className="mt-4 w-full rounded-lg border border-ink-border2 py-3.5 font-body text-sm text-cream-dim hover:text-cream-white transition-colors"
          >
            New bridge
          </button>
        )}
      </div>

      {/* ── Stats bar ───────────────────────────────────── */}
      <div className="grid grid-cols-4 overflow-hidden rounded-card2 border border-ink-border bg-ink-surface divide-x divide-ink-border">
        {BRIDGE_STATS.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-4 py-4">
            <span className="font-mono text-sm font-semibold text-cream-white">{value}</span>
            <span className="text-center font-body text-[10px] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function ChainPicker({
  value, exclude, open, onToggle, onSelect,
}: {
  value: ChainId;
  exclude: ChainId;
  open: boolean;
  onToggle: () => void;
  onSelect: (c: ChainId) => void;
}) {
  const chain = CHAINS.find((c) => c.id === value)!;
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg border border-ink-border2 bg-ink-DEFAULT px-3 py-2 font-mono text-sm font-medium text-cream-white hover:border-red-primary/40 transition-colors"
      >
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: chain.color }}
        />
        {chain.short}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-card border border-ink-border2 bg-ink-surface shadow-xl">
          {CHAINS.filter((c) => c.id !== exclude).map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-mono text-sm transition-colors hover:bg-ink-surface2 ${
                c.id === value ? "text-red-primary" : "text-cream-white"
              }`}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[11px] text-muted">{label}</span>
      <span className={`font-mono text-[11px] ${highlight ? "text-success" : "text-cream-dim"}`}>{value}</span>
    </div>
  );
}
