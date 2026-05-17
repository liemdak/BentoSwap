"use client";

import { useState } from "react";

const TOKENS = ["USDC", "EURC", "USYC"] as const;
type TokenSymbol = (typeof TOKENS)[number];

interface Recipient {
  id: number;
  address: string;
  amount: string;
  token: TokenSymbol;
}

const NETWORK_FEE_PER_TX = 0.001; // USDC per transaction (mock)

let nextId = 1;

export default function MultiSendCard() {
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: nextId++, address: "", amount: "", token: "USDC" },
  ]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<{ id: number; status: "ok" | "fail" }[]>([]);

  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const totalFee = recipients.length * NETWORK_FEE_PER_TX;
  const validCount = recipients.filter((r) => r.address && r.amount && parseFloat(r.amount) > 0).length;

  const addRecipient = () => {
    if (recipients.length >= 20) return;
    setRecipients((prev) => [...prev, { id: nextId++, address: "", amount: "", token: "USDC" }]);
  };

  const removeRecipient = (id: number) => {
    if (recipients.length === 1) return;
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRecipient = (id: number, field: keyof Recipient, value: string) => {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // Simulate multi-send with progress
  const handleSend = async () => {
    const valid = recipients.filter((r) => r.address && r.amount && parseFloat(r.amount) > 0);
    if (valid.length === 0) return;

    setSending(true);
    setProgress(0);
    setResults([]);

    for (let i = 0; i < valid.length; i++) {
      setProgress(i);
      // Simulate kit.send() call (~0.5s per tx on Arc)
      await new Promise((res) => setTimeout(res, 600));
      setResults((prev) => [...prev, { id: valid[i].id, status: "ok" }]);
    }

    setProgress(null);
    setSending(false);
  };

  const isComplete = results.length > 0 && progress === null;

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
                    : isCurrent
                    ? "border-red-primary/40 bg-red-bg"
                    : "border-ink-border2 bg-ink-surface2"
                }`}
              >
                <div className="mb-2 flex items-center gap-1">
                  {/* Row number */}
                  <span className="w-5 font-mono text-[10px] text-muted">{idx + 1}.</span>

                  {/* Status icon */}
                  {result?.status === "ok" && (
                    <span className="text-success text-xs">✓</span>
                  )}
                  {isCurrent && (
                    <span className="h-2 w-2 rounded-full bg-red-primary animate-pulse" />
                  )}

                  <div className="flex-1" />

                  {/* Remove button */}
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
                  {/* Address input */}
                  <input
                    type="text"
                    value={r.address}
                    onChange={(e) => updateRecipient(r.id, "address", e.target.value)}
                    placeholder="0x recipient address"
                    disabled={sending}
                    className="min-w-0 flex-1 rounded border border-ink-border bg-ink-DEFAULT px-2.5 py-1.5 font-mono text-xs text-cream-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none disabled:opacity-50"
                  />

                  {/* Amount */}
                  <input
                    type="number"
                    value={r.amount}
                    onChange={(e) => updateRecipient(r.id, "amount", e.target.value)}
                    placeholder="0.00"
                    disabled={sending}
                    className="w-24 rounded border border-ink-border bg-ink-DEFAULT px-2.5 py-1.5 font-mono text-xs text-cream-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none disabled:opacity-50"
                  />

                  {/* Token selector */}
                  <select
                    value={r.token}
                    onChange={(e) => updateRecipient(r.id, "token", e.target.value)}
                    disabled={sending}
                    className="rounded border border-ink-border bg-ink-DEFAULT px-2 py-1.5 font-mono text-xs text-cream-white focus:outline-none disabled:opacity-50"
                  >
                    {TOKENS.map((t) => (
                      <option key={t} value={t} className="bg-ink-DEFAULT">
                        {t}
                      </option>
                    ))}
                  </select>
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
              <span>Sending...</span>
              <span>
                {results.length} / {validCount}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-border">
              <div
                className="h-full rounded-full bg-red-primary transition-all duration-300"
                style={{ width: `${(results.length / validCount) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-muted">
              Each tx ~0.48s on Arc Testnet
            </p>
          </div>
        )}

        {/* ── Success summary ──────────────────────────── */}
        {isComplete && (
          <div className="mt-4 rounded-card border border-success/30 bg-success/5 p-3">
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span className="font-mono text-sm text-success">
                {results.filter((r) => r.status === "ok").length} transactions sent
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">
              Total sent: {totalAmount.toFixed(2)} USDC · Fee: {totalFee.toFixed(3)} USDC
            </p>
          </div>
        )}

        {/* ── Fee summary ──────────────────────────────── */}
        {!sending && !isComplete && validCount > 0 && (
          <div className="mt-4 rounded-card border border-ink-border bg-ink-DEFAULT p-3">
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
          </div>
        )}

        {/* ── Send button ──────────────────────────────── */}
        {!isComplete && (
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
              ? "Add recipients to continue"
              : `Send to ${validCount} address${validCount > 1 ? "es" : ""}`}
          </button>
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
