export default function FaucetPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 sm:px-6">
      <div className="mb-8 text-center sm:mb-10">
        <div className="mb-2 font-mono text-xs tracking-widest text-red-primary">{"{ FAUCET }"}</div>
        <h1 className="font-mono text-4xl font-bold uppercase tracking-tight text-outline sm:text-5xl">Faucet</h1>
        <p className="mt-2 font-mono text-sm text-page-muted sm:text-base">
          Get free USDC on Arc Testnet to start trading
        </p>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-sm">
        <div className="rounded-card2 border border-ink-border bg-ink-surface p-6 shadow-card sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-bg">
            <span className="text-2xl">💧</span>
          </div>
          <h2 className="mb-2 font-mono text-2xl font-bold text-cream-white">Circle Faucet</h2>
          <p className="mb-6 font-body text-sm leading-relaxed text-muted">
            Request free USDC on multiple testnets including Arc. No fees, no limits during testnet.
          </p>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-red-primary py-3.5 text-center font-body text-base font-medium text-white shadow-sm transition-colors hover:bg-red-dim"
          >
            Open Circle Faucet →
          </a>
          <p className="mt-3 text-center font-mono text-[11px] text-muted">
            Opens faucet.circle.com in new tab
          </p>
        </div>
      </div>
    </div>
  );
}
