"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { readMemoByTx, type MemoReceipt } from "@/lib/memo";

type State = "loading" | "found" | "empty" | "error";

export default function MemoReceiptView({ txHash }: { txHash: string }) {
  const [state, setState]   = useState<State>("loading");
  const [memos, setMemos]   = useState<MemoReceipt[]>([]);
  const [err, setErr]       = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setErr("");
    try {
      const found = await readMemoByTx(txHash);
      setMemos(found);
      setState(found.length > 0 ? "found" : "empty");
    } catch (e: unknown) {
      setErr((e as Error).message ?? "Failed to read transaction");
      setState("error");
    }
  }, [txHash]);

  useEffect(() => { load(); }, [load]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/memo" className="font-mono text-[11px] text-muted hover:text-cream-white transition-colors">
          ← Back to Memos
        </Link>
        <span className="font-mono text-[10px] text-muted">Arc Testnet</span>
      </div>

      {state === "loading" && (
        <div className="rounded-card2 border border-ink-border bg-ink-surface p-8 text-center shadow-card">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-ink-border2 border-t-red-primary" />
          <p className="font-mono text-xs text-muted">Reading memo from Arc…</p>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-card2 border border-red-primary/30 bg-red-bg p-6 text-center shadow-card">
          <p className="font-mono text-sm text-red-primary">{err}</p>
          <button onClick={load} className="mt-3 rounded border border-ink-border2 px-4 py-2 font-mono text-xs text-muted hover:text-cream-white transition-colors">
            Try again
          </button>
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-card2 border border-ink-border bg-ink-surface p-6 text-center shadow-card">
          <p className="font-mono text-sm text-cream-white">No memo on this transaction</p>
          <p className="mt-1.5 font-mono text-[11px] text-muted">
            This tx didn&apos;t go through Arc&apos;s Memo contract (likely a plain transfer).
          </p>
          <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-block font-mono text-[11px] text-red-primary hover:underline">
            View on ArcScan →
          </a>
        </div>
      )}

      {state === "found" && memos.map((m) => (
        <div key={m.memoIndex} className="overflow-hidden rounded-card2 border border-ink-border bg-ink-surface shadow-card">
          {/* Accent strip */}
          <div className="h-1 w-full bg-gradient-to-r from-red-primary via-[#C8A87A] to-success" />

          <div className="p-5 sm:p-6">
            {/* Status + memoIndex */}
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/5 px-2.5 py-1 font-mono text-[11px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {m.status === "success" ? "Confirmed" : "Reverted"}
              </span>
              <span className="rounded border border-[#C8A87A]/30 px-2 py-0.5 font-mono text-[10px] text-[#C8A87A]">
                memo #{m.memoIndex}
              </span>
            </div>

            {/* Memo · the hero */}
            <div className="mb-1 font-mono text-[10px] tracking-widest text-muted">{"// MEMO"}</div>
            <p className="mb-5 break-words font-mono text-2xl leading-snug text-cream-white">
              {m.memo || <span className="text-muted">(empty)</span>}
            </p>

            {/* Transfer details */}
            <div className="space-y-2 rounded-card border border-ink-border2 bg-ink-surface2 p-4">
              {m.amount && (
                <Row label="Amount" value={`${m.amount} ${m.tokenSymbol ?? ""}`.trim()} strong />
              )}
              <Row label="From" value={shorten(m.sender)} mono />
              {m.to && <Row label="To" value={shorten(m.to)} mono />}
              <Row label="memoId" value={shorten(m.memoId, 10, 8)} mono />
              <Row label="Block" value={m.blockNumber.toString()} mono />
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <a href={m.explorerUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-red-primary py-2.5 text-center font-mono text-xs text-white transition-colors hover:bg-red-dim">
                View on ArcScan ↗
              </a>
              <button onClick={share}
                className="flex-1 rounded-lg border border-ink-border2 py-2.5 font-mono text-xs text-cream-dim transition-colors hover:text-cream-white">
                {copied ? "Link copied ✓" : "Copy share link"}
              </button>
            </div>

            <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted">
              Memo is public on-chain data · Bento decodes the raw event bytes into readable text. ArcScan shows it only as hex.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function shorten(addr: string, head = 8, tail = 6) {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[11px] text-muted">{label}</span>
      <span className={`text-right ${mono ? "font-mono" : "font-body"} text-[12px] ${strong ? "font-semibold text-cream-white" : "text-cream-dim"}`}>
        {value}
      </span>
    </div>
  );
}
