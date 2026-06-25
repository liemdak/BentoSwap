import MemoLab from "@/components/memo/MemoLab";

export default function MemoPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 sm:px-6">

      {/* ── Page header ─────────────────────────── */}
      <div className="mb-8 text-center sm:mb-10">
        <div className="mb-2 font-mono text-xs tracking-widest text-red-primary">{"{ MEMOS }"}</div>
        <h1 className="font-mono text-4xl font-bold uppercase tracking-tight text-outline sm:text-5xl">Memos</h1>
        <p className="mt-2 font-mono text-sm text-page-muted sm:text-base">
          Attach structured context to transfers · Reconcile on-chain ↔ off-chain
        </p>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <MemoLab />

      {/* ── Info ────────────────────────────────── */}
      <div className="mx-auto mt-8 max-w-2xl sm:mt-12">
        <div className="flex items-start gap-3 rounded-card border border-[rgba(200,168,122,0.35)] bg-[rgba(245,240,232,0.6)] px-4 py-3 backdrop-blur-sm">
          <span className="mt-1 h-[7px] w-[7px] flex-shrink-0 rounded-full bg-success shadow-[0_0_6px_#2D9B6F]" />
          <span className="font-mono text-[11px] leading-relaxed text-page-muted">
            Add a note to any transfer so you can <span className="text-page-DEFAULT">look it up and reconcile</span> later.
          </span>
        </div>
      </div>
    </div>
  );
}
