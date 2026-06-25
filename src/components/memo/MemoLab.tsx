"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { ARC_CHAIN_ID } from "@/lib/chains";
import {
  sendWithMemo,
  readRecentMemos,
  MEMO_CONTRACT,
  MEMO_TOKENS,
  type DecodedMemo,
  type SendWithMemoResult,
} from "@/lib/memo";

const MEMO_TOKEN_LIST = Object.keys(MEMO_TOKENS); // USDC, EURC, cirBTC

type SendState = "idle" | "sending" | "done" | "error";

export default function MemoLab() {
  const router = useRouter();
  const { address, rawProvider, chainId, isConnected, switchToArc } = useWallet();
  const onArc = chainId === ARC_CHAIN_ID;

  const [lookupTx, setLookupTx] = useState("");
  // Accept a bare tx hash OR a full ArcScan URL pasted in · extract the hash.
  const lookupHash = lookupTx.match(/0x[0-9a-fA-F]{64}/)?.[0] ?? null;
  const lookupValid = !!lookupHash;
  const goToReceipt = () => { if (lookupHash) router.push(`/memo/${lookupHash}`); };

  const [token,  setToken]  = useState("USDC");
  const [to,     setTo]     = useState("");
  const [amount, setAmount] = useState("");
  const [memo,   setMemo]   = useState("");
  const [memoId, setMemoId] = useState("");

  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendErr,   setSendErr]   = useState("");
  const [sendRes,   setSendRes]   = useState<SendWithMemoResult | null>(null);

  const [memos,      setMemos]      = useState<DecodedMemo[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [logErr,     setLogErr]     = useState("");
  const [scanned,    setScanned]    = useState(false);

  const validTo = to.startsWith("0x") && to.length === 42;
  const canSend = isConnected && onArc && validTo && !!amount && parseFloat(amount) > 0 && !!memo.trim();

  // ── Send ────────────────────────────────────────────────
  const handleSend = async () => {
    const provider = rawProvider as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } | null;
    if (!provider || !address) return;
    setSendState("sending");
    setSendErr("");
    setSendRes(null);
    try {
      const res = await sendWithMemo({
        provider,
        from: address,
        token,
        to,
        amount,
        memo: memo.trim(),
        memoId: memoId.trim() || undefined,
      });
      setSendRes(res);
      setSendState("done");
    } catch (e: unknown) {
      setSendErr((e as Error).message ?? "Memo send failed");
      setSendState("error");
    }
  };

  // ── Read back memo events ───────────────────────────────
  const handleScan = useCallback(async (mine: boolean) => {
    setLoadingLog(true);
    setLogErr("");
    try {
      const found = await readRecentMemos(mine && address ? { sender: address } : {});
      setMemos(found.slice(0, 25));
      setScanned(true);
    } catch (e: unknown) {
      setLogErr((e as Error).message ?? "Failed to read memo events");
    } finally {
      setLoadingLog(false);
    }
  }, [address]);

  const reset = () => { setSendState("idle"); setSendRes(null); setSendErr(""); setAmount(""); setMemo(""); setMemoId(""); };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">

      {/* ── Send a memo transfer ── */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-5 shadow-card">
        <div className="mb-1 font-mono text-xs tracking-widest text-red-primary">{"// SEND WITH MEMO"}</div>
        <p className="mb-4 font-body text-xs text-muted">
          Wraps an ERC-20 transfer in Arc&apos;s Memo contract. Emits an on-chain{" "}
          <span className="font-mono text-cream-dim">Memo</span> event for reconciliation.
        </p>

        {sendState === "done" && sendRes ? (
          <div className="rounded-card border border-success/40 bg-success/5 p-4">
            <p className="mb-2 font-mono text-sm text-success">✓ Memo transfer confirmed</p>
            <div className="space-y-1 font-mono text-[11px] text-muted">
              <Row label="Amount" value={`${amount} ${token} → ${to.slice(0, 8)}…${to.slice(-6)}`} />
              <Row label="Memo"   value={memo} />
              <Row label="memoId" value={`${sendRes.memoId.slice(0, 14)}…`} />
              {sendRes.memoIndex && <Row label="memoIndex" value={`#${sendRes.memoIndex}`} />}
            </div>
            <a href={sendRes.explorerUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-block font-mono text-[11px] text-red-primary hover:underline">
              View on ArcScan →
            </a>
            <button onClick={reset} className="mt-3 block w-full rounded border border-ink-border py-2 font-mono text-xs text-muted hover:text-cream-white transition-colors">
              New memo transfer
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={sendState === "sending"}
                className="rounded border border-ink-border2 bg-black px-3 py-2.5 font-mono text-sm text-white focus:outline-none disabled:opacity-50"
              >
                {MEMO_TOKEN_LIST.map((t) => (
                  <option key={t} value={t} className="bg-ink-DEFAULT">{t}</option>
                ))}
              </select>
              <input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount" disabled={sendState === "sending"}
                className="min-w-0 flex-1 rounded border border-ink-border2 bg-black px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none disabled:opacity-50"
              />
            </div>
            <input
              type="text" value={to} onChange={(e) => setTo(e.target.value)}
              placeholder="0x recipient address" disabled={sendState === "sending"}
              className="w-full rounded border border-ink-border2 bg-black px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none disabled:opacity-50"
            />
            <input
              type="text" value={memo} onChange={(e) => setMemo(e.target.value)}
              placeholder="Memo text · e.g. order=2026-0001" disabled={sendState === "sending"} maxLength={200}
              className="w-full rounded border border-[#C8A87A]/30 bg-black px-3 py-2.5 font-mono text-sm text-cream-white placeholder:text-muted focus:border-[#C8A87A]/60 focus:outline-none disabled:opacity-50"
            />
            <input
              type="text" value={memoId} onChange={(e) => setMemoId(e.target.value)}
              placeholder="memoId source (optional) · e.g. invoice-2026-0001" disabled={sendState === "sending"} maxLength={120}
              className="w-full rounded border border-ink-border2 bg-black px-3 py-2 font-mono text-[11px] text-cream-dim placeholder:text-muted focus:border-[#C8A87A]/50 focus:outline-none disabled:opacity-50"
            />

            {sendErr && <p className="font-mono text-[11px] text-red-primary">{sendErr}</p>}

            {!isConnected ? (
              <div className="rounded-lg border border-ink-border2 bg-ink-surface2 py-3 text-center font-body text-sm text-muted">
                Connect wallet to send
              </div>
            ) : !onArc ? (
              <button onClick={switchToArc}
                className="w-full rounded-lg border border-red-primary bg-red-bg py-3 font-body text-sm font-medium text-red-primary hover:bg-red-primary hover:text-white transition-colors">
                Switch to Arc Testnet
              </button>
            ) : (
              <button
                disabled={!canSend || sendState === "sending"}
                onClick={handleSend}
                className={`w-full rounded-lg py-3 font-body text-base font-medium transition-all ${
                  canSend && sendState !== "sending"
                    ? "bg-red-primary text-white hover:bg-red-dim"
                    : "cursor-not-allowed bg-ink-border2 text-muted"
                }`}
              >
                {sendState === "sending" ? "Sending memo transfer…"
                  : !memo.trim() ? "Enter a memo"
                  : !validTo ? "Enter recipient address"
                  : !amount ? "Enter an amount"
                  : `Send ${token} with memo`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Look up one transaction's memo ── */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-5 shadow-card">
        <div className="mb-1 font-mono text-xs tracking-widest text-red-primary">{"// LOOK UP A TRANSACTION"}</div>
        <p className="mb-3 font-body text-xs text-muted">
          Paste a tx hash or an ArcScan link to open its shareable memo receipt · readable text, not hex.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={lookupTx}
            onChange={(e) => setLookupTx(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goToReceipt(); }}
            placeholder="0x… hash or testnet.arcscan.app/tx/0x…"
            className="min-w-0 flex-1 rounded border border-ink-border2 bg-black px-3 py-2.5 font-mono text-xs text-cream-white placeholder:text-muted focus:border-red-primary/50 focus:outline-none"
          />
          <button
            onClick={goToReceipt}
            disabled={!lookupValid}
            className={`flex-shrink-0 rounded-lg px-4 py-2.5 font-mono text-xs transition-colors ${
              lookupValid ? "bg-red-primary text-white hover:bg-red-dim" : "cursor-not-allowed bg-ink-border2 text-muted"
            }`}
          >
            Open receipt
          </button>
        </div>
      </div>

      {/* ── Read memo events ── */}
      <div className="rounded-card2 border border-ink-border bg-ink-surface p-5 shadow-card">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-red-primary">{"// READ MEMO EVENTS"}</span>
          <span className="font-mono text-[10px] text-muted">{MEMO_CONTRACT.slice(0, 10)}…{MEMO_CONTRACT.slice(-6)}</span>
        </div>
        <p className="mb-3 font-body text-xs text-muted">
          Decode <span className="font-mono text-cream-dim">Memo</span> events straight from Arc logs · this is how an indexer reconciles transfers.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => handleScan(true)}
            disabled={loadingLog || !isConnected}
            className="flex-1 rounded-lg bg-red-primary py-2.5 font-mono text-xs text-white transition-colors hover:bg-red-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingLog ? "Scanning…" : "My memos"}
          </button>
          <button
            onClick={() => handleScan(false)}
            disabled={loadingLog}
            className="flex-1 rounded-lg border border-ink-border2 py-2.5 font-mono text-xs text-cream-dim transition-colors hover:text-cream-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingLog ? "Scanning…" : "All recent memos"}
          </button>
        </div>

        {logErr && <p className="mt-2 font-mono text-[11px] text-red-primary">{logErr}</p>}

        {scanned && !loadingLog && memos.length === 0 && (
          <p className="mt-3 font-mono text-[11px] text-muted">No memo events found in the recent block range.</p>
        )}

        {memos.length > 0 && (
          <div className="mt-3 space-y-2">
            {memos.map((m) => (
              <div key={`${m.txHash}-${m.memoIndex}`} className="rounded-card border border-ink-border2 bg-ink-surface2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm text-cream-white">{m.memo}</span>
                  <span className="flex-shrink-0 rounded border border-[#C8A87A]/30 px-1.5 py-0.5 font-mono text-[9px] text-[#C8A87A]">#{m.memoIndex}</span>
                </div>
                <div className="mt-1.5 space-y-0.5 font-mono text-[10px] text-muted">
                  <div>from {m.sender.slice(0, 8)}…{m.sender.slice(-6)} → target {m.target.slice(0, 8)}…{m.target.slice(-6)}</div>
                  <div>memoId {m.memoId.slice(0, 18)}… · block {m.blockNumber.toString()}</div>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <Link href={`/memo/${m.txHash}`}
                    className="font-mono text-[10px] text-[#C8A87A] hover:underline">
                    Open receipt →
                  </Link>
                  <a href={`https://testnet.arcscan.app/tx/${m.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-[10px] text-red-primary hover:underline">
                    {m.txHash.slice(0, 12)}…{m.txHash.slice(-6)} ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="break-all text-right text-cream-dim">{value}</span>
    </div>
  );
}
