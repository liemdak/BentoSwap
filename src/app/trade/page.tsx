"use client";

import { useState } from "react";
import SwapCard from "@/components/trade/SwapCard";
import MultiSendCard from "@/components/trade/MultiSendCard";

type Tab = "swap" | "multisend";

export default function TradePage() {
  const [tab, setTab] = useState<Tab>("swap");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 sm:px-6">

      {/* ── Page header ─────────────────────────── */}
      <div className="mb-8 text-center sm:mb-10">
        <div className="mb-2 font-mono text-xs tracking-widest text-red-primary">{"{ TRADE }"}</div>
        <h1 className="font-mono text-4xl font-bold uppercase tracking-tight text-outline sm:text-5xl">Trade</h1>
        <p className="mt-2 font-mono text-sm text-page-muted sm:text-base">
          Swap stablecoins on Arc · Multi-send to multiple wallets
        </p>
      </div>

      {/* ── Tab switcher ────────────────────────── */}
      <div className="mb-6 flex justify-center sm:mb-8">
        <div className="flex rounded-lg border border-[rgba(200,168,122,0.35)] bg-[rgba(245,240,232,0.6)] p-1 backdrop-blur-sm">
          <TabBtn active={tab === "swap"}      onClick={() => setTab("swap")}>Swap</TabBtn>
          <TabBtn active={tab === "multisend"} onClick={() => setTab("multisend")}>Multi-send</TabBtn>
        </div>
      </div>

      {/* ── Content ─────────────────────────────── */}
      <div className="flex justify-center">
        {tab === "swap" ? <SwapCard /> : <MultiSendCard />}
      </div>

      {/* ── Network info ────────────────────────── */}
      <div className="mx-auto mt-8 max-w-md sm:mt-12">
        <div className="flex items-center gap-3 rounded-card border border-[rgba(200,168,122,0.35)] bg-[rgba(245,240,232,0.6)] px-4 py-3 backdrop-blur-sm">
          <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-success shadow-[0_0_6px_#2D9B6F]" />
          <span className="font-mono text-[11px] text-page-muted">
            Arc Testnet · ~0.48s · Gas: USDC · Chain ID 5042002
          </span>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-5 py-2 font-body text-sm font-medium transition-colors sm:px-6 ${
        active ? "bg-red-primary text-white shadow-sm" : "text-page-muted hover:text-page-DEFAULT"
      }`}
    >
      {children}
    </button>
  );
}
