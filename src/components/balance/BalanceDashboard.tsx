"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useArcUsdcBalance } from "@/hooks/useTokenBalance";
import { ARC_CHAIN_ID } from "@/lib/chains";

// ── Chain Icons ────────────────────────────────────────────
const CHAIN_IMG: Record<string, string> = {
  arc:  "/chains/Arc%20Testnet.png",
  eth:  "/chains/Ethereum%20Sepolia.png",
  base: "/chains/Base%20Sepolia.png",
  op:   "/chains/OP%20Sepolia.png",
  arb:  "/chains/Arbitrium%20Sepolia.png",
  poly: "/chains/Polygon%20Amoy.png",
  avax: "/chains/Avalanche%20Fuji.png",
  uni:  "/chains/Unichain%20Sepolia.jpg",
};

const CHAIN_FALLBACK_COLOR: Record<string, string> = {
  arc:  "#C8102E",
  eth:  "#627EEA",
  base: "#0052FF",
  arb:  "#12AAFF",
  op:   "#FF0420",
  poly: "#8247E5",
  avax: "#E84142",
  uni:  "#FF007A",
};

function ChainIcon({ id, size = 24 }: { id: string; size?: number }) {
  const src = CHAIN_IMG[id];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={id}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = "none";
          const sibling = target.nextElementSibling as HTMLElement | null;
          if (sibling) sibling.style.display = "block";
        }}
      />
    );
  }
  return (
    <span
      className="flex-shrink-0 rounded-full"
      style={{
        width: size, height: size,
        backgroundColor: CHAIN_FALLBACK_COLOR[id] ?? "#3A3020",
        display: "inline-block",
      }}
    />
  );
}

interface ChainBalance {
  id: string;
  name: string;
  short: string;
  color: string;
  available: number;
  pending: number;
  wallet: number;
}

// Mock gateway balances for non-Arc chains (Circle Gateway demo data)
const MOCK_CHAINS: ChainBalance[] = [
  { id: "eth",  name: "Eth Sepolia",      short: "ETH",   color: "#627EEA", available: 200.50, pending: 50.00, wallet: 320.00 },
  { id: "base", name: "Base Sepolia",     short: "Base",  color: "#0052FF", available: 175.25, pending: 0,     wallet: 175.25 },
  { id: "arb",  name: "Arb Sepolia",      short: "ARB",   color: "#12AAFF", available: 88.00,  pending: 12.00, wallet: 100.00 },
  { id: "op",   name: "OP Sepolia",       short: "OP",    color: "#FF0420", available: 60.00,  pending: 0,     wallet: 60.00  },
  { id: "poly", name: "Polygon Amoy",     short: "MATIC", color: "#8247E5", available: 45.50,  pending: 5.00,  wallet: 50.50  },
  { id: "avax", name: "Avalanche Fuji",   short: "AVAX",  color: "#E84142", available: 32.00,  pending: 0,     wallet: 32.00  },
  { id: "uni",  name: "Unichain Sepolia", short: "UNI",   color: "#FF007A", available: 28.00,  pending: 8.00,  wallet: 36.00  },
];

export default function BalanceDashboard() {
  const { address, isConnected, chainId, switchToArc } = useWallet();
  const { balance: arcWalletRaw, loading: arcLoading } = useArcUsdcBalance(address);
  const onArc = chainId === ARC_CHAIN_ID;

  const [depositChain,   setDepositChain]   = useState<string | null>(null);
  const [withdrawChain,  setWithdrawChain]  = useState<string | null>(null);
  const [depositAmount,  setDepositAmount]  = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Real Arc wallet balance (live from RPC)
  const arcWallet = parseFloat(arcWalletRaw) || 0;

  // Arc row uses real wallet data; gateway available/pending shown as 0 until Circle Gateway API is wired
  const arcChain: ChainBalance = {
    id: "arc", name: "Arc Testnet", short: "Arc", color: "#C8102E",
    available: isConnected ? arcWallet : 0,
    pending:   0,
    wallet:    arcWallet,
  };

  const allChains = [arcChain, ...MOCK_CHAINS];
  const totalUnified = allChains.reduce((s, c) => s + c.available, 0);
  const totalPending  = allChains.reduce((s, c) => s + c.pending,  0);

  // Guard for deposit/withdraw action panels
  const ActionGuard = ({ chainId: cid, children }: { chainId: string; children: React.ReactNode }) => {
    if (!isConnected) {
      return (
        <p className="font-mono text-xs text-muted py-1">
          Connect your wallet to {cid === depositChain ? "deposit" : "withdraw"}
        </p>
      );
    }
    if (!onArc) {
      return (
        <button
          onClick={switchToArc}
          className="w-full rounded-lg border border-red-primary bg-red-bg py-2 font-mono text-xs text-red-primary hover:bg-red-primary hover:text-white transition-colors"
        >
          Switch to Arc Testnet first
        </button>
      );
    }
    return <>{children}</>;
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">

      {/* ── Unified balance ─────────────────────────────── */}
      <div className="overflow-hidden rounded-card2 border border-ink-border bg-ink-surface shadow-card">
        <div className="h-1 w-full bg-gradient-to-r from-red-primary via-cream-dim to-success" />
        <div className="p-5 sm:p-6">
          <div className="mb-1 font-mono text-xs tracking-widest text-muted">UNIFIED BALANCE</div>
          <div className="flex flex-wrap items-end gap-2">
            {arcLoading && isConnected ? (
              <span className="font-mono text-4xl font-semibold text-muted sm:text-5xl animate-pulse">
                $—
              </span>
            ) : (
              <span className="font-mono text-4xl font-semibold text-cream-white sm:text-5xl">
                ${totalUnified.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            )}
            <span className="mb-0.5 font-mono text-base text-cream-dim sm:text-lg">USDC</span>
          </div>
          {totalPending > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
              <span className="font-mono text-xs text-muted">+${totalPending.toFixed(2)} pending</span>
            </div>
          )}
          {!isConnected && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted" />
              <span className="font-mono text-xs text-muted">Connect wallet to see your live balance</span>
            </div>
          )}
          <p className="mt-3 font-body text-sm text-muted">
            Aggregated across{" "}
            <span className="text-cream-dim">{allChains.length} chains</span> via Circle Gateway.
            {isConnected && (
              <span className="ml-1 text-success">Arc balance is live.</span>
            )}
          </p>
        </div>
      </div>

      {/* ── How it works ────────────────────────────────── */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-4 shadow-card sm:p-5">
        <div className="mb-3 font-mono text-xs tracking-widest text-muted">{"// HOW IT WORKS"}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[
            { step: "01", label: "Deposit",   desc: "Move USDC from wallet to Gateway" },
            { step: "02", label: "Aggregate", desc: "Circle pools balance cross-chain"  },
            { step: "03", label: "Spend",     desc: "Pay anywhere — no bridge needed"   },
            { step: "04", label: "Withdraw",  desc: "Pull back to any wallet anytime"   },
          ].map(({ step, label, desc }) => (
            <div key={step} className="rounded-card border border-ink-border bg-ink-surface2 p-3">
              <div className="mb-1 font-mono text-xs text-red-primary">{step}</div>
              <div className="font-mono text-sm font-medium text-cream-white">{label}</div>
              <div className="mt-1 font-body text-xs leading-relaxed text-muted">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-chain breakdown ──────────────────────────── */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-4 shadow-card sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-muted">{"// PER-CHAIN"}</span>
          <div className="hidden gap-5 font-mono text-[10px] text-muted sm:flex">
            <span>Available</span>
            <span>Pending</span>
            <span>Wallet</span>
          </div>
        </div>

        <div className="space-y-2">
          {allChains.map((chain) => (
            <div key={chain.id}>
              <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-3">

                {/* ── Desktop row ─── */}
                <div className="hidden items-center gap-3 sm:flex">
                  <ChainIcon id={chain.id} size={24} />
                  <span className="w-14 font-mono text-sm text-cream-white">{chain.short}</span>
                  <div className="flex flex-1 justify-end gap-6 font-mono text-sm">
                    <span className="text-cream-white">
                      {chain.id === "arc" && arcLoading && isConnected
                        ? <span className="text-muted animate-pulse">…</span>
                        : `$${chain.available.toFixed(2)}`
                      }
                    </span>
                    <span className={chain.pending > 0 ? "text-yellow-400" : "text-muted"}>
                      ${chain.pending.toFixed(2)}
                    </span>
                    <span className={chain.id === "arc" && isConnected ? "text-cream-dim" : "text-muted"}>
                      {chain.id === "arc" && arcLoading && isConnected
                        ? <span className="animate-pulse">…</span>
                        : `$${chain.wallet.toFixed(2)}`
                      }
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <ActionBtn
                      active={depositChain === chain.id}
                      color="red"
                      onClick={() => { setDepositChain(depositChain === chain.id ? null : chain.id); setWithdrawChain(null); }}
                    >Deposit</ActionBtn>
                    <ActionBtn
                      active={withdrawChain === chain.id}
                      color="green"
                      onClick={() => { setWithdrawChain(withdrawChain === chain.id ? null : chain.id); setDepositChain(null); }}
                    >Withdraw</ActionBtn>
                  </div>
                </div>

                {/* ── Mobile layout ─── */}
                <div className="sm:hidden">
                  <div className="mb-2 flex items-center gap-2">
                    <ChainIcon id={chain.id} size={20} />
                    <span className="font-mono text-sm font-medium text-cream-white">{chain.name}</span>
                    {chain.id === "arc" && isConnected && (
                      <span className="ml-auto rounded bg-success/10 px-1.5 py-0.5 font-mono text-[9px] text-success">LIVE</span>
                    )}
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="font-mono text-xs text-muted">Available</div>
                      <div className="font-mono text-sm text-cream-white">${chain.available.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="font-mono text-xs text-muted">Pending</div>
                      <div className={`font-mono text-sm ${chain.pending > 0 ? "text-yellow-400" : "text-muted"}`}>
                        ${chain.pending.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-xs text-muted">Wallet</div>
                      <div className="font-mono text-sm text-muted">${chain.wallet.toFixed(0)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setDepositChain(depositChain === chain.id ? null : chain.id); setWithdrawChain(null); }}
                      className={`flex-1 rounded border py-2.5 font-mono text-xs font-medium transition-colors ${
                        depositChain === chain.id
                          ? "border-red-primary bg-red-bg text-red-primary"
                          : "border-ink-border text-muted hover:text-cream-white"
                      }`}
                    >Deposit</button>
                    <button
                      onClick={() => { setWithdrawChain(withdrawChain === chain.id ? null : chain.id); setDepositChain(null); }}
                      className={`flex-1 rounded border py-2.5 font-mono text-xs font-medium transition-colors ${
                        withdrawChain === chain.id
                          ? "border-success/60 bg-success/10 text-success"
                          : "border-ink-border text-muted hover:text-cream-white"
                      }`}
                    >Withdraw</button>
                  </div>
                </div>
              </div>

              {/* Deposit panel */}
              {depositChain === chain.id && (
                <div className="mx-2 rounded-b-card border border-t-0 border-red-primary/30 bg-red-bg p-3">
                  <ActionGuard chainId={chain.id}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Amount"
                        className="min-w-0 flex-1 rounded border border-red-primary/30 bg-ink-surface2 px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:outline-none"
                      />
                      <span className="flex-shrink-0 font-mono text-xs text-muted">USDC</span>
                      <button className="flex-shrink-0 rounded-lg bg-red-primary px-4 py-2.5 font-mono text-xs text-white transition-colors hover:bg-red-dim">
                        Deposit
                      </button>
                    </div>
                  </ActionGuard>
                  <p className="mt-2 font-mono text-[10px] text-muted">
                    Moves USDC from {chain.name} → Unified Balance
                  </p>
                </div>
              )}

              {/* Withdraw panel */}
              {withdrawChain === chain.id && (
                <div className="mx-2 rounded-b-card border border-t-0 border-success/30 bg-success/5 p-3">
                  <ActionGuard chainId={chain.id}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Amount"
                        className="min-w-0 flex-1 rounded border border-success/30 bg-ink-surface2 px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:outline-none"
                      />
                      <span className="flex-shrink-0 font-mono text-xs text-muted">USDC</span>
                      <button className="flex-shrink-0 rounded-lg bg-success px-4 py-2.5 font-mono text-xs text-white transition-opacity hover:opacity-90">
                        Withdraw
                      </button>
                    </div>
                  </ActionGuard>
                  <p className="mt-2 font-mono text-[10px] text-muted">
                    Pulls USDC from Unified Balance → {chain.name}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  active, color, onClick, children,
}: {
  active: boolean; color: "red" | "green"; onClick: () => void; children: React.ReactNode;
}) {
  const activeClass = color === "red"
    ? "border-red-primary bg-red-bg text-red-primary"
    : "border-success/60 bg-success/10 text-success";
  return (
    <button
      onClick={onClick}
      className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
        active ? activeClass : "border-ink-border text-muted hover:text-cream-white"
      }`}
    >
      {children}
    </button>
  );
}
