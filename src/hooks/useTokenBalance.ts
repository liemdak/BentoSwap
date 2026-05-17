"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { arcTestnet } from "@/lib/chains";

// USDC contract address on Arc Testnet
const ARC_USDC = "0x3600000000000000000000000000000000000000" as const;

const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

export function useArcUsdcBalance(address: string | null) {
  const [balance, setBalance] = useState<string>("0.00");
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) { setBalance("0.00"); return; }
    setLoading(true);
    try {
      const raw = await arcClient.readContract({
        address: ARC_USDC,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      setBalance(formatUnits(raw as bigint, 6));
    } catch {
      // RPC error — keep last known value
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
    // Refresh every 15s
    const id = setInterval(fetch, 15_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { balance, loading, refresh: fetch };
}
