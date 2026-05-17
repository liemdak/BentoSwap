"use client";

import { useState, useEffect, useCallback } from "react";
import { kit } from "@/lib/kit";
import type { ViemAdapter } from "@circle-fin/adapter-viem-v2";

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

export function useGatewayBalance(
  walletAddress: string | null,
  adapter: ViemAdapter | null,
) {
  const [data,    setData]    = useState<GatewayBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Need adapter to fetch from Circle Gateway API
    if (!adapter || !walletAddress) { setData(null); return; }
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await kit.unifiedBalance.getBalances({
        token:          "USDC",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sources:        { adapter } as any,
        includePending: true,
        networkType:    "testnet",
      });

      // result.breakdown[0] = this account's breakdown
      const account = result.breakdown?.[0];
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
  }, [adapter, walletAddress]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading, error, refresh };
}
