// Wallet definitions — no WalletConnect, injected only

export interface WalletDef {
  id: string;
  name: string;
  icon: string;       // kept for legacy
  iconImg: string;    // path in /public/wallets/ or external URL
  getProvider: () => unknown | null;
}

// Safe window access (SSR guard)
const w = () => (typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null);

export const WALLETS: WalletDef[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    iconImg: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/SVG_MetaMask_Icon_Color.svg",
    getProvider: () => {
      const win = w();
      if (!win) return null;
      const eth = win.ethereum as Record<string, unknown> | undefined;
      if (!eth) return null;
      // EIP-6963: multiple providers array
      if (Array.isArray((eth as Record<string, unknown>).providers)) {
        const providers = (eth as Record<string, unknown[]>).providers;
        return providers.find((p: unknown) => (p as Record<string, unknown>).isMetaMask && !(p as Record<string, unknown>).isBraveWallet) ?? null;
      }
      return eth.isMetaMask ? eth : null;
    },
  },
  {
    id: "okx",
    name: "OKX Wallet",
    icon: "⭕",
    iconImg: "https://static.okx.com/cdn/assets/imgs/247/58E63FEA47A2B7D7.png",
    getProvider: () => {
      const win = w();
      return (win?.okxwallet as unknown) ?? null;
    },
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "🔵",
    iconImg: "https://images.ctfassets.net/q5ulk4bp65r7/3TBS4oVkD1ghowTqyceHll/2dfd4ea3b623a7c0d8deb2ff445dee9e/coinbase-wallet-logo.png",
    getProvider: () => {
      const win = w();
      if (!win) return null;
      const eth = win.ethereum as Record<string, unknown> | undefined;
      if (!eth) return null;
      if (Array.isArray((eth as Record<string, unknown>).providers)) {
        const providers = (eth as Record<string, unknown[]>).providers;
        return providers.find((p: unknown) => (p as Record<string, unknown>).isCoinbaseWallet) ?? null;
      }
      return eth.isCoinbaseWallet ? eth : null;
    },
  },
  {
    id: "rabby",
    name: "Rabby",
    icon: "🐰",
    iconImg: "https://rabby.io/assets/images/logo-rabby-wallet.svg",
    getProvider: () => {
      const win = w();
      if (!win) return null;
      const eth = win.ethereum as Record<string, unknown> | undefined;
      return eth?.isRabby ? eth : null;
    },
  },
];

export function getWalletById(id: string): WalletDef | undefined {
  return WALLETS.find((w) => w.id === id);
}
