import MemoReceiptView from "@/components/memo/MemoReceiptView";

export default function MemoReceiptPage({ params }: { params: { txHash: string } }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 sm:px-6">
      <div className="mb-8 text-center sm:mb-10">
        <div className="mb-2 font-mono text-xs tracking-widest text-red-primary">{"{ MEMO RECEIPT }"}</div>
        <h1 className="font-mono text-3xl font-bold uppercase tracking-tight text-outline sm:text-4xl">Receipt</h1>
        <p className="mt-2 font-mono text-sm text-page-muted">
          Human-readable memo for one transaction
        </p>
      </div>

      <MemoReceiptView txHash={params.txHash} />
    </div>
  );
}
