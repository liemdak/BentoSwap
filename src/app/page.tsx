import Link from "next/link";

const FEATURES = [
  {
    tag: "TRADE",
    title: "Swap Stablecoins",
    description: "Swap USDC, EURC, and USYC on Arc with real-time rates, custom slippage, and multi-send to multiple wallets in one flow.",
    href: "/trade",
    stats: "~0.48s finality",
  },
  {
    tag: "BRIDGE",
    title: "Cross-Chain Bridge",
    description: "Bridge USDC across 8 chains using CCTP v2. Track every step — burn → attestation → mint — in real time.",
    href: "/bridge",
    stats: "~20s bridge time",
  },
  {
    tag: "BALANCE",
    title: "Unified Balance",
    description: "Aggregate USDC from multiple chains into one balance. Deposit, spend, and withdraw — powered by Circle Gateway.",
    href: "/balance",
    stats: "8 chains unified",
  },
  {
    tag: "AGENT",
    title: "Auto Wallet Agent",
    description: "Deploy a Circle Agent that auto top-ups your wallet or sends USDC to multiple addresses. One EIP-712 signature, zero gas.",
    href: "/agent",
    stats: "Gasless · EIP-712",
    isNew: true,
  },
];

const STATS = [
  { label: "Block time",        value: "0.48s" },
  { label: "Bridge time",       value: "~20s"  },
  { label: "Chains supported",  value: "8"     },
  { label: "Gas token",         value: "USDC"  },
  { label: "Network",           value: "Arc"   },
];

const FOOTER_LINKS = {
  build: [
    { label: "Trade",   href: "/trade",   external: false },
    { label: "Bridge",  href: "/bridge",  external: false },
    { label: "Balance", href: "/balance", external: false },
    { label: "Agent",   href: "/agent",   external: false },
  ],
  explore: [
    { label: "Arc Docs",       href: "https://docs.arc.io",                  external: true  },
    { label: "Arc Explorer",   href: "https://testnet.arcscan.app",           external: true  },
    { label: "Circle Faucet",  href: "https://faucet.circle.com",             external: true  },
    { label: "Circle Docs",    href: "https://developers.circle.com",         external: true  },
  ],
  connect: [
    { label: "X (Twitter)",  href: "#", external: false }, // TODO: thêm link sau khi deploy
    { label: "Discord",      href: "#", external: false }, // TODO: thêm link sau khi deploy
  ],
};

export default function HomePage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* ═══ HERO ════════════════════════════════════════════ */}
        <section className="flex flex-col items-center py-16 text-center sm:py-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(200,168,122,0.45)] bg-[rgba(245,240,232,0.65)] px-4 py-1.5 backdrop-blur-sm">
            <span className="h-[7px] w-[7px] rounded-full bg-success shadow-[0_0_6px_#2D9B6F]" />
            <span className="font-mono text-xs text-page-muted">Arc Testnet · Chain ID 5042002</span>
          </div>

          <h1 className="hero-heading cursor-default font-mono text-4xl uppercase leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-outline block">Stablecoin Finance</span>
            <span className="text-outline-red block">Simplified</span>
          </h1>

          <p className="mt-5 max-w-xl font-body text-base text-page-muted sm:text-lg">
            Swap, bridge, and automate your stablecoins on Arc Testnet.
            Powered by{" "}
            <span className="font-medium text-page-DEFAULT">Circle App Kit</span> and{" "}
            <span className="font-medium text-page-DEFAULT">CCTP v2</span>.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              href="/trade"
              className="rounded-lg bg-red-primary px-8 py-3 font-body text-base font-medium text-white shadow-sm transition-colors hover:bg-red-dim"
            >
              Start Trading
            </Link>
            <Link
              href="/bridge"
              className="rounded-lg border border-[rgba(22,18,14,0.2)] bg-[rgba(245,240,232,0.65)] px-8 py-3 font-body text-base font-medium text-page-DEFAULT backdrop-blur-sm transition-colors hover:bg-[rgba(245,240,232,0.9)]"
            >
              Bridge USDC
            </Link>
          </div>
        </section>

        {/* ═══ FEATURE CARDS ═══════════════════════════════════ */}
        <section className="py-8 sm:py-12">
          <div className="mb-8 flex items-center gap-4">
            <span className="font-mono text-xs tracking-widest text-page-muted">{"// FEATURES"}</span>
            <div className="h-px flex-1 bg-[rgba(22,18,14,0.15)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {FEATURES.map(({ tag, title, description, href, stats, isNew }) => (
              <Link
                key={tag}
                href={href}
                className="group flex flex-col rounded-card2 border border-ink-border bg-ink-surface p-5 shadow-card transition-all hover:border-ink-border2 hover:shadow-card-hover sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-xs tracking-widest text-red-primary">
                    {"{ " + tag + " }"}
                  </span>
                  {isNew && (
                    <span className="rounded bg-red-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
                      NEW
                    </span>
                  )}
                </div>
                <h3 className="mb-2 font-display text-xl text-cream-white">{title}</h3>
                <p className="flex-1 font-body text-sm leading-relaxed text-muted">{description}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink-border2 bg-ink-DEFAULT px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="font-mono text-[11px] text-cream-dim">{stats}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ STATS BAR ═══════════════════════════════════════ */}
        <section className="mb-12 mt-4">
          <div className="overflow-hidden rounded-card2 border border-ink-border bg-ink-surface shadow-card">
            <div className="grid grid-cols-2 divide-x divide-ink-border sm:grid-cols-5">
              {STATS.map(({ label, value }, i) => (
                <div
                  key={label}
                  className={`flex flex-col items-center gap-1 px-4 py-4 sm:px-6 sm:py-5 ${
                    i === 4 ? "col-span-2 sm:col-span-1 border-t border-ink-border sm:border-t-0" : ""
                  }`}
                >
                  <span className="font-mono text-lg font-semibold text-cream-white sm:text-xl">{value}</span>
                  <span className="text-center font-body text-[11px] text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ POWERED BY ══════════════════════════════════════ */}
        <section className="pb-16">
          <div className="mb-8 flex items-center gap-4">
            <span className="font-mono text-xs tracking-widest text-page-muted">{"// POWERED BY"}</span>
            <div className="h-px flex-1 bg-[rgba(22,18,14,0.15)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <PoweredByCard tag="SDK"    label="Circle App Kit"   desc="Swap, bridge, and send with a single SDK. No smart contracts needed." />
            <PoweredByCard tag="BRIDGE" label="CCTP v2"          desc="Circle's native cross-chain protocol. Burn on source, mint on destination." />
            <PoweredByCard tag="INFRA"  label="Circle Gateway"   desc="Unified balance across chains. Gasless agent payments down to $0.000001." />
          </div>
        </section>
      </div>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <footer className="relative border-t border-[#C8A87A]/40 bg-[rgba(245,240,232,0.85)] backdrop-blur-sm overflow-hidden">
        <Bubbles />
        {/* Main footer grid */}
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

            {/* Brand col */}
            <div className="sm:col-span-2 lg:col-span-1">
              {/* Mini logo */}
              <div className="flex items-stretch overflow-hidden rounded-[8px] border-2 border-[#C8A87A] bg-white w-fit shadow-sm">
                <div className="flex items-center px-3 py-1.5">
                  <span className="font-display text-xl leading-none tracking-tight text-red-primary">bento</span>
                </div>
                <div className="w-px bg-[#C8A87A]/60" />
                <div className="flex w-5 flex-col">
                  <div className="flex-1 bg-white" />
                  <div className="h-[40%] bg-[#E8DFC0]" />
                </div>
              </div>
              <p className="mt-4 max-w-[220px] font-body text-sm leading-relaxed text-page-muted">
                Stablecoin finance on Arc Testnet. Swap, bridge, and automate with Circle infrastructure.
              </p>
            </div>

            {/* BUILD */}
            <div>
              <div className="mb-4 font-mono text-[11px] tracking-widest text-red-primary">{"{ BUILD }"}</div>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.build.map(({ label, href, external }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="group flex items-center gap-1.5 font-body text-sm text-page-DEFAULT transition-colors hover:text-red-primary"
                    >
                      {label}
                      {external && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50 group-hover:opacity-100">
                          <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* EXPLORE */}
            <div>
              <div className="mb-4 font-mono text-[11px] tracking-widest text-page-muted">{"// EXPLORE"}</div>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.explore.map(({ label, href, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="group flex items-center gap-1.5 font-body text-sm text-page-DEFAULT transition-colors hover:text-red-primary"
                    >
                      {label}
                      {external && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50 group-hover:opacity-100">
                          <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* CONNECT */}
            <div>
              <div className="mb-4 font-mono text-[11px] tracking-widest text-page-muted">{"// CONNECT"}</div>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.connect.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className={`font-body text-sm transition-colors ${
                        href === "#"
                          ? "cursor-default text-page-muted"
                          : "text-page-DEFAULT hover:text-red-primary"
                      }`}
                    >
                      {label}
                      {href === "#" && (
                        <span className="ml-2 font-mono text-[10px] text-ink-border2">coming soon</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#C8A87A]/30">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
            <span className="font-mono text-[11px] text-page-muted">
              © 2026 Bento · Built on Arc Testnet · Figures are indicative — not financial advice
            </span>
            <div className="flex items-center gap-4">
              <a href="https://docs.arc.io" target="_blank" rel="noopener noreferrer"
                className="font-mono text-[11px] text-page-muted hover:text-page-DEFAULT transition-colors">
                Arc Docs ↗
              </a>
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                className="font-mono text-[11px] text-page-muted hover:text-page-DEFAULT transition-colors">
                Faucet ↗
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ── Bubbles ───────────────────────────────────────────────
const BUBBLE_CONFIG = [
  { size: 18, left: "8%",  delay: "0s",    dur: "7s"  },
  { size: 10, left: "18%", delay: "1.5s",  dur: "9s"  },
  { size: 24, left: "28%", delay: "3s",    dur: "8s"  },
  { size: 12, left: "40%", delay: "0.8s",  dur: "10s" },
  { size: 20, left: "52%", delay: "2.2s",  dur: "7.5s"},
  { size: 8,  left: "63%", delay: "4s",    dur: "9.5s"},
  { size: 16, left: "74%", delay: "1s",    dur: "8.5s"},
  { size: 14, left: "85%", delay: "3.5s",  dur: "7s"  },
  { size: 22, left: "93%", delay: "2s",    dur: "10s" },
];

function Bubbles() {
  return (
    <>
      {BUBBLE_CONFIG.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            width:  b.size,
            height: b.size,
            left:   b.left,
            animationDelay:    b.delay,
            animationDuration: b.dur,
          }}
        />
      ))}
    </>
  );
}

function PoweredByCard({ label, desc, tag }: { label: string; desc: string; tag: string }) {
  return (
    <div className="rounded-card2 border border-ink-border bg-ink-surface p-5 shadow-card sm:p-6">
      <span className="font-mono text-xs tracking-widest text-red-primary">{"// " + tag}</span>
      <h4 className="mt-2 font-display text-lg text-cream-white">{label}</h4>
      <p className="mt-2 font-body text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  );
}
