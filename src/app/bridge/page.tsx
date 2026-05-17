import BridgeCard from "@/components/bridge/BridgeCard";

export default function BridgePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 sm:px-6">
      <div className="mb-8 text-center sm:mb-10">
        <div className="mb-2 font-mono text-xs tracking-widest text-red-primary">{"{ BRIDGE }"}</div>
        <h1 className="font-mono text-4xl font-bold uppercase tracking-tight text-outline sm:text-5xl">Bridge</h1>
        <p className="mt-2 font-mono text-sm text-page-muted sm:text-base">
          Cross-chain USDC via CCTP v2 · Burn → Attestation → Mint · Free
        </p>
      </div>
      <div className="flex justify-center">
        <BridgeCard />
      </div>
    </div>
  );
}
