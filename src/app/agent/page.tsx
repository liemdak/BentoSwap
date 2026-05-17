import AgentPanel from "@/components/agent/AgentPanel";

export default function AgentPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 sm:px-6">
      <div className="mb-8 text-center sm:mb-10">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="font-mono text-xs tracking-widest text-red-primary">{"{ AGENT }"}</span>
          <span className="rounded bg-red-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
            NEW
          </span>
        </div>
        <h1 className="font-mono text-4xl font-bold uppercase tracking-tight text-outline sm:text-5xl">Agent</h1>
        <p className="mt-2 font-mono text-sm text-page-muted sm:text-base">
          Automate your wallet · One EIP-712 signature · Zero gas
        </p>
      </div>
      <div className="flex justify-center">
        <AgentPanel />
      </div>
    </div>
  );
}
