"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { WALLETS, WalletDef } from "@/lib/wallets";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WalletModal({ open, onClose }: Props) {
  const { connect, isConnecting } = useWallet();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detect which wallets are installed (client only)
  const [detected, setDetected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!open) return;
    const result: Record<string, boolean> = {};
    WALLETS.forEach((w) => {
      result[w.id] = Boolean(w.getProvider());
    });
    setDetected(result);
  }, [open]);

  const handleConnect = async (walletId: string) => {
    setError(null);
    setConnecting(walletId);
    try {
      await connect(walletId);
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Connection failed");
    } finally {
      setConnecting(null);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-card2 border border-ink-border bg-ink-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg text-cream-white">Connect Wallet</h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted">Arc Testnet · Chain ID 5042002</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink-surface2 hover:text-cream-white"
          >
            ✕
          </button>
        </div>

        {/* Wallet list */}
        <div className="p-4 space-y-2">
          {WALLETS.map((wallet) => {
            const isDetected = detected[wallet.id];
            const isLoading  = connecting === wallet.id;

            return (
              <button
                key={wallet.id}
                onClick={() => isDetected && handleConnect(wallet.id)}
                disabled={!isDetected || isConnecting}
                className={`flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left transition-all ${
                  isDetected
                    ? "cursor-pointer border-ink-border2 hover:border-red-primary/50 hover:bg-ink-surface2"
                    : "cursor-not-allowed border-ink-border opacity-40"
                }`}
              >
                {/* Icon */}
                <WalletIcon wallet={wallet} />

                {/* Name + status */}
                <div className="flex-1">
                  <div className="font-body text-sm font-medium text-cream-white">{wallet.name}</div>
                  <div className="font-mono text-[10px] text-muted">
                    {isDetected ? "Detected" : "Not installed"}
                  </div>
                </div>

                {/* Right indicator */}
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-primary border-t-transparent" />
                ) : isDetected ? (
                  <span className="font-mono text-[10px] text-muted">→</span>
                ) : (
                  <span className="font-mono text-[10px] text-muted">Install</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-4 rounded-card border border-red-primary/30 bg-red-bg px-4 py-3">
            <p className="font-mono text-xs text-red-primary">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-ink-border px-5 py-3">
          <p className="text-center font-mono text-[10px] text-muted">
            Connecting will switch your wallet to Arc Testnet automatically
          </p>
        </div>
      </div>
    </>
  );
}

function WalletIcon({ wallet }: { wallet: WalletDef }) {
  const [failed, setFailed] = useState(false);

  if (wallet.iconImg && !failed) {
    return (
      <img
        src={wallet.iconImg}
        alt={wallet.name}
        width={36}
        height={36}
        className="rounded-lg object-contain flex-shrink-0"
        style={{ width: 36, height: 36 }}
        onError={() => setFailed(true)}
      />
    );
  }
  // fallback to emoji
  return <span className="text-2xl leading-none">{wallet.icon}</span>;
}
