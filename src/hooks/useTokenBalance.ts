"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { arcTestnet } from "@/lib/chains";

// Token contract addresses on Arc Testnet
export const ARC_TOKEN_ADDRESSES: Record<string, { address: `0x${string}`; decimals: number } | null> = {
  USDC:   { address: "0x3600000000000000000000000000000000000000", decimals: 6  },
  EURC:   { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6  },
  cirBTC: { address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8  },
  USYC:   null, // Address not yet confirmed for Arc Testnet
};

const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

// Generic hook · fetch balance for any ERC-20 token on Arc Testnet
export function useArcTokenBalance(
  address: string | null,
  token: string,
) {
  const tokenInfo = ARC_TOKEN_ADDRESSES[token] ?? null;
  const [balance, setBalance] = useState<string | null>(tokenInfo ? "0.00" : null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address || !tokenInfo) { setBalance(tokenInfo ? "0.00" : null); return; }
    setLoading(true);
    try {
      const raw = await arcClient.readContract({
        address: tokenInfo.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      setBalance(formatUnits(raw as bigint, tokenInfo.decimals));
    } catch {
      // RPC error · keep last known value
    } finally {
      setLoading(false);
    }
  }, [address, tokenInfo]);

  // Reset when token changes
  useEffect(() => {
    setBalance(tokenInfo ? "0.00" : null);
  }, [token, tokenInfo]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 15_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { balance, loading, refresh: fetch };
}

// Backward-compat alias
export function useArcUsdcBalance(address: string | null) {
  const { balance, loading, refresh } = useArcTokenBalance(address, "USDC");
  return { balance: balance ?? "0.00", loading, refresh };
}
