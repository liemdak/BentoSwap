"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import WalletModal from "@/components/ui/WalletModal";
import { ARC_CHAIN_ID } from "@/lib/chains";

const NAV_LINKS = [
  { href: "/trade",   label: "Trade" },
  { href: "/bridge",  label: "Bridge" },
  { href: "/balance", label: "Balance" },
  { href: "/agent",   label: "Agent", isNew: true },
  { href: "/faucet",  label: "Faucet" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { address, isConnected, isConnecting, chainId, disconnect, switchToArc } = useWallet();
  const [copied, setCopied] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const onArc = chainId === ARC_CHAIN_ID;

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[rgba(200,168,122,0.25)] glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* ── Logo ──────────────────────────────────────── */}
          <div className="flex items-center gap-2.5">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <BentoLogo />
            </Link>
            <span className="rounded border border-[#B5A882]/50 px-2 py-0.5 font-mono text-[10px] text-[#8A7E6A]">
              TESTNET
            </span>
          </div>

          {/* ── Desktop nav ────────────────────────────────── */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map(({ href, label, isNew }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 font-body text-sm font-medium transition-all ${
                  isActive(href)
                    ? "bg-red-primary text-white shadow-sm"
                    : "text-page-muted hover:bg-[rgba(22,18,14,0.07)] hover:text-page-DEFAULT"
                }`}
              >
                {label}
                {isNew && (
                  <span className="rounded bg-red-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
                    NEW
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* ── Desktop right ──────────────────────────────── */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Chain badge */}
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 cursor-default ${
                onArc || !isConnected
                  ? "border-[rgba(200,168,122,0.4)] bg-[rgba(245,240,232,0.6)]"
                  : "border-yellow-500/40 bg-yellow-500/10 cursor-pointer"
              }`}
              onClick={!onArc && isConnected ? switchToArc : undefined}
              title={!onArc && isConnected ? "Click to switch to Arc Testnet" : undefined}
            >
              <span className={`h-[7px] w-[7px] rounded-full ${
                onArc || !isConnected ? "bg-success shadow-[0_0_6px_#2D9B6F]" : "bg-yellow-400"
              }`} />
              <span className="font-mono text-xs text-page-muted">
                {isConnected && !onArc ? "Wrong network" : "Arc Testnet"}
              </span>
            </div>

            {/* Wallet button */}
            {isConnected ? (
              <div className="relative group">
                <button
                  onClick={copyAddress}
                  title="Click to copy address"
                  className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 px-3 py-2 font-mono text-xs text-success transition-all hover:bg-success/20 active:scale-95"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {copied ? "Copied!" : shortAddress}
                  {/* Copy icon */}
                  {!copied && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
                {/* Dropdown: full address + disconnect */}
                <div className="absolute right-0 top-full mt-1.5 hidden min-w-[200px] rounded-card border border-ink-border bg-ink-surface p-3 shadow-card group-hover:block z-50">
                  <p className="mb-2 break-all font-mono text-[10px] text-cream-dim leading-relaxed">
                    {address}
                  </p>
                  <div className="border-t border-ink-border pt-2 flex gap-2">
                    <button
                      onClick={copyAddress}
                      className="flex-1 rounded border border-ink-border2 py-1.5 font-mono text-[10px] text-muted hover:text-cream-white hover:border-cream-dim transition-colors"
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                    <button
                      onClick={disconnect}
                      className="flex-1 rounded border border-red-primary/30 py-1.5 font-mono text-[10px] text-red-primary hover:bg-red-bg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setModalOpen(true)}
                disabled={isConnecting}
                className="rounded-lg bg-red-primary px-4 py-2 font-body text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-dim disabled:opacity-60"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>

          {/* ── Mobile: dot + hamburger ────────────────────── */}
          <div className="flex items-center gap-3 md:hidden">
            <span className={`h-[7px] w-[7px] rounded-full ${
              onArc || !isConnected ? "bg-success shadow-[0_0_6px_#2D9B6F]" : "bg-yellow-400"
            }`} />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(200,168,122,0.3)] bg-[rgba(245,240,232,0.6)] text-page-DEFAULT transition-colors"
            >
              {menuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ──────────────────────────────── */}
        {menuOpen && (
          <div className="border-t border-[rgba(200,168,122,0.2)] glass px-4 pb-4 pt-2 md:hidden">
            <div className="space-y-1">
              {NAV_LINKS.map(({ href, label, isNew }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 font-body text-base font-medium transition-all ${
                    isActive(href)
                      ? "bg-red-primary text-white"
                      : "text-page-DEFAULT hover:bg-[rgba(22,18,14,0.07)]"
                  }`}
                >
                  {label}
                  {isNew && (
                    <span className="rounded bg-red-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
                      NEW
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="my-3 border-t border-[rgba(200,168,122,0.2)]" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-[7px] w-[7px] rounded-full ${
                  onArc || !isConnected ? "bg-success shadow-[0_0_6px_#2D9B6F]" : "bg-yellow-400"
                }`} />
                <span className="font-mono text-xs text-page-muted">Arc Testnet · 5042002</span>
              </div>

              {isConnected ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1.5 font-mono text-xs text-success"
                  >
                    {copied ? "✓ Copied!" : shortAddress}
                    {!copied && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={disconnect}
                    className="rounded border border-red-primary/40 px-3 py-1.5 font-mono text-xs text-red-primary"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setModalOpen(true); setMenuOpen(false); }}
                  className="rounded-lg bg-red-primary px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-red-dim"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Wallet selection modal */}
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

/* ── Logo ───────────────────────────────────────────────── */
function BentoLogo() {
  return (
    <div className="flex items-center">
      {/* Outer frame: white bg + gold border + rounded */}
      <div className="flex items-stretch overflow-hidden rounded-[8px] border-2 border-[#C8A87A] bg-white shadow-sm">
        {/* Left section: "bento" wordmark */}
        <div className="flex items-center px-3 py-1.5">
          <span className="font-display text-2xl leading-none tracking-tight text-red-primary">
            bento
          </span>
        </div>
        {/* Divider */}
        <div className="w-px bg-[#C8A87A]/60" />
        {/* Right compartment: 2 cells stacked */}
        <div className="flex w-6 flex-col">
          <div className="flex-1 bg-white" />
          <div className="h-[40%] bg-[#E8DFC0]" />
        </div>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
