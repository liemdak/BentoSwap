"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";

interface ChainBalanceConfig {
  rpc: string;
  usdcAddress: string;
  walletAddress: string | null;
}

export function useChainUsdcBalance(config: ChainBalanceConfig) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Keep previous balance while refreshing (no flicker to null)
  const lastBalance   = useRef<string | null>(null);
  // Track active fetch so stale responses from old chain are discarded
  const activeFetchId = useRef(0);

  const { rpc, usdcAddress, walletAddress } = config;

  // Reset immediately when chain changes — never show wrong-chain balance
  useEffect(() => {
    setBalance(null);
    setLoading(false);
    lastBalance.current = null;
    activeFetchId.current += 1; // invalidate any in-flight request
  }, [rpc, usdcAddress]);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) { setBalance(null); lastBalance.current = null; return; }

    const myId = ++activeFetchId.current;
    setLoading(true);
    try {
      const client = createPublicClient({
        transport: http(rpc, { timeout: 6_000, retryCount: 1 }),
      });
      const raw = await client.readContract({
        address:      usdcAddress as `0x${string}`,
        abi:          erc20Abi,
        functionName: "balanceOf",
        args:         [walletAddress as `0x${string}`],
      });

      // Discard if a newer fetch started (chain switched mid-flight)
      if (myId !== activeFetchId.current) return;

      const num       = parseFloat(formatUnits(raw as bigint, 6));
      const formatted = num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setBalance(formatted);
      lastBalance.current = formatted;
    } catch {
      if (myId !== activeFetchId.current) return;
      // On error, keep last known value for same chain; otherwise stay null
      setBalance(lastBalance.current);
    } finally {
      if (myId === activeFetchId.current) setLoading(false);
    }
  }, [rpc, usdcAddress, walletAddress]);

  useEffect(() => {
    fetchBalance();
    const id = setInterval(fetchBalance, 3_000);
    return () => clearInterval(id);
  }, [fetchBalance]);

  return { balance, loading, refresh: fetchBalance };
}
