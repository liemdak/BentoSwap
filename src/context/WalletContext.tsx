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
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  switchToArc: () => Promise<void>;
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

  // ── Connect ────────────────────────────────────────────
  const connect = useCallback(async (id: string) => {
    const walletDef = getWalletById(id);
    if (!walletDef) throw new Error(`Unknown wallet: ${id}`);

    const provider = walletDef.getProvider();
    if (!provider) throw new Error(`${walletDef.name} not detected. Please install the extension.`);

    setIsConnecting(true);
    try {
      const prov = provider as Record<string, (...args: unknown[]) => unknown>;

      // Request accounts
      const accounts: string[] = await prov.request({ method: "eth_requestAccounts" });
      if (!accounts.length) throw new Error("No accounts returned");

      // Get current chainId
      const chainHex: string = await prov.request({ method: "eth_chainId" });
      const currentChain = parseInt(chainHex, 16);

      // Build viem adapter
      const viemAdapter = await createViemAdapterFromProvider({ provider: prov as never });

      setRawProvider(provider);
      setAdapter(viemAdapter as ViemAdapter);
      setAddress(accounts[0]);
      setChainId(currentChain);
      setWalletId(id);
      setWalletName(walletDef.name);

      // Auto-switch to Arc Testnet if on different chain
      if (currentChain !== ARC_CHAIN_ID) {
        try {
          await (async () => {
            const p = prov;
            try {
              await p.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: ARC_CHAIN_PARAMS.chainId }],
              });
              setChainId(ARC_CHAIN_ID);
            } catch (err: unknown) {
              if ((err as { code?: number }).code === 4902) {
                await p.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN_PARAMS] });
                setChainId(ARC_CHAIN_ID);
              }
            }
          })();
        } catch {
          // Non-blocking — user can switch manually
        }
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

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
        connect,
        disconnect,
        switchToArc,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
