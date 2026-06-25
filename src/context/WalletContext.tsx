"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import type { ViemAdapter } from "@circle-fin/adapter-viem-v2";
import { ARC_CHAIN_ID, ARC_CHAIN_PARAMS } from "@/lib/chains";
import { getWalletById } from "@/lib/wallets";

// ── Types ──────────────────────────────────────────────────
interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletId: string | null;
  walletName: string | null;
  adapter: ViemAdapter | null;
  rawProvider: unknown;
  connect: (walletId: string) => Promise<void>;
  connectProvider: (provider: unknown, name: string, id?: string) => Promise<void>;
  disconnect: () => void;
  switchToArc: () => Promise<void>;
  switchToChain: (chainId: number, chainName?: string, rpcUrl?: string) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

// ── Context ────────────────────────────────────────────────
const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address,      setAddress]      = useState<string | null>(null);
  const [chainId,      setChainId]      = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletId,     setWalletId]     = useState<string | null>(null);
  const [walletName,   setWalletName]   = useState<string | null>(null);
  const [adapter,      setAdapter]      = useState<ViemAdapter | null>(null);
  const [rawProvider,  setRawProvider]  = useState<unknown>(null);

  const isConnected = Boolean(address);

  // ── Sign message via EIP-191 (personal_sign) ──────────
  const signMessage = useCallback(async (message: string): Promise<string> => {
    const provider = rawProvider as Record<string, (...args: unknown[]) => unknown> | null;
    if (!provider?.request) throw new Error("Wallet not connected");
    if (!address) throw new Error("No account connected");
    const sig = await provider.request({
      method: "personal_sign",
      params: [message, address],
    });
    return sig as string;
  }, [rawProvider, address]);

  // ── Switch to any EVM chain ────────────────────────────
  const switchToChain = useCallback(async (targetChainId: number, chainName?: string, rpcUrl?: string) => {
    const provider = rawProvider as Record<string, (...args: unknown[]) => unknown> | null;
    if (!provider?.request) return;
    const hexId = "0x" + targetChainId.toString(16);
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexId }],
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 4902 && chainName && rpcUrl) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hexId,
            chainName,
            rpcUrls: [rpcUrl],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          }],
        });
      } else if ((err as { code?: number }).code !== 4001) {
        // Re-throw non-rejection errors
        throw err;
      }
    }
  }, [rawProvider]);

  // ── Switch / add Arc Testnet ───────────────────────────
  const switchToArc = useCallback(async () => {
    const provider = rawProvider as Record<string, (...args: unknown[]) => unknown> | null;
    if (!provider?.request) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_PARAMS.chainId }],
      });
    } catch (err: unknown) {
      // 4902 = chain not added yet — add it
      if ((err as { code?: number }).code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [ARC_CHAIN_PARAMS],
        });
      } else {
        throw err;
      }
    }
  }, [rawProvider]);

  // ── Connect with an explicit provider (EIP-6963 / discovered) ──
  const connectProvider = useCallback(async (provider: unknown, name: string, id?: string) => {
    if (!provider) throw new Error(`${name} not available`);

    setIsConnecting(true);
    try {
      const prov = provider as Record<string, (...args: unknown[]) => unknown>;

      // Force popup even if already connected (MetaMask may skip silently)
      try {
        await prov.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // User cancelled or wallet doesn't support — fall through to eth_requestAccounts
      }

      const accounts = (await prov.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts.length) throw new Error("No accounts returned");

      const chainHex = (await prov.request({ method: "eth_chainId" })) as string;
      const currentChain = parseInt(chainHex, 16);

      const viemAdapter = await createViemAdapterFromProvider({ provider: prov as never });

      setRawProvider(provider);
      setAdapter(viemAdapter as ViemAdapter);
      setAddress(accounts[0]);
      setChainId(currentChain);
      setWalletId(id ?? name.toLowerCase());
      setWalletName(name);

      // Auto-switch to Arc Testnet if on different chain
      if (currentChain !== ARC_CHAIN_ID) {
        try {
          await prov.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ARC_CHAIN_PARAMS.chainId }],
          });
          setChainId(ARC_CHAIN_ID);
        } catch (err: unknown) {
          if ((err as { code?: number }).code === 4902) {
            await prov.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN_PARAMS] });
            setChainId(ARC_CHAIN_ID);
          }
          // else: non-blocking — user can switch manually
        }
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Connect by known wallet id (legacy hardcoded list) ──
  const connect = useCallback(async (id: string) => {
    const walletDef = getWalletById(id);
    if (!walletDef) throw new Error(`Unknown wallet: ${id}`);

    const provider = walletDef.getProvider();
    if (!provider) throw new Error(`${walletDef.name} not detected. Please install the extension.`);

    await connectProvider(provider, walletDef.name, id);
  }, [connectProvider]);

  // ── Disconnect ─────────────────────────────────────────
  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setWalletId(null);
    setWalletName(null);
    setAdapter(null);
    setRawProvider(null);
  }, []);

  // ── Listen for account / chain changes ────────────────
  useEffect(() => {
    if (!rawProvider) return;
    const prov = rawProvider as Record<string, (...args: unknown[]) => unknown>;

    const onAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) disconnect();
      else setAddress(accounts[0]);
    };
    const onChainChanged = (chainHex: string) => {
      setChainId(parseInt(chainHex, 16));
    };

    prov.on?.("accountsChanged", onAccountsChanged);
    prov.on?.("chainChanged", onChainChanged);
    return () => {
      prov.removeListener?.("accountsChanged", onAccountsChanged);
      prov.removeListener?.("chainChanged", onChainChanged);
    };
  }, [rawProvider, disconnect]);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isConnecting,
        walletId,
        walletName,
        adapter,
        rawProvider,
        connect,
        connectProvider,
        disconnect,
        switchToArc,
        switchToChain,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
