"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { useWallet } from "@/context/WalletContext";
import { ARC_CHAIN_ID } from "@/lib/chains";
import { useChainUsdcBalance } from "@/hooks/useChainUsdcBalance";
import { useGatewayBalance } from "@/hooks/useGatewayBalance";
import { kit } from "@/lib/kit";

// ── Chain config ────────────────────────────────────────────
const CHAINS = [
  { id: "arc",  name: "Arc Testnet",       short: "Arc",   color: "#C8102E", rpc: "https://rpc.testnet.arc.network",                        usdc: "0x3600000000000000000000000000000000000000", gatewayChain: "Arc_Testnet" },
  { id: "eth",  name: "Eth Sepolia",       short: "ETH",   color: "#627EEA", rpc: "https://ethereum-sepolia.publicnode.com",                 usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", gatewayChain: "Ethereum_Sepolia" },
  { id: "base", name: "Base Sepolia",      short: "Base",  color: "#0052FF", rpc: "https://sepolia.base.org",                               usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", gatewayChain: "Base_Sepolia" },
  { id: "arb",  name: "Arb Sepolia",       short: "ARB",   color: "#12AAFF", rpc: "https://sepolia-rollup.arbitrum.io/rpc",                 usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", gatewayChain: "Arbitrum_Sepolia" },
  { id: "op",   name: "OP Sepolia",        short: "OP",    color: "#FF0420", rpc: "https://sepolia.optimism.io",                            usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7", gatewayChain: "Optimism_Sepolia" },
  { id: "poly", name: "Polygon Amoy",      short: "MATIC", color: "#8247E5", rpc: "https://rpc-amoy.polygon.technology",                    usdc: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", gatewayChain: "Polygon_Amoy_Testnet" },
  { id: "avax", name: "Avalanche Fuji",    short: "AVAX",  color: "#E84142", rpc: "https://api.avax-test.network/ext/bc/C/rpc",             usdc: "0x5425890298aed601595a70AB815c96711a31Bc65", gatewayChain: "Avalanche_Fuji" },
  { id: "uni",  name: "Unichain Sepolia",  short: "UNI",   color: "#FF007A", rpc: "https://sepolia.unichain.org",                           usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F", gatewayChain: "Unichain_Sepolia" },
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

// ── Hook: sum wallet balance across all chains in parallel ──
function useAllWalletBalance(walletAddress: string | null) {
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!walletAddress) { setTotal(0); return; }
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        CHAINS.map(async (chain) => {
          const client = createPublicClient({
            transport: http(chain.rpc, { timeout: 8_000 }),
          });
          const raw = await client.readContract({
            address:      chain.usdc as `0x${string}`,
            abi:          erc20Abi,
            functionName: "balanceOf",
            args:         [walletAddress as `0x${string}`],
          });
          return parseFloat(formatUnits(raw as bigint, 6));
        })
      );
      const sum = results.reduce((acc, r) =>
        acc + (r.status === "fulfilled" ? r.value : 0), 0
      );
      setTotal(sum);
    } catch { /* keep last value */ }
    finally { setLoading(false); }
  }, [walletAddress]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 5_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { total, loading };
}

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

type TxState = "idle" | "loading" | "done" | "error";
interface TxResult { txHash?: string; explorerUrl?: string; }
interface WithdrawPending { withdrawalBlock: number; txHash: string; explorerUrl?: string; }

// ── ChainRow — reads real balance via RPC ──────────────────
function ChainRow({
  chain, adapter, walletAddress, gatewayChains, depositChain, withdrawChain,
  onDeposit, onWithdraw,
}: {
  chain: typeof CHAINS[number];
  adapter: import("@circle-fin/adapter-viem-v2").ViemAdapter | null;
  walletAddress: string | null;
  gatewayChains: import("@/hooks/useGatewayBalance").GatewayChainBalance[];
  depositChain: string | null;
  withdrawChain: string | null;
  onDeposit: (id: string) => void;
  onWithdraw: (id: string) => void;
}) {
  const { balance, loading } = useChainUsdcBalance({
    rpc: chain.rpc, usdcAddress: chain.usdc, walletAddress,
  });

  const [depositAmt,  setDepositAmt]  = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [depState,    setDepState]    = useState<TxState>("idle");
  const [depResult,   setDepResult]   = useState<TxResult | null>(null);
  const [depErr,      setDepErr]      = useState("");
  const [withState,   setWithState]   = useState<TxState>("idle");
  const [withResult,  setWithResult]  = useState<TxResult | null>(null);
  const [withErr,     setWithErr]     = useState("");
  const [withPending, setWithPending] = useState<WithdrawPending | null>(null);

  const walletBal  = balance !== null ? parseFloat(balance.replace(/,/g, "")) : null;
  const isDepositing  = depositChain  === chain.id;
  const isWithdrawing = withdrawChain === chain.id;

  // Auto-close panels 2.5s after success
  useEffect(() => {
    if (depState !== "done") return;
    const tid = setTimeout(() => {
      onDeposit(chain.id);
      setDepState("idle"); setDepResult(null); setDepErr(""); setDepositAmt("");
    }, 2500);
    return () => clearTimeout(tid);
  }, [depState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (withState !== "done" || !withResult) return;
    const tid = setTimeout(() => {
      onWithdraw(chain.id);
      setWithState("idle"); setWithResult(null); setWithErr(""); setWithdrawAmt(""); setWithPending(null);
    }, 2500);
    return () => clearTimeout(tid);
  }, [withState, withResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gateway balance for this chain (match by chain name)
  const gwChain = gatewayChains.find(g =>
    g.chain.toLowerCase().includes(chain.id) ||
    g.chain === chain.gatewayChain
  );
  const gwBal = gwChain?.confirmed ?? 0;

  // ── Deposit ────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!adapter || !depositAmt || parseFloat(depositAmt) <= 0) return;
    setDepState("loading"); setDepErr("");
    try {
      const result = await kit.unifiedBalance.deposit({
        from: { adapter, chain: chain.gatewayChain },
        amount: depositAmt,
        token: "USDC",
      });
      setDepResult({ txHash: result.txHash, explorerUrl: (result as unknown as { explorerUrl?: string }).explorerUrl });
      setDepState("done");
      setDepositAmt("");
    } catch (e: unknown) {
      setDepErr((e as Error).message ?? "Deposit failed");
      setDepState("error");
    }
  };

  // ── Withdraw step 1: Initiate ──────────────────────────────
  const handleInitiateWithdraw = async () => {
    if (!adapter || !withdrawAmt || parseFloat(withdrawAmt) <= 0) return;
    setWithState("loading"); setWithErr("");
    try {
      const result = await kit.unifiedBalance.initiateRemoveFund({
        from: { adapter, chain: chain.gatewayChain },
        amount: withdrawAmt,
        token: "USDC",
      });
      setWithPending({ withdrawalBlock: result.withdrawalBlock, txHash: result.txHash, explorerUrl: result.explorerUrl });
      setWithState("done");
    } catch (e: unknown) {
      setWithErr((e as Error).message ?? "Withdraw initiation failed");
      setWithState("error");
    }
  };

  // ── Withdraw step 2: Complete ──────────────────────────────
  const handleCompleteWithdraw = async () => {
    if (!adapter) return;
    setWithState("loading"); setWithErr("");
    try {
      const result = await kit.unifiedBalance.removeFund({
        from: { adapter, chain: chain.gatewayChain },
        token: "USDC",
      });
      setWithResult({ txHash: result.txHash, explorerUrl: result.explorerUrl });
      setWithPending(null);
      setWithState("done");
      setWithdrawAmt("");
    } catch (e: unknown) {
      setWithErr((e as Error).message ?? "Withdraw completion failed");
      setWithState("error");
    }
  };

  const resetDeposit  = () => { setDepState("idle");  setDepResult(null);  setDepErr("");  setDepositAmt(""); };
  const resetWithdraw = () => { setWithState("idle"); setWithResult(null); setWithErr(""); setWithdrawAmt(""); setWithPending(null); };

  return (
    <div>
      <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-3">
        {/* Desktop */}
        <div className="hidden items-center gap-3 sm:flex">
          <ChainIcon id={chain.id} size={26} />
          <span className="w-14 font-mono text-sm font-medium text-cream-white">{chain.short}</span>
          <div className="flex flex-1 items-center justify-end gap-6 font-mono text-sm">
            {/* Gateway balance */}
            <span className={`w-20 text-right transition-all duration-500 ${gwBal > 0 ? "text-success" : "text-muted"}`}>
              {gwBal > 0 ? `$${gwBal.toFixed(2)}` : "—"}
            </span>
            {/* Wallet balance */}
            <span className="w-20 text-right text-cream-dim">
              {!walletAddress ? <span className="text-muted">—</span>
                : loading && balance === null ? <span className="animate-pulse text-muted">…</span>
                : walletBal !== null ? `$${walletBal.toFixed(2)}`
                : <span className="text-muted">—</span>}
            </span>
          </div>
          <div className="flex gap-1.5">
            <ActionBtn active={isDepositing}  color="red"   onClick={() => { onDeposit(chain.id); resetDeposit(); }}>Deposit</ActionBtn>
            <ActionBtn active={isWithdrawing} color="green" onClick={() => { onWithdraw(chain.id); resetWithdraw(); }}>Withdraw</ActionBtn>
          </div>
        </div>
        {/* Mobile */}
        <div className="sm:hidden">
          <div className="mb-2 flex items-center gap-2">
            <ChainIcon id={chain.id} size={22} />
            <span className="font-mono text-sm font-medium text-cream-white">{chain.name}</span>
            <div className="ml-auto flex items-center gap-3 font-mono text-sm">
              {gwBal > 0 && <span className="text-success">${gwBal.toFixed(2)}</span>}
              <span className="text-cream-dim">
                {!walletAddress ? "—" : loading && balance === null ? "…" : walletBal !== null ? `$${walletBal.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onDeposit(chain.id); resetDeposit(); }}
              className={`flex-1 rounded border py-2.5 font-mono text-xs font-medium transition-colors ${isDepositing ? "border-[#C8A87A]/50 bg-[#C8A87A]/10 text-[#C8A87A]" : "border-ink-border text-muted hover:text-cream-white"}`}>Deposit</button>
            <button onClick={() => { onWithdraw(chain.id); resetWithdraw(); }}
              className={`flex-1 rounded border py-2.5 font-mono text-xs font-medium transition-colors ${isWithdrawing ? "border-success/60 bg-success/10 text-success" : "border-ink-border text-muted hover:text-cream-white"}`}>Withdraw</button>
          </div>
        </div>
      </div>

      {/* ── Deposit panel ── */}
      {isDepositing && (
        <div className="mx-2 rounded-b-card border border-t-0 border-[#C8A87A]/20 bg-ink-surface2 p-3">
          <button
            onClick={() => onDeposit(chain.id)}
            className="float-right -mt-0.5 -mr-0.5 flex h-5 w-5 items-center justify-center rounded text-muted hover:text-cream-white transition-colors"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {!adapter ? (
            <p className="font-mono text-xs text-muted">Connect your wallet to deposit</p>
          ) : depState === "done" && depResult ? (
            <div className="space-y-1.5">
              <p className="font-mono text-xs text-success">✓ Deposit successful</p>
              {depResult.txHash && (
                <a href={depResult.explorerUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="block font-mono text-[10px] text-success/70 hover:text-success">
                  {depResult.txHash.slice(0,10)}...{depResult.txHash.slice(-6)} ↗
                </a>
              )}
              <button onClick={resetDeposit} className="mt-1 font-mono text-[10px] text-muted hover:text-cream-white">New deposit</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                  placeholder="Amount" disabled={depState === "loading"}
                  className="min-w-0 flex-1 rounded border border-ink-border2 bg-black px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:outline-none disabled:opacity-50" />
                <span className="flex-shrink-0 font-mono text-xs text-muted">USDC</span>
                <button onClick={handleDeposit} disabled={depState === "loading" || !depositAmt || parseFloat(depositAmt) <= 0}
                  className="flex-shrink-0 rounded-lg bg-red-primary px-4 py-2.5 font-mono text-xs text-white transition-colors hover:bg-red-dim disabled:cursor-not-allowed disabled:opacity-50">
                  {depState === "loading" ? "…" : "Deposit"}
                </button>
              </div>
              {depErr && <p className="mt-1 font-mono text-[10px] text-red-primary">{depErr}</p>}
            </>
          )}
          <p className="mt-2 font-mono text-[10px] text-muted">Moves USDC from {chain.name} → Unified Balance</p>
        </div>
      )}

      {/* ── Withdraw panel ── */}
      {isWithdrawing && (
        <div className="mx-2 rounded-b-card border border-t-0 border-success/30 bg-success/5 p-3">
          <button
            onClick={() => onWithdraw(chain.id)}
            className="float-right -mt-0.5 -mr-0.5 flex h-5 w-5 items-center justify-center rounded text-muted hover:text-cream-white transition-colors"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {!adapter ? (
            <p className="font-mono text-xs text-muted">Connect your wallet to withdraw</p>
          ) : withState === "done" && withResult ? (
            <div className="space-y-1.5">
              <p className="font-mono text-xs text-success">✓ Withdraw complete</p>
              {withResult.txHash && (
                <a href={withResult.explorerUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="block font-mono text-[10px] text-success/70 hover:text-success">
                  {withResult.txHash.slice(0,10)}...{withResult.txHash.slice(-6)} ↗
                </a>
              )}
              <button onClick={resetWithdraw} className="mt-1 font-mono text-[10px] text-muted hover:text-cream-white">New withdrawal</button>
            </div>
          ) : withPending ? (
            <WithdrawStep2Panel
              pending={withPending}
              rpc={chain.rpc}
              loading={withState === "loading"}
              err={withErr}
              onComplete={handleCompleteWithdraw}
              onDismiss={() => { onWithdraw(chain.id); setWithState("idle"); setWithPending(null); setWithErr(""); setWithdrawAmt(""); }}
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input type="number" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                  placeholder="Amount" disabled={withState === "loading"}
                  className="min-w-0 flex-1 rounded border border-success/30 bg-black px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:outline-none disabled:opacity-50" />
                <span className="flex-shrink-0 font-mono text-xs text-muted">USDC</span>
                <button onClick={handleInitiateWithdraw} disabled={withState === "loading" || !withdrawAmt || parseFloat(withdrawAmt) <= 0}
                  className="flex-shrink-0 rounded-lg bg-success px-4 py-2.5 font-mono text-xs text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                  {withState === "loading" ? "…" : "Initiate"}
                </button>
              </div>
              {withErr && <p className="mt-1 font-mono text-[10px] text-red-primary">{withErr}</p>}
              <p className="mt-2 font-mono text-[10px] text-muted">2-step: Initiate → wait → Complete. Pulls USDC → {chain.name}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Animated number counter ────────────────────────────────
function AnimatedNumber({ value, prefix = "$" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const diff  = value - start;
    const dur   = 600;
    const begin = performance.now();
    const step  = (now: number) => {
      const t = Math.min((now - begin) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(start + diff * ease);
      if (t < 1) requestAnimationFrame(step);
      else { setDisplay(value); prev.current = value; }
    };
    requestAnimationFrame(step);
  }, [value]);

  return <>{prefix}{display.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}

// ── Main Dashboard ─────────────────────────────────────────
export default function BalanceDashboard() {
  const { address, adapter, isConnected, chainId, switchToArc } = useWallet();
  const onArc = chainId === ARC_CHAIN_ID;

  const [depositChain,  setDepositChain]  = useState<string | null>(null);
  const [withdrawChain, setWithdrawChain] = useState<string | null>(null);

  const handleDeposit  = (id: string) => { setDepositChain(depositChain  === id ? null : id); setWithdrawChain(null); };
  const handleWithdraw = (id: string) => { setWithdrawChain(withdrawChain === id ? null : id); setDepositChain(null); };

  // Gateway balance (Circle API)
  const { data: gateway, loading: gwLoading } = useGatewayBalance(
    isConnected ? address : null,
    isConnected ? adapter : null,
  );
  const gwTotal   = gateway?.totalConfirmed ?? 0;
  const gwPending = gateway?.totalPending   ?? 0;

  // Total wallet balance across all chains
  const { total: walletTotal, loading: walletLoading } = useAllWalletBalance(
    isConnected ? address : null,
  );

  const grandTotal = walletTotal + gwTotal;
  const isLoading  = (gwLoading || walletLoading) && grandTotal === 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">

      {/* ══ HERO — Total Unified Balance ═══════════════════════ */}
      <div className="overflow-hidden rounded-card2 border border-ink-border bg-ink-surface shadow-card">
        {/* Rainbow top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-primary via-yellow-400 to-success" />

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          {/* Label */}
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-muted">{"// TOTAL UNIFIED BALANCE"}</span>
            {isConnected && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="font-mono text-[9px] text-success">LIVE</span>
              </span>
            )}
          </div>

          {/* Big number */}
          <div className="font-mono text-4xl font-bold text-cream-white sm:text-5xl">
            {!isConnected ? (
              <span className="text-muted">$—</span>
            ) : isLoading ? (
              <span className="animate-pulse text-muted">$—</span>
            ) : (
              <AnimatedNumber value={grandTotal} />
            )}
            <span className="ml-2 text-base font-normal text-cream-dim">USDC</span>
          </div>

          {gwPending > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
              <span className="font-mono text-[10px] text-yellow-400">
                +${gwPending.toFixed(2)} pending in gateway
              </span>
            </div>
          )}

          {/* Breakdown: Wallets vs Gateway */}
          {isConnected && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-border pt-4">
              {/* Wallet total */}
              <div className="flex items-center gap-2 rounded-card border border-ink-border2 bg-ink-surface2 px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="5" width="16" height="12" rx="2" stroke="#8A7E6A" strokeWidth="1.5"/>
                  <path d="M14 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="#8A7E6A"/>
                  <path d="M2 8h16" stroke="#8A7E6A" strokeWidth="1.5"/>
                </svg>
                <div>
                  <p className="font-mono text-[9px] text-muted">Wallets</p>
                  <p className="font-mono text-xs font-medium text-cream-white">
                    {walletLoading && walletTotal === 0
                      ? <span className="animate-pulse text-muted">—</span>
                      : `$${walletTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  </p>
                </div>
              </div>

              <span className="font-mono text-xs text-muted">+</span>

              {/* Gateway total */}
              <div className="flex items-center gap-2 rounded-card border border-ink-border2 bg-ink-surface2 px-3 py-2">
                <CircleLogo size={14} />
                <div>
                  <p className="font-mono text-[9px] text-muted">Circle Gateway</p>
                  <p className="font-mono text-xs font-medium text-cream-white">
                    {gwLoading && gwTotal === 0
                      ? <span className="animate-pulse text-muted">—</span>
                      : `$${gwTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  </p>
                </div>
              </div>

              <span className="ml-auto font-mono text-[10px] text-muted">8 chains</span>
            </div>
          )}

          {!isConnected && (
            <p className="mt-3 font-mono text-[11px] text-muted">Connect wallet to view your unified balance</p>
          )}
        </div>
      </div>

      {/* ══ HOW IT WORKS — compact horizontal ══════════════════ */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-muted mr-2">{"// HOW IT WORKS"}</span>
          {[
            { step: "01", label: "Deposit",   desc: "Wallet → Gateway" },
            { step: "02", label: "Aggregate", desc: "Pooled cross-chain" },
            { step: "03", label: "Spend",     desc: "Any chain" },
            { step: "04", label: "Withdraw",  desc: "Back to wallet" },
          ].map(({ step, label, desc }, i) => (
            <div key={step} className="flex items-center gap-1.5">
              {i > 0 && <span className="font-mono text-[10px] text-ink-border2">→</span>}
              <div className="flex items-center gap-1.5 rounded border border-ink-border2 bg-ink-surface2 px-2.5 py-1.5">
                <span className="font-mono text-[9px] text-red-primary">{step}</span>
                <span className="font-mono text-[11px] font-medium text-cream-white">{label}</span>
                <span className="hidden font-mono text-[9px] text-muted sm:inline">· {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ PER-CHAIN BREAKDOWN ════════════════════════════════ */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-4 shadow-card sm:p-5">
        {/* Section title */}
        <div className="mb-1 flex items-center">
          <span className="font-mono text-xs tracking-widest text-muted">{"// PER-CHAIN"}</span>
        </div>

        {!isConnected ? (
          <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-6 text-center">
            <p className="font-mono text-xs text-muted">Connect wallet to view balances</p>
          </div>
        ) : (
          <>
            {!onArc && (
              <div className="mb-3 rounded-card border border-yellow-500/30 bg-yellow-500/5 p-3">
                <p className="font-mono text-xs text-yellow-400">Switch to Arc Testnet to use Deposit / Withdraw</p>
                <button onClick={switchToArc}
                  className="mt-2 w-full rounded border border-yellow-500/40 py-2 font-mono text-xs text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                  Switch to Arc Testnet
                </button>
              </div>
            )}
            <div className="space-y-2">
              {/* Column header — px-3 matches ChainRow's internal card padding */}
              <div className="hidden items-center gap-3 px-3 pb-0.5 sm:flex">
                <div className="w-[26px] flex-shrink-0" />
                <span className="w-14" />
                <div className="flex flex-1 items-center justify-end gap-6 font-mono text-[10px] text-muted">
                  <span className="flex w-20 items-center justify-end gap-1">
                    <CircleLogo size={9} /> Gateway
                  </span>
                  <span className="w-20 text-right">Wallet</span>
                </div>
                {/* Invisible ghost buttons — exact same size as real buttons for alignment */}
                <div className="invisible flex gap-1.5" aria-hidden="true">
                  <span className="rounded border px-2.5 py-1 font-mono text-[11px]">Deposit</span>
                  <span className="rounded border px-2.5 py-1 font-mono text-[11px]">Withdraw</span>
                </div>
              </div>

              {CHAINS.map((chain, i) => (
                <div key={chain.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}>
                  <ChainRow
                    chain={chain}
                    adapter={adapter}
                    walletAddress={address}
                    gatewayChains={gateway?.chains ?? []}
                    depositChain={depositChain}
                    withdrawChain={withdrawChain}
                    onDeposit={handleDeposit}
                    onWithdraw={handleWithdraw}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Withdraw Step 2 Panel — polls block until ready ────────
function WithdrawStep2Panel({
  pending, rpc, loading, err, onComplete, onDismiss,
}: {
  pending: { withdrawalBlock: number; txHash: string; explorerUrl?: string };
  rpc: string;
  loading: boolean;
  err: string;
  onComplete: () => void;
  onDismiss: () => void;
}) {
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const client = createPublicClient({ transport: http(rpc, { timeout: 8_000 }) });
        const block  = await client.getBlockNumber();
        if (active) setCurrentBlock(Number(block));
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 4_000);
    return () => { active = false; clearInterval(id); };
  }, [rpc]);

  const ready       = currentBlock !== null && currentBlock >= pending.withdrawalBlock;
  const blocksLeft  = currentBlock !== null ? Math.max(0, pending.withdrawalBlock - currentBlock) : null;

  return (
    <div className="space-y-2">
      {/* Step 1 tx link */}
      {pending.txHash && (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-success">✓ Step 1</span>
          <a href={pending.explorerUrl ?? "#"} target="_blank" rel="noopener noreferrer"
            className="font-mono text-[10px] text-success/70 hover:text-success">
            {pending.txHash.slice(0,10)}...{pending.txHash.slice(-6)} ↗
          </a>
        </div>
      )}

      {/* Block status */}
      {!ready ? (
        <div className="flex items-center gap-2 rounded border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
          <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0 text-yellow-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-yellow-400">
              Waiting for block {pending.withdrawalBlock.toLocaleString()}
            </p>
            <p className="font-mono text-[9px] text-muted">
              {currentBlock !== null
                ? `Current: ${currentBlock.toLocaleString()} · ${blocksLeft} block${blocksLeft === 1 ? "" : "s"} remaining`
                : "Checking block height…"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded border border-success/30 bg-success/5 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <p className="font-mono text-[11px] text-success">Ready to complete withdrawal</p>
        </div>
      )}

      {/* Complete button */}
      <button
        onClick={onComplete}
        disabled={loading || !ready}
        className="w-full rounded-lg bg-success px-4 py-2 font-mono text-xs text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Completing…
          </span>
        ) : ready ? "Complete Withdraw (Step 2)" : "Waiting for network…"}
      </button>

      {err && <p className="font-mono text-[10px] text-red-primary">{err}</p>}

      {/* Dismiss — funds already arrived */}
      <button
        onClick={onDismiss}
        className="w-full text-center font-mono text-[10px] text-muted hover:text-cream-white transition-colors pt-1"
      >
        Funds already arrived? · Close this panel
      </button>
    </div>
  );
}

// ── Circle logo — SVG inline, zero file dependency ────────
function CircleLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1652F0" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="white" strokeWidth="2.5" />
    </svg>
  );
}

function ActionBtn({ active, onClick, children }: {
  active: boolean; color?: "red" | "green"; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
        active
          ? "border-[#C8A87A]/50 bg-[#C8A87A]/10 text-[#C8A87A]"
          : "border-ink-border text-muted hover:text-cream-white"
      }`}>
      {children}
    </button>
  );
}
