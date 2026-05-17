"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { ARC_CHAIN_ID } from "@/lib/chains";
import { useChainUsdcBalance } from "@/hooks/useChainUsdcBalance";

// ── Chain config ────────────────────────────────────────────
const CHAINS = [
  { id: "arc",  name: "Arc Testnet",       short: "Arc",   color: "#C8102E", rpc: "https://rpc.testnet.arc.network",                        usdc: "0x3600000000000000000000000000000000000000" },
  { id: "eth",  name: "Eth Sepolia",       short: "ETH",   color: "#627EEA", rpc: "https://rpc.sepolia.org",                                usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
  { id: "base", name: "Base Sepolia",      short: "Base",  color: "#0052FF", rpc: "https://sepolia.base.org",                               usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
  { id: "arb",  name: "Arb Sepolia",       short: "ARB",   color: "#12AAFF", rpc: "https://sepolia-rollup.arbitrum.io/rpc",                 usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" },
  { id: "op",   name: "OP Sepolia",        short: "OP",    color: "#FF0420", rpc: "https://sepolia.optimism.io",                            usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" },
  { id: "poly", name: "Polygon Amoy",      short: "MATIC", color: "#8247E5", rpc: "https://rpc-amoy.polygon.technology",                    usdc: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582" },
  { id: "avax", name: "Avalanche Fuji",    short: "AVAX",  color: "#E84142", rpc: "https://api.avax-test.network/ext/bc/C/rpc",             usdc: "0x5425890298aed601595a70AB815c96711a31Bc65" },
  { id: "uni",  name: "Unichain Sepolia",  short: "UNI",   color: "#FF007A", rpc: "https://sepolia.unichain.org",                           usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F" },
] as const;

// ── Chain Icons ─────────────────────────────────────────────
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

function ChainIcon({ id, size = 24 }: { id: string; size?: number }) {
  const src = CHAIN_IMG[id];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={id} width={size} height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          const t = e.currentTarget as HTMLImageElement;
          t.style.display = "none";
          const s = t.nextElementSibling as HTMLElement | null;
          if (s) s.style.display = "block";
        }}
      />
    );
  }
  return (
    <span className="flex-shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: "#3A3020", display: "inline-block" }} />
  );
}

// ── ChainRow — reads real balance via RPC ──────────────────
function ChainRow({
  chain, walletAddress, depositChain, withdrawChain,
  onDeposit, onWithdraw,
}: {
  chain: typeof CHAINS[number];
  walletAddress: string | null;
  depositChain: string | null;
  withdrawChain: string | null;
  onDeposit: (id: string) => void;
  onWithdraw: (id: string) => void;
}) {
  const { balance, loading } = useChainUsdcBalance({
    rpc:           chain.rpc,
    usdcAddress:   chain.usdc,
    walletAddress,
  });

  const [depositAmt,  setDepositAmt]  = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const walletBal = balance !== null ? parseFloat(balance.replace(/,/g, "")) : null;
  const isDepositing  = depositChain  === chain.id;
  const isWithdrawing = withdrawChain === chain.id;

  return (
    <div>
      <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-3">

        {/* Desktop */}
        <div className="hidden items-center gap-3 sm:flex">
          <ChainIcon id={chain.id} size={24} />
          <span className="w-16 font-mono text-sm text-cream-white">{chain.short}</span>
          <div className="flex flex-1 justify-end gap-6 font-mono text-sm">
            {/* Wallet balance — real from RPC */}
            <span className="w-20 text-right text-cream-dim">
              {!walletAddress ? (
                <span className="text-muted">—</span>
              ) : loading && balance === null ? (
                <span className="animate-pulse text-muted">…</span>
              ) : walletBal !== null ? (
                `$${walletBal.toFixed(2)}`
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
          </div>
          <div className="flex gap-1.5">
            <ActionBtn active={isDepositing}  color="red"   onClick={() => onDeposit(chain.id)}>Deposit</ActionBtn>
            <ActionBtn active={isWithdrawing} color="green" onClick={() => onWithdraw(chain.id)}>Withdraw</ActionBtn>
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden">
          <div className="mb-2 flex items-center gap-2">
            <ChainIcon id={chain.id} size={20} />
            <span className="font-mono text-sm font-medium text-cream-white">{chain.name}</span>
            <span className="ml-auto font-mono text-sm text-cream-dim">
              {!walletAddress ? "—" : loading && balance === null ? "…" : walletBal !== null ? `$${walletBal.toFixed(2)}` : "—"}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onDeposit(chain.id)}
              className={`flex-1 rounded border py-2.5 font-mono text-xs font-medium transition-colors ${
                isDepositing ? "border-red-primary bg-red-bg text-red-primary" : "border-ink-border text-muted hover:text-cream-white"
              }`}>Deposit</button>
            <button onClick={() => onWithdraw(chain.id)}
              className={`flex-1 rounded border py-2.5 font-mono text-xs font-medium transition-colors ${
                isWithdrawing ? "border-success/60 bg-success/10 text-success" : "border-ink-border text-muted hover:text-cream-white"
              }`}>Withdraw</button>
          </div>
        </div>
      </div>

      {/* Deposit panel */}
      {isDepositing && (
        <div className="mx-2 rounded-b-card border border-t-0 border-red-primary/30 bg-red-bg p-3">
          {!walletAddress ? (
            <p className="font-mono text-xs text-muted">Connect your wallet to deposit</p>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                placeholder="Amount"
                className="min-w-0 flex-1 rounded border border-red-primary/30 bg-black px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:outline-none" />
              <span className="flex-shrink-0 font-mono text-xs text-muted">USDC</span>
              <button className="flex-shrink-0 rounded-lg bg-red-primary px-4 py-2.5 font-mono text-xs text-white transition-colors hover:bg-red-dim">
                Deposit
              </button>
            </div>
          )}
          <p className="mt-2 font-mono text-[10px] text-muted">
            Moves USDC from {chain.name} → Unified Balance
          </p>
        </div>
      )}

      {/* Withdraw panel */}
      {isWithdrawing && (
        <div className="mx-2 rounded-b-card border border-t-0 border-success/30 bg-success/5 p-3">
          {!walletAddress ? (
            <p className="font-mono text-xs text-muted">Connect your wallet to withdraw</p>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                placeholder="Amount"
                className="min-w-0 flex-1 rounded border border-success/30 bg-black px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:outline-none" />
              <span className="flex-shrink-0 font-mono text-xs text-muted">USDC</span>
              <button className="flex-shrink-0 rounded-lg bg-success px-4 py-2.5 font-mono text-xs text-white transition-opacity hover:opacity-90">
                Withdraw
              </button>
            </div>
          )}
          <p className="mt-2 font-mono text-[10px] text-muted">
            Pulls USDC from Unified Balance → {chain.name}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────
export default function BalanceDashboard() {
  const { address, isConnected, chainId, switchToArc } = useWallet();
  const onArc = chainId === ARC_CHAIN_ID;

  const [depositChain,  setDepositChain]  = useState<string | null>(null);
  const [withdrawChain, setWithdrawChain] = useState<string | null>(null);

  const handleDeposit  = (id: string) => { setDepositChain(depositChain  === id ? null : id); setWithdrawChain(null); };
  const handleWithdraw = (id: string) => { setWithdrawChain(withdrawChain === id ? null : id); setDepositChain(null); };

  // Arc balance for unified total (read separately for the header)
  const { balance: arcBalStr } = useChainUsdcBalance({
    rpc:           CHAINS[0].rpc,
    usdcAddress:   CHAINS[0].usdc,
    walletAddress: isConnected ? address : null,
  });
  const arcBal = arcBalStr !== null ? parseFloat(arcBalStr.replace(/,/g, "")) : 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">

      {/* ── Unified balance ──────────────────────────────── */}
      <div className="overflow-hidden rounded-card2 border border-ink-border bg-ink-surface shadow-card">
        <div className="h-1 w-full bg-gradient-to-r from-red-primary via-cream-dim to-success" />
        <div className="p-5 sm:p-6">
          <div className="mb-1 font-mono text-xs tracking-widest text-muted">UNIFIED BALANCE</div>
          <div className="flex flex-wrap items-end gap-2">
            {!isConnected ? (
              <span className="font-mono text-4xl font-semibold text-muted sm:text-5xl">$—</span>
            ) : (
              <span className="font-mono text-4xl font-semibold text-cream-white sm:text-5xl">
                ${arcBal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            )}
            <span className="mb-0.5 font-mono text-base text-cream-dim sm:text-lg">USDC</span>
          </div>
          {!isConnected && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted" />
              <span className="font-mono text-xs text-muted">Connect wallet to see your live balance</span>
            </div>
          )}
          <p className="mt-3 font-body text-sm text-muted">
            Wallet USDC across{" "}
            <span className="text-cream-dim">{CHAINS.length} chains</span>.
            {isConnected && <span className="ml-1 text-success">Live from RPC.</span>}
          </p>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────── */}
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

      {/* ── Per-chain breakdown ───────────────────────────── */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-4 shadow-card sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-muted">{"// PER-CHAIN WALLET BALANCE"}</span>
          <div className="hidden gap-5 font-mono text-[10px] text-muted sm:flex">
            <span>Wallet USDC</span>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4 text-center">
            <p className="font-mono text-xs text-muted">Connect wallet to view balances</p>
          </div>
        )}

        {isConnected && !onArc && (
          <div className="mb-3 rounded-card border border-yellow-500/30 bg-yellow-500/5 p-3">
            <p className="font-mono text-xs text-yellow-400">
              Switch to Arc Testnet to use Deposit / Withdraw
            </p>
            <button onClick={switchToArc}
              className="mt-2 w-full rounded border border-yellow-500/40 py-2 font-mono text-xs text-yellow-400 hover:bg-yellow-500/10 transition-colors">
              Switch to Arc Testnet
            </button>
          </div>
        )}

        {isConnected && (
          <div className="space-y-2">
            {CHAINS.map(chain => (
              <ChainRow
                key={chain.id}
                chain={chain}
                walletAddress={address}
                depositChain={depositChain}
                withdrawChain={withdrawChain}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ active, color, onClick, children }: {
  active: boolean; color: "red" | "green"; onClick: () => void; children: React.ReactNode;
}) {
  const activeClass = color === "red"
    ? "border-red-primary bg-red-bg text-red-primary"
    : "border-success/60 bg-success/10 text-success";
  return (
    <button onClick={onClick}
      className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
        active ? activeClass : "border-ink-border text-muted hover:text-cream-white"
      }`}>
      {children}
    </button>
  );
}
