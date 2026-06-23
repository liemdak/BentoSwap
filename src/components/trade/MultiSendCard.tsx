"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useArcUsdcBalance } from "@/hooks/useTokenBalance";
import { kit } from "@/lib/kit";
import { ARC_CHAIN_ID } from "@/lib/chains";
import { sendWithMemo, isMemoSupportedToken } from "@/lib/memo";

const TOKENS = ["USDC", "EURC", "USYC"] as const;
type TokenSymbol = (typeof TOKENS)[number];

interface Recipient {
  id: number;
  address: string;
  amount: string;
  token: TokenSymbol;
  memo: string;       // optional Arc transaction memo (invoice id, note, …)
  showMemo: boolean;  // UI: memo input expanded
}

interface SendResult {
  id: number;
  status: "ok" | "fail";
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

const NETWORK_FEE_PER_TX = 0.001; // USDC per tx (estimate)

let nextId = 1;

export default function MultiSendCard() {
  const { address, adapter, rawProvider, chainId, isConnected, switchToArc } = useWallet();
  const { balance, refresh: refreshBalance } = useArcUsdcBalance(address);

  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: nextId++, address: "", amount: "", token: "USDC", memo: "", showMemo: false },
  ]);
  const [sending,  setSending]  = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [results,  setResults]  = useState<SendResult[]>([]);

  const onArc = chainId === ARC_CHAIN_ID;

  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const totalFee    = recipients.length * NETWORK_FEE_PER_TX;
  // A memo on a token that doesn't support memos (e.g. USYC) is invalid.
  const hasBadMemo = (r: Recipient) => !!r.memo.trim() && !isMemoSupportedToken(r.token);
  const validRecipients = recipients.filter(
    (r) => r.address.startsWith("0x") && r.address.length === 42 && r.amount && parseFloat(r.amount) > 0 && !hasBadMemo(r)
  );
  const validCount = validRecipients.length;
  const memoCount  = validRecipients.filter((r) => r.memo.trim()).length;

  const addRecipient = () => {
    if (recipients.length >= 20) return;
    setRecipients((prev) => [...prev, { id: nextId++, address: "", amount: "", token: "USDC", memo: "", showMemo: false }]);
  };

  const removeRecipient = (id: number) => {
    if (recipients.length === 1) return;
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRecipient = (id: number, field: "address" | "amount" | "token" | "memo", value: string) => {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const toggleMemo = (id: number) => {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, showMemo: !r.showMemo } : r)));
  };

  // ── Send loop: memo recipients route through the Memo contract ──
  const handleSend = async () => {
    if (!adapter || validCount === 0) return;

    setSending(true);
    setProgress(0);
    setResults([]);

    const provider = rawProvider as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } | null;

    for (let i = 0; i < validRecipients.length; i++) {
      const r = validRecipients[i];
      setProgress(i);

      try {
        const useMemo = !!r.memo.trim();
        let result: { txHash?: string; explorerUrl?: string };

        if (useMemo) {
          if (!provider || !address) throw new Error("Wallet provider unavailable for memo send");
          result = await sendWithMemo({
            provider,
            from: address,
            token: r.token,
            to: r.address,
            amount: r.amount,
            memo: r.memo.trim(),
          });
        } else {
          result = await kit.send({
            from: { adapter, chain: "Arc_Testnet" },
            to: r.address,
            amount: r.amount,
            token: r.token,
          });
        }

        setResults((prev) => [
          ...prev,
          {
            id: r.id,
            status: "ok",
            txHash: result.txHash,
            explorerUrl: result.explorerUrl ?? `https://testnet.arcscan.app/tx/${result.txHash}`,
          },
        ]);
      } catch (e: unknown) {
        setResults((prev) => [
          ...prev,
          {
            id: r.id,
            status: "fail",
            error: (e as Error).message ?? "Transaction failed",
          },
        ]);
        // Continue with remaining recipients even if one fails
      }
    }

    setProgress(null);
    setSending(false);
    refreshBalance();
  };

  const isComplete = results.length > 0 && progress === null;
  const successCount = results.filter((r) => r.status === "ok").length;
  const failCount    = results.filter((r) => r.status === "fail").length;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-5">

        {/* ── Header ────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-xs tracking-widest text-red-primary">
              {"// MULTI-SEND"}
            </span>
            <p className="mt-0.5 font-body text-xs text-muted">
              Send to up to 20 addresses in one flow
            </p>
          </div>
          <span className="rounded-full border border-ink-border2 bg-ink-surface2 px-3 py-1 font-mono text-xs text-cream-dim">
            {recipients.length} / 20
          </span>
        </div>

        {/* ── Wallet balance ────────────────────────────── */}
        {isConnected && onArc && (
          <div className="mb-3 flex items-center justify-between rounded-card border border-ink-border bg-black px-3 py-2">
            <span className="font-mono text-[11px] text-muted">Wallet balance</span>
            <span className="font-mono text-[11px] text-cream-white">
              {parseFloat(balance).toLocaleString()} USDC
            </span>
          </div>
        )}

        {/* ── Recipient rows ────────────────────────────── */}
        <div className="space-y-2">
          {recipients.map((r, idx) => {
            const result = results.find((res) => res.id === r.id);
            const isCurrent = sending && progress === idx;

            return (
              <div
                key={r.id}
                className={`rounded-card border p-3 transition-colors ${
                  result?.status === "ok"
                    ? "border-success/40 bg-success/5"
                    : result?.status === "fail"
                    ? "border-red-primary/40 bg-red-bg"
                    : isCurrent
                    ? "border-red-primary/40 bg-red-bg"
                    : "border-ink-border2 bg-ink-surface2"
                }`}
              >
                <div className="mb-2 flex items-center gap-1">
                  <span className="w-5 font-mono text-[10px] text-muted">{idx + 1}.</span>

                  {result?.status === "ok" && (
                    <span className="text-success text-xs">✓</span>
                  )}
                  {result?.status === "fail" && (
                    <span className="text-red-primary text-xs">✗</span>
                  )}
                  {isCurrent && (
                    <span className="h-2 w-2 rounded-full bg-red-primary animate-pulse" />
                  )}

                  {/* Show error message inline */}
                  {result?.status === "fail" && result.error && (
                    <span className="ml-1 flex-1 truncate font-mono text-[9px] text-red-primary">
                      {result.error}
                    </span>
                  )}

                  <div className="flex-1" />

                  <button
                    onClick={() => removeRecipient(r.id)}
                    disabled={recipients.length === 1 || sending}
                    className="rounded p-0.5 text-muted hover:text-red-primary transition-colors disabled:opacity-30"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={r.address}
                    onChange={(e) => updateRecipient(r.id, "address", e.target.value)}
                    placeholder="0x recipient address"
                    disabled={sending}
                    className="min-w-0 flex-1 rounded border border-ink-border bg-black px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none disabled:opacity-50"
                  />

                  <input
                    type="number"
                    value={r.amount}
                    onChange={(e) => updateRecipient(r.id, "amount", e.target.value)}
                    placeholder="0.00"
                    disabled={sending}
                    className="w-24 rounded border border-ink-border bg-black px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none disabled:opacity-50"
                  />

                  <select
                    value={r.token}
                    onChange={(e) => updateRecipient(r.id, "token", e.target.value)}
                    disabled={sending}
                    className="rounded border border-ink-border bg-black px-2 py-1.5 font-mono text-xs text-white focus:outline-none disabled:opacity-50"
                  >
                    {TOKENS.map((t) => (
                      <option key={t} value={t} className="bg-ink-DEFAULT">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── Memo (optional) ── */}
                <div className="mt-2">
                  {!r.showMemo ? (
                    <button
                      onClick={() => toggleMemo(r.id)}
                      disabled={sending}
                      className="flex items-center gap-1 font-mono text-[10px] text-muted hover:text-cream-white transition-colors disabled:opacity-40"
                    >
                      <span className="text-xs leading-none">+</span> Add memo
                      <span className="text-ink-border2">· invoice id / note</span>
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={r.memo}
                          onChange={(e) => updateRecipient(r.id, "memo", e.target.value)}
                          placeholder="invoice-2026-0001"
                          disabled={sending}
                          maxLength={120}
                          className="min-w-0 flex-1 rounded border border-[#C8A87A]/30 bg-black px-2.5 py-1.5 font-mono text-[11px] text-cream-white placeholder:text-muted focus:border-[#C8A87A]/60 focus:outline-none disabled:opacity-50"
                        />
                        <button
                          onClick={() => { updateRecipient(r.id, "memo", ""); toggleMemo(r.id); }}
                          disabled={sending}
                          className="rounded p-1 text-muted hover:text-red-primary transition-colors disabled:opacity-40"
                          title="Remove memo"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      {hasBadMemo(r) ? (
                        <p className="font-mono text-[9px] text-red-primary">
                          {r.token} doesn&apos;t support memos on Arc — use USDC or EURC, or clear the memo
                        </p>
                      ) : (
                        <p className="font-mono text-[9px] text-muted">
                          Attaches an on-chain memo via Arc&apos;s Memo contract (msg.sender preserved)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Add recipient ────────────────────────────── */}
        {recipients.length < 20 && !sending && (
          <button
            onClick={addRecipient}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-ink-border2 py-2.5 font-mono text-xs text-muted hover:border-red-primary/40 hover:text-cream-white transition-colors"
          >
            <span className="text-base leading-none">+</span> Add recipient
          </button>
        )}

        {/* ── Progress bar ─────────────────────────────── */}
        {sending && progress !== null && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between font-mono text-[11px] text-muted">
              <span>Sending {results.length + 1} of {validCount}...</span>
              <span>{results.length} / {validCount}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-border">
              <div
                className="h-full rounded-full bg-red-primary transition-all duration-300"
                style={{ width: `${(results.length / validCount) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-muted">
              Each tx waits for on-chain confirmation (~2 blocks on Arc)
            </p>
          </div>
        )}

        {/* ── Success / partial summary ────────────────── */}
        {isComplete && (
          <div className="mt-4 rounded-card border border-success/30 bg-success/5 p-3">
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span className="font-mono text-sm text-success">
                {successCount} of {validCount} transactions sent
              </span>
              {failCount > 0 && (
                <span className="ml-auto font-mono text-[10px] text-red-primary">
                  {failCount} failed
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">
              Total sent: {totalAmount.toFixed(2)} USDC · Est. fee: {totalFee.toFixed(3)} USDC
            </p>

            {/* Per-tx ArcScan links */}
            {results.some((r) => r.txHash) && (
              <div className="mt-2 space-y-1 border-t border-success/20 pt-2">
                {results.map((r, idx) => (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    {r.txHash ? (
                      <a
                        href={r.explorerUrl ?? `https://testnet.arcscan.app/tx/${r.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-muted hover:text-success transition-colors"
                      >
                        Tx {idx + 1} — {r.txHash.slice(0, 10)}...{r.txHash.slice(-6)}
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] text-red-primary">
                        Tx {idx + 1} — failed
                      </span>
                    )}
                    {r.txHash && (
                      <a
                        href={r.explorerUrl ?? `https://testnet.arcscan.app/tx/${r.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-success/70 hover:text-success transition-colors"
                      >
                        ↗ ArcScan
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Fee summary ──────────────────────────────── */}
        {!sending && !isComplete && validCount > 0 && (
          <div className="mt-4 rounded-card border border-ink-border bg-black p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted">Total to send</span>
              <span className="font-mono text-[11px] text-cream-white">
                {totalAmount.toFixed(2)} USDC
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted">
                Est. fee ({validCount} txs)
              </span>
              <span className="font-mono text-[11px] text-cream-dim">
                ~{totalFee.toFixed(3)} USDC
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-ink-border pt-1.5">
              <span className="font-mono text-[11px] text-muted">Total cost</span>
              <span className="font-mono text-[11px] font-semibold text-cream-white">
                {(totalAmount + totalFee).toFixed(3)} USDC
              </span>
            </div>
            {memoCount > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 border-t border-ink-border pt-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C8A87A]" />
                <span className="font-mono text-[10px] text-[#C8A87A]">
                  {memoCount} transfer{memoCount > 1 ? "s" : ""} carry an on-chain memo
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Action button ─────────────────────────────── */}
        {!isComplete && (
          <>
            {!isConnected ? (
              <div className="mt-4 rounded-lg border border-ink-border2 bg-ink-surface2 py-3.5 text-center font-body text-sm text-muted">
                Connect wallet to send
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
                disabled={sending || validCount === 0}
                onClick={handleSend}
                className={`mt-4 w-full rounded-lg py-3.5 font-body text-base font-medium transition-all ${
                  sending || validCount === 0
                    ? "cursor-not-allowed bg-ink-border2 text-muted"
                    : "bg-red-primary text-white hover:bg-red-dim"
                }`}
              >
                {sending
                  ? `Sending ${results.length + 1} of ${validCount}...`
                  : validCount === 0
                  ? "Add valid recipients to continue"
                  : `Send to ${validCount} address${validCount > 1 ? "es" : ""}`}
              </button>
            )}
          </>
        )}

        {isComplete && (
          <button
            onClick={() => { setResults([]); setSending(false); }}
            className="mt-4 w-full rounded-lg border border-ink-border2 py-3 font-body text-sm text-cream-dim hover:text-cream-white transition-colors"
          >
            New multi-send
          </button>
        )}
      </div>
    </div>
  );
}
