"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";
import { useArcTokenBalance } from "@/hooks/useTokenBalance";
import { kit, CIRCLE_API_KEY } from "@/lib/kit";
import { ARC_CHAIN_ID } from "@/lib/chains";

// ── Tokens ────────────────────────────────────────────────
const TOKENS = [
  { symbol: "USDC",   name: "USD Coin",          dotClass: "bg-blue-400"   },
  { symbol: "EURC",   name: "Euro Coin",          dotClass: "bg-green-500"  },
  { symbol: "USYC",   name: "US Yield Coin",      dotClass: "bg-purple-500" },
  { symbol: "cirBTC", name: "Circle Wrapped BTC", dotClass: "bg-orange-400" },
] as const;
type TokenSymbol = (typeof TOKENS)[number]["symbol"];

// BTC ≈ 100,000 USDC (testnet reference rate)
const MOCK_RATES: Record<string, Record<string, number>> = {
  USDC:   { EURC: 0.9234,    USYC: 0.9981,    USDC: 1,       cirBTC: 0.00001      },
  EURC:   { USDC: 1.0829,    USYC: 1.0810,    EURC: 1,       cirBTC: 0.0000108    },
  USYC:   { USDC: 1.0019,    EURC: 0.9252,    USYC: 1,       cirBTC: 0.00001002   },
  cirBTC: { USDC: 100_000,   EURC: 92_340,    USYC: 99_810,  cirBTC: 1            },
};

const SLIPPAGE_OPTIONS = ["0.1", "0.5", "1.0"] as const;

type SwapStatus = "idle" | "swapping" | "success" | "error";

// ─────────────────────────────────────────────────────────
export default function SwapCard() {
  const { address, adapter, chainId, isConnected, switchToArc } = useWallet();

  const [fromToken, setFromToken] = useState<TokenSymbol>("USDC");
  const [toToken,   setToToken]   = useState<TokenSymbol>("EURC");

  const { balance: fromBalance, loading: fromBalanceLoading, refresh: refreshBalance } = useArcTokenBalance(address, fromToken);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage,  setSlippage]  = useState("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [showCustomSlippage, setShowCustomSlippage] = useState(false);
  const [destAddress, setDestAddress] = useState("");
  const [showDest,    setShowDest]    = useState(false);
  const [fromSelector, setFromSelector] = useState(false);
  const [toSelector,   setToSelector]   = useState(false);

  const [status,  setStatus]  = useState<SwapStatus>("idle");
  const [txHash,  setTxHash]  = useState("");
  const [errMsg,  setErrMsg]  = useState("");

  const activeSlippage = showCustomSlippage ? customSlippage : slippage;
  const rate = MOCK_RATES[fromToken][toToken];
  const outDecimals = toToken === "cirBTC" ? 8 : 4;
  const toAmount  = fromAmount ? (parseFloat(fromAmount) * rate).toFixed(outDecimals) : "";
  const minReceived = toAmount
    ? (parseFloat(toAmount) * (1 - parseFloat(activeSlippage || "0.5") / 100)).toFixed(outDecimals)
    : "—";

  const onArc = chainId === ARC_CHAIN_ID;

  const setQuickAmount = useCallback(
    (pct: number) => {
      const bal = parseFloat(fromBalance ?? "0") || 0;
      const decimals = fromToken === "cirBTC" ? 8 : 6;
      setFromAmount(pct === 100 ? bal.toFixed(decimals) : ((bal * pct) / 100).toFixed(decimals));
    },
    [fromBalance, fromToken]
  );

  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  };

  // ── Swap ──────────────────────────────────────────────
  const handleSwap = async () => {
    if (!adapter) return;
    setStatus("swapping");
    setErrMsg("");
    setTxHash("");

    // Proxy Circle API calls through Next.js server to avoid CORS
    const origFetch = window.fetch;
    window.fetch = (input, init?) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith("https://api.circle.com")) {
        const proxied = url.replace("https://api.circle.com", "/api/circle-proxy");
        return origFetch(proxied, init);
      }
      return origFetch(input, init);
    };

    try {
      const swapConfig: Record<string, unknown> = {
        slippageBps: Math.round(parseFloat(activeSlippage || "0.5") * 100),
      };
      // Only pass kitKey if it has the correct KIT_KEY: format
      if (CIRCLE_API_KEY?.startsWith("KIT_KEY:")) {
        swapConfig.kitKey = CIRCLE_API_KEY;
      }

      const result = await kit.swap({
        from: { adapter, chain: "Arc_Testnet" },
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: fromAmount,
        config: swapConfig as Parameters<typeof kit.swap>[0]["config"],
      });
      setTxHash(result.txHash);
      setStatus("success");
      refreshBalance();
    } catch (e: unknown) {
      setErrMsg((e as Error).message ?? "Swap failed");
      setStatus("error");
    } finally {
      // Restore original fetch
      window.fetch = origFetch;
    }
  };

  const reset = () => {
    setStatus("idle");
    setTxHash("");
    setErrMsg("");
    setFromAmount("");
  };

  const canSwap = isConnected && onArc && fromToken !== toToken && !!fromAmount && parseFloat(fromAmount) > 0;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-5 shadow-card">

        {/* ── Success state ──────────────────────────────── */}
        {status === "success" && (
          <div className="mb-4 rounded-card border border-success/40 bg-success/5 p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-success">✓</span>
              <span className="font-mono text-sm text-success">Swap complete</span>
            </div>
            <p className="mb-3 font-mono text-xs text-muted">
              Swapped {fromAmount} {fromToken} → {toAmount} {toToken} on Arc Testnet
            </p>
            {txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-red-primary hover:underline"
              >
                View on ArcScan →
              </a>
            )}
            <button onClick={reset} className="mt-3 block w-full rounded border border-ink-border py-2 font-mono text-xs text-muted hover:text-cream-white transition-colors">
              New swap
            </button>
          </div>
        )}

        {/* ── Swapping loader ────────────────────────────── */}
        {status === "swapping" && (
          <div className="mb-4 rounded-card border border-yellow-400/30 bg-yellow-400/5 p-3">
            <div className="flex items-center gap-2.5">
              <svg className="animate-spin h-4 w-4 flex-shrink-0 text-yellow-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <p className="font-mono text-xs text-yellow-400">
                Swapping {fromAmount} {fromToken} → {toToken}…
              </p>
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-muted">Confirm in your wallet if prompted</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────── */}
        {status === "error" && (
          <div className="mb-4 rounded-card border border-red-primary/30 bg-red-bg p-3">
            <p className="font-mono text-xs text-red-primary">{errMsg}</p>
            <button onClick={() => setStatus("idle")} className="mt-2 font-mono text-[11px] text-muted hover:text-cream-white transition-colors">
              Try again
            </button>
          </div>
        )}

        {status !== "success" && (
          <>
            {/* ── FROM ──────────────────────────────────── */}
            <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted">FROM</span>
                {fromBalance !== null ? (
                  <button
                    className="font-mono text-[11px] text-muted hover:text-cream-white transition-colors"
                    onClick={() => setFromAmount(fromBalance)}
                  >
                    {fromBalanceLoading ? "Loading…" : `Balance: ${parseFloat(fromBalance).toLocaleString(undefined, { maximumFractionDigits: fromToken === "cirBTC" ? 8 : 4 })} ${fromToken}`}
                  </button>
                ) : (
                  <span className="font-mono text-[11px] text-muted">Balance: —</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { setFromSelector(!fromSelector); setToSelector(false); }}
                    className="flex items-center gap-2 rounded-lg border border-ink-border2 bg-black px-3 py-2 font-mono text-sm font-medium text-white hover:border-red-primary/40 transition-colors"
                  >
                    <TokenIcon symbol={fromToken} size={20} />
                    {fromToken}
                    <ChevronIcon />
                  </button>
                  {fromSelector && (
                    <TokenDropdown
                      current={fromToken}
                      onSelect={(t) => {
                        if (t === toToken) {
                          // Auto-swap tokens
                          setFromToken(toToken);
                          setToToken(fromToken);
                          setFromAmount(toAmount);
                        } else {
                          setFromToken(t);
                        }
                        setFromSelector(false);
                      }}
                    />
                  )}
                </div>
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={status === "swapping"}
                  className="min-w-0 flex-1 bg-transparent font-mono text-2xl text-cream-white placeholder:text-ink-border2 focus:outline-none text-right disabled:opacity-50"
                />
              </div>
              <div className="mt-3 flex gap-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setQuickAmount(pct)}
                    disabled={status === "swapping"}
                    className="flex-1 rounded border border-ink-border2 py-1 font-mono text-[11px] text-muted hover:border-red-primary/40 hover:text-cream-white transition-colors disabled:opacity-40"
                  >
                    {pct === 100 ? "MAX" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Swap arrow ────────────────────────────── */}
            <div className="my-2 flex justify-center">
              <button
                onClick={flipTokens}
                disabled={status === "swapping"}
                className="rounded-full border border-ink-border2 bg-ink-surface2 p-2 text-muted hover:border-red-primary/40 hover:text-red-primary transition-all hover:rotate-180 duration-300 disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M4 10l4 4 4-4M12 6L8 2 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* ── TO ────────────────────────────────────── */}
            <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted">TO</span>
                <span className="font-mono text-[11px] text-muted">Estimated output</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { setToSelector(!toSelector); setFromSelector(false); }}
                    className="flex items-center gap-2 rounded-lg border border-ink-border2 bg-black px-3 py-2 font-mono text-sm font-medium text-white hover:border-red-primary/40 transition-colors"
                  >
                    <TokenIcon symbol={toToken} size={20} />
                    {toToken}
                    <ChevronIcon />
                  </button>
                  {toSelector && (
                    <TokenDropdown
                      current={toToken}
                      exclude={fromToken}
                      onSelect={(t) => { setToToken(t); setToSelector(false); }}
                    />
                  )}
                </div>
                <div className="flex-1 text-right font-mono text-2xl text-cream-white/60">
                  {toAmount || "0.00"}
                </div>
              </div>
            </div>

            {/* ── Slippage ──────────────────────────────── */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] text-muted">SLIPPAGE</span>
                <span className="font-mono text-[11px] text-red-primary">{activeSlippage || "0.5"}%</span>
              </div>
              <div className="flex gap-1.5">
                {SLIPPAGE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSlippage(s); setShowCustomSlippage(false); }}
                    className={`flex-1 rounded border py-1.5 font-mono text-xs transition-colors ${
                      slippage === s && !showCustomSlippage
                        ? "border-red-primary bg-red-bg text-red-primary"
                        : "border-ink-border2 text-muted hover:text-cream-white"
                    }`}
                  >
                    {s}%
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomSlippage(!showCustomSlippage)}
                  className={`flex-1 rounded border py-1.5 font-mono text-xs transition-colors ${
                    showCustomSlippage
                      ? "border-red-primary bg-red-bg text-red-primary"
                      : "border-ink-border2 text-muted hover:text-cream-white"
                  }`}
                >
                  Custom
                </button>
              </div>
              {showCustomSlippage && (
                <div className="mt-2 flex items-center gap-2 rounded border border-ink-border2 bg-ink-surface2 px-3 py-2">
                  <input type="number" value={customSlippage} onChange={(e) => setCustomSlippage(e.target.value)} placeholder="0.00" className="flex-1 bg-transparent font-mono text-sm text-cream-white placeholder:text-muted focus:outline-none" />
                  <span className="font-mono text-sm text-muted">%</span>
                </div>
              )}
            </div>

            {/* ── Price info ────────────────────────────── */}
            {fromAmount && parseFloat(fromAmount) > 0 && (
              <div className="mt-4 space-y-1.5 rounded-card border border-ink-border bg-ink-DEFAULT p-3">
                <InfoRow label="Rate"         value={`1 ${fromToken} ≈ ${rate.toFixed(4)} ${toToken}`} />
                <InfoRow label="Slippage"     value={`${activeSlippage || "0.5"}%`} />
                <InfoRow label="Network fee"  value="0.001 USDC" />
                <InfoRow label="Min received" value={`${minReceived} ${toToken}`} highlight />
              </div>
            )}

            {/* ── Destination (optional) ────────────────── */}
            <div className="mt-3">
              <button
                onClick={() => setShowDest(!showDest)}
                className="flex items-center gap-1.5 font-mono text-[11px] text-muted hover:text-cream-white transition-colors"
              >
                <span className={`transition-transform duration-200 ${showDest ? "rotate-90" : ""}`}>▶</span>
                Send to a different address (optional)
              </button>
              {showDest && (
                <input
                  type="text"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="0x..."
                  className="mt-2 w-full rounded border border-ink-border2 bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none"
                />
              )}
            </div>

            {/* ── Action button ─────────────────────────── */}
            {!isConnected ? (
              <div className="mt-4 rounded-lg border border-ink-border2 bg-ink-surface2 py-3.5 text-center font-body text-sm text-muted">
                Connect wallet to swap
              </div>
            ) : !onArc ? (
              <button
                onClick={switchToArc}
                className="mt-4 w-full rounded-lg border border-red-primary bg-red-bg py-3.5 font-body text-base font-medium text-red-primary hover:bg-red-primary hover:text-white transition-colors"
              >
                Switch to Arc Testnet
              </button>
            ) : (
              <button
                disabled={!canSwap || status === "swapping"}
                onClick={handleSwap}
                className={`mt-4 w-full rounded-lg py-3.5 font-body text-base font-medium transition-all ${
                  canSwap && status !== "swapping"
                    ? "bg-red-primary text-white hover:bg-red-dim"
                    : "cursor-not-allowed bg-ink-border2 text-muted"
                }`}
              >
                {status === "swapping"
                  ? "Swapping..."
                  : !fromAmount || parseFloat(fromAmount) === 0
                  ? "Enter an amount"
                  : fromToken === toToken
                  ? "Select different tokens"
                  : `Swap ${fromToken} → ${toToken}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function TokenIcon({ symbol, size = 20 }: { symbol: TokenSymbol; size?: number }) {
  if (symbol === "USDC") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
      <path d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.232-2.196-.696-2.196-1.516 0-.82.616-1.348 1.848-1.348 1.108 0 1.724.368 2.032 1.28a.422.422 0 00.4.28h.912a.41.41 0 00.412-.412v-.048a3.124 3.124 0 00-2.804-2.56V9.56a.414.414 0 00-.412-.412h-.864a.414.414 0 00-.412.412v1.064c-1.7.232-2.78 1.348-2.78 2.772 0 2.016 1.232 2.78 3.792 3.084 1.7.308 2.244.696 2.244 1.624 0 .928-.82 1.564-1.94 1.564-1.524 0-2.064-.644-2.244-1.568a.414.414 0 00-.4-.308h-.96a.414.414 0 00-.412.412v.048c.232 1.7 1.38 2.9 3.024 3.196v1.08c0 .228.184.412.412.412h.864c.228 0 .412-.184.412-.412v-1.064c1.7-.244 2.868-1.42 2.868-2.94z" fill="white"/>
      <path d="M13.14 21.724c-3.668-1.316-5.544-5.404-4.192-9.06a6.943 6.943 0 014.192-4.192.414.414 0 00.28-.392v-.784a.414.414 0 00-.52-.4C8.732 8.292 6.2 12.86 7.596 17.428a8.743 8.743 0 005.504 5.504.414.414 0 00.52-.4v-.784a.39.39 0 00-.48-.024zM18.86 7.104a.414.414 0 00-.52.4v.784c0 .172.108.328.28.392 3.668 1.316 5.544 5.404 4.192 9.06a6.943 6.943 0 01-4.192 4.192.414.414 0 00-.28.392v.784a.414.414 0 00.52.4c4.168-.896 6.7-5.464 5.304-10.032a8.743 8.743 0 00-5.304-4.372z" fill="white"/>
    </svg>
  );
  if (symbol === "EURC") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
      <path d="M20.5 10.5C18.8 9.2 16.7 8.8 14.8 9.4c-2.6.8-4.5 3.2-4.8 5.9H9v1.4h1c0 .3 0 .5.1.8H9v1.4h1.2c.6 2.5 2.5 4.5 5 5.1 1.8.4 3.7 0 5.2-1.1l-1-1.4c-1.1.8-2.5 1.1-3.9.8-1.6-.4-2.9-1.6-3.5-3.4H18v-1.4h-5.3c0-.3-.1-.5-.1-.8H18v-1.4h-5.1c.3-1.9 1.6-3.5 3.3-4 1.4-.4 2.9-.1 4 .8l1.3-1.1z" fill="white"/>
    </svg>
  );
  if (symbol === "cirBTC") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-.9-.2.7-2.7-1.7-.4-.7 2.7-2.2-.5-.4 1.8 1.2.3c.7.2.8.6.8.9l-1.9 7.5c-.1.3-.4.7-1 .6l-1.2-.3-.5 1.9 2.1.5-.7 2.8 1.7.4.7-2.8.9.2-.7 2.8 1.7.4.7-2.8c2.8.5 4.9.3 5.8-2.2.7-2-.1-3.2-1.5-3.9 1-.3 1.8-1 2-2.7zm-3.5 5c-.5 2-3.9.9-5 .7l.9-3.5c1.1.3 4.6.8 4.1 2.8zm.5-5c-.5 1.8-3.3.9-4.3.7l.8-3.2c1 .2 4.1.7 3.5 2.5z" fill="white"/>
    </svg>
  );
  // USYC
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#6B5FD8"/>
      <path d="M16 7l5.5 9.5L16 25l-5.5-8.5L16 7z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="16" cy="16" r="3" fill="white"/>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TokenDropdown({ current, exclude, onSelect }: { current: TokenSymbol; exclude?: TokenSymbol; onSelect: (t: TokenSymbol) => void }) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-card border border-ink-border2 bg-ink-surface shadow-xl">
      {TOKENS.filter((t) => !exclude || t.symbol !== exclude).map((t) => (
        <button
          key={t.symbol}
          onClick={() => onSelect(t.symbol as TokenSymbol)}
          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-ink-surface2 ${
            t.symbol === current ? "bg-ink-surface2" : ""
          }`}
        >
          <TokenIcon symbol={t.symbol as TokenSymbol} size={24} />
          <div>
            <div className={`font-mono text-sm font-medium ${t.symbol === current ? "text-red-primary" : "text-cream-white"}`}>
              {t.symbol}
            </div>
            <div className="font-body text-[10px] text-muted">{t.name}</div>
          </div>
          {t.symbol === current && (
            <span className="ml-auto font-mono text-[10px] text-red-primary">✓</span>
          )}
        </button>
      ))}
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
