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
  const lastBalance = useRef<string | null>(null);

  const { rpc, usdcAddress, walletAddress } = config;

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) { setBalance(null); lastBalance.current = null; return; }
    setLoading(true);
    try {
      const client = createPublicClient({
        transport: http(rpc, { timeout: 8_000 }),
      });
      const raw = await client.readContract({
        address: usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      const num = parseFloat(formatUnits(raw as bigint, 6));
      const formatted = num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setBalance(formatted);
      lastBalance.current = formatted;
    } catch {
      // On error, keep previous balance instead of going null
      if (lastBalance.current !== null) {
        setBalance(lastBalance.current);
      } else {
        setBalance(null);
      }
    } finally {
      setLoading(false);
    }
  }, [rpc, usdcAddress, walletAddress]);

  useEffect(() => {
    fetchBalance();
    const id = setInterval(fetchBalance, 2_000);
    return () => clearInterval(id);
  }, [fetchBalance]);

  return { balance, loading, refresh: fetchBalance };
}
