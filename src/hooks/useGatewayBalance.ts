"use client";

import { useState, useEffect, useCallback } from "react";
import { kit } from "@/lib/kit";

export interface GatewayChainBalance {
  chain: string;
  confirmed: number;
  pending: number;
}

export interface GatewayBalance {
  totalConfirmed: number;
  totalPending: number;
  chains: GatewayChainBalance[];
}

export function useGatewayBalance(walletAddress: string | null) {
  const [data,    setData]    = useState<GatewayBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!walletAddress) { setData(null); return; }
    setLoading(true);
    try {
      const result = await kit.unifiedBalance.getBalances({
        token:          "USDC",
        sources:        { account: walletAddress },
        includePending: true,
        networkType:    "testnet",
      });

      const account = result.breakdown[0];
      const chains: GatewayChainBalance[] = (account?.breakdown ?? []).map(b => ({
        chain:     String(b.chain),
        confirmed: parseFloat(b.confirmedBalance ?? "0"),
        pending:   parseFloat((b as unknown as { pendingBalance?: string }).pendingBalance ?? "0"),
      }));

      setData({
        totalConfirmed: parseFloat(result.totalConfirmedBalance ?? "0"),
        totalPending:   parseFloat((result as unknown as { totalPendingBalance?: string }).totalPendingBalance ?? "0"),
        chains,
      });
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to fetch Gateway balance");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 15_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
