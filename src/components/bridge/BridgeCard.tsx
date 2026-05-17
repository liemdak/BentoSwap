"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { kit } from "@/lib/kit";

// ── Chain definitions ──────────────────────────────────────
const CHAINS = [
  { id: "arc",  name: "Arc Testnet",       short: "Arc",   color: "#C8102E", bridgeChain: "Arc_Testnet",          chainId: 5042002,   rpc: "https://rpc.testnet.arc.network" },
  { id: "eth",  name: "Ethereum Sepolia",  short: "ETH",   color: "#627EEA", bridgeChain: "Ethereum_Sepolia",     chainId: 11155111,  rpc: "https://rpc.sepolia.org" },
  { id: "base", name: "Base Sepolia",      short: "Base",  color: "#0052FF", bridgeChain: "Base_Sepolia",         chainId: 84532,     rpc: "https://sepolia.base.org" },
  { id: "arb",  name: "Arbitrum Sepolia",  short: "ARB",   color: "#12AAFF", bridgeChain: "Arbitrum_Sepolia",     chainId: 421614,    rpc: "https://sepolia-rollup.arbitrum.io/rpc" },
  { id: "op",   name: "Optimism Sepolia",  short: "OP",    color: "#FF0420", bridgeChain: "Optimism_Sepolia",     chainId: 11155420,  rpc: "https://sepolia.optimism.io" },
  { id: "poly", name: "Polygon Amoy",      short: "MATIC", color: "#8247E5", bridgeChain: "Polygon_Amoy_Testnet", chainId: 80002,     rpc: "https://rpc-amoy.polygon.technology" },
  { id: "avax", name: "Avalanche Fuji",    short: "AVAX",  color: "#E84142", bridgeChain: "Avalanche_Fuji",       chainId: 43113,     rpc: "https://api.avax-test.network/ext/bc/C/rpc" },
  { id: "uni",  name: "Unichain Sepolia",  short: "UNI",   color: "#FF007A", bridgeChain: "Unichain_Sepolia",     chainId: 1301,      rpc: "https://sepolia.unichain.org" },
] as const;
type ChainId = (typeof CHAINS)[number]["id"];

const BRIDGE_STATS = [
  { label: "Total bridged", value: "$1.24M" },
  { label: "Transactions",  value: "3,847" },
  { label: "Avg time",      value: "~20s" },
  { label: "Fee saved",     value: "$0" },
];

type BridgeState = "idle" | "switching" | "running" | "done" | "error";

interface StepResult {
  name:        string;
  state:       "pending" | "active" | "done" | "error";
  txHash?:     string;
  explorerUrl?: string;
}

const INITIAL_STEPS: StepResult[] = [
  { name: "Burn",        state: "pending" },
  { name: "Attestation", state: "pending" },
  { name: "Mint",        state: "pending" },
];

// ──────────────────────────────────────────────────────────
export default function BridgeCard() {
  const { adapter, chainId: walletChainId, isConnected, switchToArc } = useWallet();

  const [fromChain, setFromChain] = useState<ChainId>("eth");
  const [toChain,   setToChain]   = useState<ChainId>("arc");
  const [amount,    setAmount]    = useState("");
  const [fromOpen,  setFromOpen]  = useState(false);
  const [toOpen,    setToOpen]    = useState(false);

  const [bridgeState, setBridgeState] = useState<BridgeState>("idle");
  const [steps,       setSteps]       = useState<StepResult[]>(INITIAL_STEPS);
  const [errMsg,      setErrMsg]      = useState("");

  const fromDef = CHAINS.find(c => c.id === fromChain)!;
  const toDef   = CHAINS.find(c => c.id === toChain)!;

  const canBridge  = fromChain !== toChain && !!amount && parseFloat(amount) > 0 && isConnected;
  const wrongChain = isConnected && walletChainId !== fromDef.chainId;

  const flipChains = () => { setFromChain(toChain); setToChain(fromChain); };

  // ── Switch wallet to FROM chain ──────────────────────────
  const switchToFromChain = async () => {
    const win = window as Window & { ethereum?: { request: (a: unknown) => Promise<unknown> } };
    if (!win.ethereum) return;
    setBridgeState("switching");
    try {
      const hexId = "0x" + fromDef.chainId.toString(16);
      try {
        await win.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexId }],
        });
      } catch (e: unknown) {
        if ((e as {code?: number}).code === 4902) {
          await win.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: hexId,
              chainName: fromDef.name,
              rpcUrls: [fromDef.rpc],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            }],
          });
        } else throw e;
      }
    } catch {
      setErrMsg("Failed to switch network");
    } finally {
      setBridgeState("idle");
    }
  };

  // ── Real kit.bridge() ────────────────────────────────────
  const handleBridge = async () => {
    if (!adapter || !canBridge) return;
    setBridgeState("running");
    setErrMsg("");
    setSteps(INITIAL_STEPS.map((s, i) => ({ ...s, state: i === 0 ? "active" : "pending" })));

    try {
      // Animate step 1 active (Burn)
      const result = await kit.bridge({
        from: { adapter, chain: fromDef.bridgeChain },
        to:   { adapter, chain: toDef.bridgeChain },
        amount,
      });

      // Map SDK steps to UI steps
      const sdkSteps = (result as unknown as { steps?: { name: string; state: string; txHash?: string; explorerUrl?: string }[] }).steps ?? [];
      const mapped: StepResult[] = INITIAL_STEPS.map((init, i) => {
        const sdk = sdkSteps[i];
        return {
          name:        init.name,
          state:       sdk?.state === "success" ? "done" : sdk?.state === "error" ? "error" : "done",
          txHash:      sdk?.txHash,
          explorerUrl: sdk?.explorerUrl,
        };
      });
      setSteps(mapped.length > 0 ? mapped : INITIAL_STEPS.map(s => ({ ...s, state: "done" as const })));
      setBridgeState("done");

      // Switch back to Arc after successful bridge TO Arc
      if (toChain === "arc") {
        setTimeout(switchToArc, 1500);
      }
    } catch (e: unknown) {
      setErrMsg((e as Error).message ?? "Bridge failed");
      setBridgeState("error");
      setSteps(prev => prev.map(s => s.state === "active" ? { ...s, state: "error" } : s));
    }
  };

  const reset = () => {
    setBridgeState("idle");
    setSteps(INITIAL_STEPS);
    setErrMsg("");
    setAmount("");
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-5">

        {/* FROM */}
        <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4">
          <div className="mb-3 font-mono text-[11px] text-muted">FROM</div>
          <div className="flex items-center gap-3">
            <ChainPicker value={fromChain} exclude={toChain} open={fromOpen}
              onToggle={() => { setFromOpen(!fromOpen); setToOpen(false); }}
              onSelect={c => { setFromChain(c); setFromOpen(false); }} />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" disabled={bridgeState === "running"}
              className="min-w-0 flex-1 bg-transparent font-mono text-2xl text-cream-white placeholder:text-ink-border2 focus:outline-none text-right disabled:opacity-50" />
          </div>
          <div className="mt-1 text-right font-mono text-[11px] text-muted">USDC</div>
        </div>

        {/* Flip */}
        <div className="my-2 flex justify-center">
          <button onClick={flipChains} disabled={bridgeState === "running"}
            className="rounded-full border border-ink-border2 bg-ink-surface2 p-2 text-muted hover:border-red-primary/40 hover:text-red-primary transition-all disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M4 10l4 4 4-4M12 6L8 2 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* TO */}
        <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4">
          <div className="mb-3 font-mono text-[11px] text-muted">TO</div>
          <div className="flex items-center gap-3">
            <ChainPicker value={toChain} exclude={fromChain} open={toOpen}
              onToggle={() => { setToOpen(!toOpen); setFromOpen(false); }}
              onSelect={c => { setToChain(c); setToOpen(false); }} />
            <div className="flex-1 text-right font-mono text-2xl text-cream-white/60">
              {amount || "0.00"}
            </div>
          </div>
          <div className="mt-1 text-right font-mono text-[11px] text-muted">USDC · no fee</div>
        </div>

        {/* Info */}
        {canBridge && !wrongChain && bridgeState === "idle" && (
          <div className="mt-4 space-y-1.5 rounded-card border border-ink-border bg-black p-3">
            <InfoRow label="Protocol"    value="CCTP v2" />
            <InfoRow label="Est. time"   value="~20 seconds" />
            <InfoRow label="Bridge fee"  value="Free (Circle Paymaster)" />
            <InfoRow label="You receive" value={`${amount} USDC on ${toDef.name}`} highlight />
          </div>
        )}

        {/* Wrong chain warning */}
        {wrongChain && bridgeState === "idle" && (
          <div className="mt-4 rounded-card border border-yellow-500/30 bg-yellow-500/5 p-3">
            <p className="font-mono text-xs text-yellow-400">
              Switch wallet to <strong>{fromDef.name}</strong> to bridge from this chain
            </p>
            <button onClick={switchToFromChain}
              className="mt-2 w-full rounded border border-yellow-500/40 py-2 font-mono text-xs text-yellow-400 hover:bg-yellow-500/10 transition-colors">
              Switch to {fromDef.name}
            </button>
          </div>
        )}

        {/* Bridge progress */}
        {(bridgeState === "running" || bridgeState === "done" || bridgeState === "error") && (
          <div className="mt-4 rounded-card border border-ink-border bg-black p-4">
            <div className="mb-3 font-mono text-[11px] text-muted">
              {bridgeState === "done" ? "Bridge complete ✓" : bridgeState === "error" ? "Bridge failed" : "Bridge in progress..."}
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {step.state === "done" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                        <span className="text-[10px] text-white">✓</span>
                      </div>
                    )}
                    {step.state === "active" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-red-primary">
                        <span className="h-2 w-2 rounded-full bg-red-primary animate-pulse" />
                      </div>
                    )}
                    {step.state === "error" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-primary">
                        <span className="text-[10px] text-white">✗</span>
                      </div>
                    )}
                    {step.state === "pending" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-border2">
                        <span className="font-mono text-[10px] text-muted">{i + 1}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={`font-mono text-sm font-medium ${
                      step.state === "done" ? "text-success" :
                      step.state === "active" ? "text-cream-white" :
                      step.state === "error" ? "text-red-primary" : "text-muted"
                    }`}>{step.name}</div>
                    {step.txHash && (
                      <a href={step.explorerUrl ?? `https://testnet.arcscan.app/tx/${step.txHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[10px] text-success/70 hover:text-success transition-colors">
                        {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)} ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {errMsg && (
          <div className="mt-3 rounded-card border border-red-primary/30 bg-red-bg p-3">
            <p className="font-mono text-xs text-red-primary">{errMsg}</p>
          </div>
        )}

        {/* Buttons */}
        {bridgeState === "idle" && (
          !isConnected ? (
            <div className="mt-4 rounded-lg border border-ink-border2 bg-ink-surface2 py-3.5 text-center font-body text-sm text-muted">
              Connect wallet to bridge
            </div>
          ) : wrongChain ? null : (
            <button disabled={!canBridge} onClick={handleBridge}
              className={`mt-4 w-full rounded-lg py-3.5 font-body text-base font-medium transition-all ${
                canBridge ? "bg-red-primary text-white hover:bg-red-dim" : "cursor-not-allowed bg-ink-border2 text-muted"
              }`}>
              {!amount || parseFloat(amount) === 0 ? "Enter amount"
                : fromChain === toChain ? "Select different chains"
                : `Bridge ${amount} USDC → ${toDef.short}`}
            </button>
          )
        )}

        {bridgeState === "switching" && (
          <button disabled className="mt-4 w-full cursor-not-allowed rounded-lg bg-ink-border2 py-3.5 font-body text-base text-muted">
            Switching network...
          </button>
        )}

        {bridgeState === "running" && (
          <button disabled className="mt-4 w-full cursor-not-allowed rounded-lg bg-ink-border2 py-3.5 font-body text-base text-muted">
            Bridging...
          </button>
        )}

        {(bridgeState === "done" || bridgeState === "error") && (
          <button onClick={reset}
            className="mt-4 w-full rounded-lg border border-ink-border2 py-3.5 font-body text-sm text-cream-dim hover:text-cream-white transition-colors">
            New bridge
          </button>
        )}
      </div>

      {/* Stats */}
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
function ChainPicker({ value, exclude, open, onToggle, onSelect }: {
  value: ChainId; exclude: ChainId; open: boolean;
  onToggle: () => void; onSelect: (c: ChainId) => void;
}) {
  const chain = CHAINS.find(c => c.id === value)!;
  return (
    <div className="relative flex-shrink-0">
      <button onClick={onToggle}
        className="flex items-center gap-2 rounded-lg border border-ink-border2 bg-black px-3 py-2 font-mono text-sm font-medium text-white hover:border-red-primary/40 transition-colors">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: chain.color }} />
        {chain.short}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-card border border-ink-border2 bg-ink-surface shadow-xl">
          {CHAINS.filter(c => c.id !== exclude).map(c => (
            <button key={c.id} onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left font-mono text-sm transition-colors hover:bg-ink-surface2 ${
                c.id === value ? "text-red-primary" : "text-cream-white"
              }`}>
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
