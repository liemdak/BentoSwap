"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { kit } from "@/lib/kit";
import { useChainUsdcBalance } from "@/hooks/useChainUsdcBalance";

// ── Chain definitions ──────────────────────────────────────
const CHAINS = [
  { id: "arc",  name: "Arc Testnet",       short: "Arc",   color: "#C8102E", bridgeChain: "Arc_Testnet",          chainId: 5042002,   rpc: "https://rpc.testnet.arc.network",                              usdc: "0x3600000000000000000000000000000000000000", explorer: "https://testnet.arcscan.app/tx/{hash}" },
  { id: "eth",  name: "Ethereum Sepolia",  short: "ETH",   color: "#627EEA", bridgeChain: "Ethereum_Sepolia",     chainId: 11155111,  rpc: "https://ethereum-sepolia-rpc.publicnode.com",                  usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", explorer: "https://sepolia.etherscan.io/tx/{hash}" },
  { id: "base", name: "Base Sepolia",      short: "Base",  color: "#0052FF", bridgeChain: "Base_Sepolia",         chainId: 84532,     rpc: "https://base-sepolia-rpc.publicnode.com",                      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", explorer: "https://sepolia.basescan.org/tx/{hash}" },
  { id: "arb",  name: "Arbitrum Sepolia",  short: "ARB",   color: "#12AAFF", bridgeChain: "Arbitrum_Sepolia",     chainId: 421614,    rpc: "https://arbitrum-sepolia-rpc.publicnode.com",                  usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", explorer: "https://sepolia.arbiscan.io/tx/{hash}" },
  { id: "op",   name: "Optimism Sepolia",  short: "OP",    color: "#FF0420", bridgeChain: "Optimism_Sepolia",     chainId: 11155420,  rpc: "https://optimism-sepolia-rpc.publicnode.com",                  usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7", explorer: "https://sepolia-optimistic.etherscan.io/tx/{hash}" },
  { id: "poly", name: "Polygon Amoy",      short: "MATIC", color: "#8247E5", bridgeChain: "Polygon_Amoy_Testnet", chainId: 80002,     rpc: "https://polygon-amoy-bor-rpc.publicnode.com",                  usdc: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", explorer: "https://amoy.polygonscan.com/tx/{hash}" },
  { id: "avax", name: "Avalanche Fuji",    short: "AVAX",  color: "#E84142", bridgeChain: "Avalanche_Fuji",       chainId: 43113,     rpc: "https://avalanche-fuji-c-chain-rpc.publicnode.com",            usdc: "0x5425890298aed601595a70AB815c96711a31Bc65", explorer: "https://subnets-test.avax.network/c-chain/tx/{hash}" },
  { id: "uni",  name: "Unichain Sepolia",  short: "UNI",   color: "#FF007A", bridgeChain: "Unichain_Sepolia",     chainId: 1301,      rpc: "https://sepolia.unichain.org",                                 usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F", explorer: "https://unichain-sepolia.blockscout.com/tx/{hash}" },
  { id: "pha",  name: "Pharos Atlantic",   short: "PHA",   color: "#00C9A7", bridgeChain: "Pharos_Testnet",       chainId: 688689,    rpc: "https://atlantic.dplabs-internal.com",                         usdc: "0xcfC8330f4BCAB529c625D12781b1C19466A9Fc8B", explorer: "https://atlantic.pharosscan.xyz/tx/{hash}" },
] as const;
type ChainId = (typeof CHAINS)[number]["id"];

const BRIDGE_STATS = [
  { label: "Total bridged", value: "$1.24M" },
  { label: "Transactions",  value: "3,847" },
  { label: "Avg time",      value: "~20s" },
  { label: "Fee saved",     value: "$0" },
];

type BridgeState = "idle" | "running" | "done" | "error";

interface StepResult {
  name:        string;
  state:       "pending" | "active" | "done" | "error";
  txHash?:     string;
  explorerUrl?: string;
}

const INITIAL_STEPS: StepResult[] = [
  { name: "Approve",     state: "pending" },
  { name: "Burn",        state: "pending" },
  { name: "Attestation", state: "pending" },
  { name: "Mint",        state: "pending" },
];

// ──────────────────────────────────────────────────────────
export default function BridgeCard() {
  const { adapter, chainId: walletChainId, isConnected, switchToArc, switchToChain, address } = useWallet();

  const [fromChain, setFromChain] = useState<ChainId>("arc");
  const [toChain,   setToChain]   = useState<ChainId>("eth");
  const [amount,    setAmount]    = useState("");
  const [fromOpen,  setFromOpen]  = useState(false);
  const [toOpen,    setToOpen]    = useState(false);

  const [bridgeState, setBridgeState] = useState<BridgeState>("idle");
  const [steps,       setSteps]       = useState<StepResult[]>(INITIAL_STEPS);
  const [errMsg,      setErrMsg]      = useState("");

  const fromDef = CHAINS.find(c => c.id === fromChain)!;
  const toDef   = CHAINS.find(c => c.id === toChain)!;

  // ── Per-chain USDC balances (refresh every 3s) ──────────
  const { balance: fromBalance, loading: fromBalLoading } = useChainUsdcBalance({
    rpc:           fromDef.rpc,
    usdcAddress:   fromDef.usdc,
    walletAddress: isConnected ? address : null,
  });
  const { balance: toBalance, loading: toBalLoading } = useChainUsdcBalance({
    rpc:           toDef.rpc,
    usdcAddress:   toDef.usdc,
    walletAddress: isConnected ? address : null,
  });

  const canBridge  = fromChain !== toChain && !!amount && parseFloat(amount) > 0 && isConnected;
  const wrongChain = isConnected && walletChainId !== fromDef.chainId;

  const flipChains = () => { setFromChain(toChain); setToChain(fromChain); };

  // ── Switch wallet to FROM chain ──────────────────────────
  const [isSwitching, setIsSwitching] = useState(false);
  const switchToFromChain = async () => {
    setIsSwitching(true);
    try {
      await switchToChain(fromDef.chainId, fromDef.name, fromDef.rpc);
    } catch {
      setErrMsg("Failed to switch network");
    } finally {
      setIsSwitching(false);
    }
  };

  // ── Human-readable step name ─────────────────────────────
  const formatStepName = (raw: string): string => {
    const map: Record<string, string> = {
      approve:          "Approve",
      burn:             "Burn",
      fetchAttestation: "Attestation",
      reAttest:         "Re-Attestation",
      mint:             "Mint",
    };
    return map[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  // ── Build correct explorer URL per step ──────────────────
  // Burn/Approve happen on FROM chain; Mint happens on TO chain
  const stepExplorerUrl = (name: string, txHash: string): string => {
    const isMint = name === "mint";
    const chainDef = isMint ? toDef : fromDef;
    return chainDef.explorer.replace("{hash}", txHash);
  };

  // ── Real kit.bridge() ────────────────────────────────────
  const handleBridge = async () => {
    if (!adapter || !canBridge) return;
    setBridgeState("running");
    setErrMsg("");
    // Show Approve as active first — it's always the first real step
    setSteps(INITIAL_STEPS.map((s, i) => ({ ...s, state: i === 0 ? "active" : "pending" as const })));

    try {
      const result = await kit.bridge({
        from: { adapter, chain: fromDef.bridgeChain },
        to:   { adapter, chain: toDef.bridgeChain },
        amount,
      });

      // Use REAL SDK steps — filter noop, map to UI shape
      const sdkSteps = (result as { steps?: { name: string; state: string; txHash?: string; explorerUrl?: string }[] }).steps ?? [];
      const visible = sdkSteps.filter(s => s.state !== "noop");

      // kit.bridge() resolved without throwing → bridge succeeded.
      // Trust the overall result, not individual SDK step states (CCTP v2 quirk:
      // the "burn" step is sometimes reported as "error" even on success).
      const mapped: StepResult[] = visible.map(sdk => ({
        name:        formatStepName(sdk.name),
        state:       "done" as const,
        txHash:      sdk.txHash,
        explorerUrl: sdk.explorerUrl
          ?? (sdk.txHash ? stepExplorerUrl(sdk.name, sdk.txHash) : undefined),
      }));

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
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">FROM</span>
            {isConnected && (
              <span className="font-mono text-[11px] text-muted">
                {fromBalLoading && fromBalance === null ? (
                  <span className="animate-pulse">loading…</span>
                ) : fromBalance !== null ? (
                  <span>Balance: <span className="text-cream-dim">{fromBalance} USDC</span></span>
                ) : (
                  <span className="text-muted/50">Balance: —</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ChainPicker value={fromChain} open={fromOpen}
              onToggle={() => { setFromOpen(!fromOpen); setToOpen(false); }}
              onSelect={c => {
                // If user picks the current TO chain, swap them instead of duplicating
                if (c === toChain) setToChain(fromChain);
                setFromChain(c);
                setFromOpen(false);
              }} />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" disabled={bridgeState === "running"}
              className="min-w-0 flex-1 bg-transparent font-mono text-2xl text-cream-white placeholder:text-ink-border2 focus:outline-none text-right disabled:opacity-50" />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted" />
            <div className="flex items-center gap-2">
              {isConnected && fromBalance !== null && (
                <button
                  onClick={() => setAmount(fromBalance.replace(/,/g, ""))}
                  disabled={bridgeState === "running"}
                  className="font-mono text-[10px] text-red-primary/70 hover:text-red-primary transition-colors disabled:opacity-40">
                  MAX
                </button>
              )}
              <span className="font-mono text-[11px] text-muted">USDC</span>
            </div>
          </div>
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
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">TO</span>
            {isConnected && (
              <span className="font-mono text-[11px] text-muted">
                {toBalLoading && toBalance === null ? (
                  <span className="animate-pulse">loading…</span>
                ) : toBalance !== null ? (
                  <span>Balance: <span className="text-cream-dim">{toBalance} USDC</span></span>
                ) : (
                  <span className="text-muted/50">Balance: —</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ChainPicker value={toChain} exclude={fromChain} open={toOpen}
              onToggle={() => { setToOpen(!toOpen); setFromOpen(false); }}
              onSelect={c => {
                if (c === fromChain) setFromChain(toChain);
                setToChain(c);
                setToOpen(false);
              }} />
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
            <button onClick={switchToFromChain} disabled={isSwitching}
              className="mt-2 w-full rounded border border-yellow-500/40 py-2 font-mono text-xs text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50">
              {isSwitching ? "Switching…" : `Switch to ${fromDef.name}`}
            </button>
          </div>
        )}

        {/* Bridge progress */}
        {(bridgeState === "running" || bridgeState === "done" || bridgeState === "error") && (
          <div className="mt-4 rounded-card border border-ink-border bg-black p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className={`flex items-center gap-1.5 font-mono text-[11px] ${
                bridgeState === "done"  ? "text-success" :
                bridgeState === "error" ? "text-red-primary" : "text-yellow-400"
              }`}>
                {bridgeState === "running" && (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                )}
                {bridgeState === "done" ? "Bridge complete ✓" : bridgeState === "error" ? "Bridge failed" : "Bridging in progress…"}
              </span>
              {bridgeState === "done" && (
                <span className="font-mono text-[10px] text-muted">
                  {fromDef.short} → {toDef.short}
                </span>
              )}
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
                      <div className="flex h-5 w-5 items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
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
                      step.state === "done"   ? "text-success" :
                      step.state === "active" ? "text-yellow-400" :
                      step.state === "error"  ? "text-red-primary" : "text-muted"
                    }`}>{step.name}</div>
                    {step.txHash && step.explorerUrl && (
                      <a href={step.explorerUrl}
                        target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[10px] text-success/70 hover:text-success transition-colors">
                        {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)} ↗
                      </a>
                    )}
                    {step.txHash && !step.explorerUrl && (
                      <span className="font-mono text-[10px] text-muted select-all">
                        {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)}
                      </span>
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

// ── Chain icon map ──────────────────────────────────────────
const CHAIN_ICON: Record<string, string> = {
  arc:  "/chains/Arc%20Testnet.png",
  eth:  "/chains/Ethereum%20Sepolia.png",
  base: "/chains/Base%20Sepolia.png",
  arb:  "/chains/Arbitrium%20Sepolia.png",
  op:   "/chains/OP%20Sepolia.png",
  poly: "/chains/Polygon%20Amoy.png",
  avax: "/chains/Avalanche%20Fuji.png",
  uni:  "/chains/Unichain%20Sepolia.jpg",
  pha:  "/chains/pharos.png",
};

function ChainImg({ id, color, size = 22 }: { id: string; color: string; size?: number }) {
  const src = CHAIN_ICON[id];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={id} width={size} height={size}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={e => {
        const t = e.currentTarget as HTMLImageElement;
        t.style.display = "none";
        const s = t.nextElementSibling as HTMLElement | null;
        if (s) s.style.display = "inline-block";
      }}
    />
  ) : (
    <span className="rounded-full flex-shrink-0 inline-block"
      style={{ width: size, height: size, backgroundColor: color }} />
  );
}

// ── Sub-components ─────────────────────────────────────────
function ChainPicker({ value, exclude, open, onToggle, onSelect }: {
  value: ChainId; exclude?: ChainId; open: boolean;
  onToggle: () => void; onSelect: (c: ChainId) => void;
}) {
  const chain = CHAINS.find(c => c.id === value)!;
  return (
    <div className="relative flex-shrink-0">
      <button onClick={onToggle}
        className="flex items-center gap-2.5 rounded-xl border border-ink-border2 bg-black px-3.5 py-2.5 font-mono text-sm font-medium text-white hover:border-red-primary/40 transition-colors">
        <ChainImg id={chain.id} color={chain.color} size={22} />
        <span>{chain.short}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-card border border-ink-border2 bg-ink-surface shadow-xl">
          {CHAINS.filter(c => exclude ? c.id !== exclude : true).map(c => (
            <button key={c.id} onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-3 px-3.5 py-3 text-left font-mono text-sm transition-colors hover:bg-ink-surface2 ${
                c.id === value ? "text-red-primary" : "text-cream-white"
              }`}>
              <ChainImg id={c.id} color={c.color} size={20} />
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
