"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── EIP-6963 wallet discovery types ──────────────────────────
interface EIP6963ProviderInfo {
  rdns: string;
  uuid: string;
  name: string;
  icon: string;
}
interface EIP6963Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}
interface EIP6963Detail {
  info: EIP6963ProviderInfo;
  provider: EIP6963Provider;
}

const INSTALL_LINKS = [
  { name: "MetaMask", href: "https://metamask.io/download/" },
  { name: "OKX", href: "https://www.okx.com/web3" },
  { name: "Rabby", href: "https://rabby.io" },
  { name: "Coinbase", href: "https://www.coinbase.com/wallet/downloads" },
];

export default function WalletModal({ open, onClose }: Props) {
  const { connectProvider } = useWallet();
  const [wallets, setWallets] = useState<EIP6963Detail[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Discover installed wallets via EIP-6963
  useEffect(() => {
    if (!open) return;
    setWallets([]);
    setError(null);
    setConnecting(null);

    const seen = new Set<string>();
    const found: EIP6963Detail[] = [];

    function onAnnounce(e: Event) {
      const detail = (e as CustomEvent<EIP6963Detail>).detail;
      if (!detail?.info?.uuid || seen.has(detail.info.uuid)) return;
      seen.add(detail.info.uuid);
      found.push(detail);
      setWallets([...found]);
    }

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Fallback to legacy injected provider if no wallet announces
    const timer = setTimeout(() => {
      if (found.length === 0) {
        const eth = (window as unknown as { ethereum?: EIP6963Provider }).ethereum;
        if (eth) {
          setWallets([{
            info: { rdns: "legacy", uuid: "legacy", name: "Browser Wallet", icon: "" },
            provider: eth,
          }]);
        }
      }
    }, 350);

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      clearTimeout(timer);
    };
  }, [open]);

  const handleConnect = async (wallet: EIP6963Detail) => {
    setError(null);
    setConnecting(wallet.info.uuid);
    try {
      await connectProvider(wallet.provider, wallet.info.name, wallet.info.rdns);
      onClose();
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Connection failed";
      if (msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("denied")) {
        setConnecting(null);
        return;
      }
      setError(msg);
    } finally {
      setConnecting(null);
    }
  };

  if (!open) return null;

  const active = wallets.find((w) => w.info.uuid === connecting);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-card2 border border-ink-border bg-ink-surface shadow-2xl">
        {/* Warm accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-red-primary via-[#C8A87A] to-success" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl text-cream-white">Connect wallet</h2>
              <p className="mt-1 font-body text-[13px] text-muted">
                Sign in instantly. No account needed.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink-surface2 hover:text-cream-white"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Connecting state */}
          {connecting ? (
            <div className="rounded-card border border-[#C8A87A]/20 bg-ink-surface2 p-6 text-center">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-ink-border2 border-t-red-primary" />
              <p className="font-body text-sm text-cream-white">{active?.info.name ?? "Connecting"}</p>
              <p className="mt-1 font-mono text-[11px] text-muted">Confirm in your wallet…</p>
            </div>
          ) : wallets.length === 0 ? (
            /* No wallet detected */
            <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-5 text-center">
              <p className="font-body text-sm text-cream-white">No wallet detected</p>
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-muted">
                Install a browser wallet extension to continue.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {INSTALL_LINKS.map(({ name, href }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-ink-border2 px-3 py-1 font-mono text-[11px] text-cream-dim transition-colors hover:border-red-primary/40 hover:text-cream-white"
                  >
                    {name}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            /* Detected wallet list */
            <div className="space-y-2">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Detected wallets
              </div>
              {wallets.map((w) => (
                <button
                  key={w.info.uuid}
                  onClick={() => handleConnect(w)}
                  className="group flex w-full items-center gap-3 rounded-card border border-ink-border2 bg-ink-surface2 px-3.5 py-3 text-left transition-all hover:border-red-primary/40 hover:bg-red-bg"
                >
                  <WalletIcon icon={w.info.icon} name={w.info.name} />
                  <div className="flex-1">
                    <div className="font-body text-sm font-medium text-cream-white">{w.info.name}</div>
                    <div className="font-mono text-[10px] text-muted">Click to connect</div>
                  </div>
                  <span className="font-mono text-sm text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-red-primary">
                    →
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-card border border-red-primary/30 bg-red-bg px-4 py-3">
              <p className="font-mono text-xs text-red-primary">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-1.5 font-mono text-[11px] text-muted transition-colors hover:text-cream-white"
              >
                Try again →
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-ink-border pt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_#2D9B6F]" />
            <p className="font-mono text-[10px] text-muted">
              Built on Arc · Switches to Chain 5042002 · Gas in USDC
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function WalletIcon({ icon, name }: { icon: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (icon && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt={name}
        width={30}
        height={30}
        className="flex-shrink-0 rounded-lg object-contain"
        style={{ width: 30, height: 30 }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg border border-ink-border2 bg-black font-display text-sm text-cream-dim">
      {name.charAt(0)}
    </span>
  );
}
