"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";

interface ChainBalanceConfig {
  rpc: string;
  usdcAddress: string;
  walletAddress: string | null;
}

export function useChainUsdcBalance(config: ChainBalanceConfig) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { rpc, usdcAddress, walletAddress } = config;

  const fetch = useCallback(async () => {
    if (!walletAddress) { setBalance(null); return; }
    setLoading(true);
    try {
      const client = createPublicClient({
        transport: http(rpc, { timeout: 5_000 }),
      });
      const raw = await client.readContract({
        address: usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      const formatted = formatUnits(raw as bigint, 6);
      // Show up to 2 decimal places, trim trailing zeros
      const num = parseFloat(formatted);
      setBalance(num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [rpc, usdcAddress, walletAddress]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 3_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { balance, loading, refresh: fetch };
}
