"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/context/WalletContext";
import { useArcUsdcBalance } from "@/hooks/useTokenBalance";
import type { StoredTask } from "@/lib/agentTasks";

// ── Sidebar sections ──────────────────────────────────────
const SECTIONS = [
  { id: "wallets",   num: "01", label: "Wallet Architecture" },
  { id: "topup",     num: "02", label: "Auto Top-Up" },
  { id: "split",     num: "03", label: "Split & Payout" },
  { id: "security",  num: "04", label: "Security" },
  { id: "reclaim",   num: "05", label: "Reclaim Funds" },
  { id: "faq",       num: "06", label: "FAQ" },
];

export default function GuidePage() {
  const [activeId, setActiveId] = useState("wallets");

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #1a1510 0%, #16120E 60%)" }}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">

        {/* ── Hero ─────────────────────────────────────── */}
        <div className="mb-12">
          <div className="mb-3 font-mono text-[11px] tracking-widest text-red-primary">{"{ AGENT GUIDE }"}</div>
          <h1 className="font-display text-5xl text-cream-white">Agent Guide</h1>
          <p className="mt-3 max-w-xl font-body text-base text-muted leading-relaxed">
            Hiểu rõ cách hoạt động của Agent Wallet trước khi deploy. Bao gồm hướng dẫn khôi phục quỹ và bảo mật.
          </p>
        </div>

        {/* ── Layout: sidebar + content ─────────────────── */}
        <div className="flex gap-10">

          {/* Sticky sidebar */}
          <aside className="hidden w-48 flex-shrink-0 lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="mb-3 font-mono text-[10px] tracking-widest text-muted">{"// CONTENTS"}</p>
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                    activeId === s.id
                      ? "bg-red-bg border border-red-primary/30 text-red-primary"
                      : "text-muted hover:text-cream-white"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-60">{s.num}</span>
                  <span className="font-mono text-[11px]">{s.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1 space-y-16">

            {/* ── 01 — Wallet Architecture ─────────────── */}
            <section id="wallets" className="scroll-mt-24">
              <SectionHeader num="01" title="Wallet Architecture" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Mỗi agent task sử dụng một <strong className="text-cream-dim">Developer Controlled Wallet (DCW)</strong> riêng biệt do Circle quản lý — hoàn toàn tách biệt với ví MetaMask của bạn.
                </p>

                {/* Flow diagram */}
                <div className="rounded-card border border-ink-border bg-ink-surface p-5">
                  <div className="font-mono text-[10px] tracking-widest text-muted mb-4">{"// ARCHITECTURE"}</div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
                    <FlowBox label="MetaMask Wallet" sub="Ví của bạn" color="blue" />
                    <FlowArrow label="fund" />
                    <FlowBox label="Agent Wallet" sub="Circle DCW" color="red" />
                    <FlowArrow label="execute" />
                    <FlowBox label="Target Wallets" sub="Địa chỉ đích" color="green" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoCard icon="🔑" title="Ví của bạn an toàn" body="Agent KHÔNG có quyền truy cập MetaMask. Nó chỉ nhận tiền từ bạn, không bao giờ rút ngược." />
                  <InfoCard icon="🏦" title="Mỗi task = 1 ví mới" body="Deploy Auto Top-Up và Multi-send → 2 địa chỉ 0x... hoàn toàn khác nhau." />
                  <InfoCard icon="🔄" title="Đổi máy vẫn giữ task" body="Tasks được đồng bộ qua Firebase theo địa chỉ MetaMask — đăng nhập lại là thấy đủ." />
                </div>
              </div>
            </section>

            {/* ── 02 — Auto Top-Up ─────────────────────── */}
            <section id="topup" className="scroll-mt-24">
              <SectionHeader num="02" title="Auto Top-Up" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Tự động nạp USDC vào ví MetaMask khi số dư xuống dưới ngưỡng bạn đặt. Bạn chỉ cần fund ví agent một lần.
                </p>

                <div className="rounded-card border border-ink-border bg-ink-surface p-5 space-y-3">
                  <div className="font-mono text-[10px] tracking-widest text-muted">{"// FLOW"}</div>
                  {[
                    { n: 1, text: "Bạn đặt ngưỡng: ví MetaMask < $10 → refill $50" },
                    { n: 2, text: "Deploy agent → tạo Agent Wallet mới (0xABC...)" },
                    { n: 3, text: "Bạn fund Agent Wallet với số tiền bạn muốn dự phòng" },
                    { n: 4, text: "Bento server poll số dư MetaMask mỗi ~20 giây" },
                    { n: 5, text: "Khi số dư < $10 → Agent Wallet tự động gửi $50 về MetaMask" },
                    { n: 6, text: "Safety cap giới hạn tổng gửi tối đa / 24h, tránh rủi ro" },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-primary font-mono text-[10px] font-bold text-white">{s.n}</span>
                      <span className="font-mono text-xs text-cream-dim leading-relaxed">{s.text}</span>
                    </div>
                  ))}
                </div>

                <Callout type="tip" text="Nạp đủ tiền vào Agent Wallet để cover nhiều lần refill. Ví dụ: muốn refill $50 tối đa 5 lần → nạp $250." />
              </div>
            </section>

            {/* ── 03 — Split & Payout ──────────────────── */}
            <section id="split" className="scroll-mt-24">
              <SectionHeader num="03" title="Split & Payout" />
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ModeCard
                    tag="AUTO SPLIT"
                    title="Split theo %"
                    steps={["Đặt tổng số tiền (VD: $1000)", "Phân bổ %: Ví A 60%, Ví B 40%", "Chọn lịch: Daily / Weekly / Monthly", "Agent tự split khi đến ngày"]}
                  />
                  <ModeCard
                    tag="RECURRING PAYOUT"
                    title="Trả lương định kỳ"
                    steps={["Thêm danh sách người nhận", "Đặt số tiền cố định mỗi người", "Chọn ngày bắt đầu + giờ", "Agent gửi đúng ngày, đúng giờ"]}
                  />
                  <ModeCard
                    tag="AUTO DISTRIBUTE"
                    title="Phân phối thặng dư"
                    steps={["Đặt ngưỡng trên (VD: > $5000)", "Khi vượt ngưỡng → split phần dư", "Phân bổ theo % tới các ví", "Tự động — không cần can thiệp"]}
                  />
                </div>
                <Callout type="info" text="Tất cả 3 mode đều gasless — Circle Paymaster trả phí gas. Bạn chỉ cần USDC trong Agent Wallet." />
              </div>
            </section>

            {/* ── 04 — Security ────────────────────────── */}
            <section id="security" className="scroll-mt-24">
              <SectionHeader num="04" title="Security" />
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SecurityCard
                    icon="🔐"
                    title="HMAC Token"
                    body="Mỗi task có một token bảo mật riêng. Server chỉ thực thi lệnh khi token đúng — ngay cả developer cũng không thể chạy task của bạn mà không có token này."
                  />
                  <SecurityCard
                    icon="🛡️"
                    title="Safety Cap"
                    body="Giới hạn tổng USDC agent được phép gửi trong 24h. Nếu agent bị lỗi hoặc bị tấn công, thiệt hại bị giới hạn bởi cap này."
                  />
                  <SecurityCard
                    icon="📋"
                    title="Whitelist địa chỉ"
                    body="Agent chỉ được gửi đến các địa chỉ bạn đã cấu hình lúc deploy. Không thể gửi đến địa chỉ ngoài danh sách."
                  />
                  <SecurityCard
                    icon="⏸️"
                    title="Pause / Cancel"
                    body="Dừng hoặc hủy task bất cứ lúc nào. Khi cancel, ReclaimFunds widget giúp bạn rút USDC còn lại về MetaMask ngay lập tức."
                  />
                </div>

                <Callout
                  type="warning"
                  text="Agent Wallet là Circle Developer Controlled Wallet — về mặt kỹ thuật, developer có thể access. Chỉ nên dùng trên testnet với lượng tiền nhỏ."
                />
              </div>
            </section>

            {/* ── 05 — Reclaim Funds ───────────────────── */}
            <section id="reclaim" className="scroll-mt-24">
              <SectionHeader num="05" title="Reclaim Funds" />
              <div className="space-y-5">
                <p className="font-body text-sm leading-relaxed text-muted">
                  Khi cancel task, nếu Agent Wallet còn USDC, bạn cần rút về ví MetaMask. Có 2 cách:
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-card border border-success/30 bg-success/5 p-4 space-y-2">
                    <div className="font-mono text-[10px] tracking-widest text-success">CÁCH 1 — TỰ ĐỘNG</div>
                    <p className="font-mono text-xs text-cream-dim leading-relaxed">
                      Bấm <strong>Cancel</strong> trong task list → popup kiểm tra số dư → bấm <strong>Reclaim & Cancel</strong> → tiền về ví ngay.
                    </p>
                    <div className="flex items-center gap-2 rounded border border-success/20 bg-success/10 px-3 py-2">
                      <span className="font-mono text-[9px] text-success">✓ Khuyến nghị</span>
                    </div>
                  </div>
                  <div className="rounded-card border border-ink-border2 bg-ink-surface2 p-4 space-y-2">
                    <div className="font-mono text-[10px] tracking-widest text-cream-dim">CÁCH 2 — THỦ CÔNG</div>
                    <p className="font-mono text-xs text-muted leading-relaxed">
                      Nếu mất task (xóa cache, đổi máy), dùng file <strong className="text-cream-dim">backup.json</strong> đã tải lúc deploy để khôi phục và rút tiền bên dưới.
                    </p>
                  </div>
                </div>

                {/* Manual Withdraw Widget */}
                <ManualWithdrawWidget />
              </div>
            </section>

            {/* ── 06 — FAQ ─────────────────────────────── */}
            <section id="faq" className="scroll-mt-24">
              <SectionHeader num="06" title="FAQ" />
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <FaqItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}

// ══ Manual Withdraw Widget ══════════════════════════════════
function ManualWithdrawWidget() {
  const { address: userAddress, isConnected } = useWallet();
  const [file,    setFile]    = useState<File | null>(null);
  const [tasks,   setTasks]   = useState<StoredTask[]>([]);
  const [parseErr,setParseErr]= useState("");
  const [selected,setSelected]= useState<StoredTask | null>(null);
  const [state,   setState]   = useState<"idle"|"loading"|"done"|"error">("idle");
  const [txUrl,   setTxUrl]   = useState("");
  const [reclaimErr,setReclaimErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f); setParseErr(""); setTasks([]); setSelected(null);
    try {
      const text = await f.text();
      const json = JSON.parse(text) as { tasks?: StoredTask[] };
      if (!Array.isArray(json.tasks) || json.tasks.length === 0) {
        throw new Error("No tasks found in this file");
      }
      setTasks(json.tasks);
      if (json.tasks.length === 1) setSelected(json.tasks[0]);
    } catch (e: unknown) {
      setParseErr((e as Error).message ?? "Invalid backup file");
    }
  };

  const handleReclaim = async () => {
    if (!selected || !userAddress) return;
    setState("loading"); setReclaimErr("");
    try {
      const res  = await fetch("/api/agent/reclaim", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          walletId:         selected.id,
          token:            selected.token,
          walletAddress:    selected.walletAddress,
          recipientAddress: userAddress,
        }),
      });
      const data = await res.json() as { explorerUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Reclaim failed");
      setTxUrl(data.explorerUrl ?? "");
      setState("done");
    } catch (e: unknown) {
      setReclaimErr((e as Error).message ?? "Reclaim failed");
      setState("error");
    }
  };

  return (
    <div className="rounded-card2 border border-ink-border bg-ink-surface">
      <div className="border-b border-ink-border px-5 py-3.5">
        <span className="font-mono text-[11px] tracking-widest text-muted">{"// MANUAL WITHDRAW"}</span>
      </div>
      <div className="p-5 space-y-4">
        {state === "done" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success/40 bg-success/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#2D9B6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="font-mono text-sm text-success">Funds sent to your wallet!</p>
            {txUrl && (
              <a href={txUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] text-success/70 hover:text-success">
                View on ArcScan
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </a>
            )}
            <button onClick={() => { setState("idle"); setFile(null); setTasks([]); setSelected(null); }}
              className="font-mono text-[10px] text-muted hover:text-cream-white">
              Withdraw another task →
            </button>
          </div>
        ) : (
          <>
            <p className="font-mono text-xs text-muted">
              Upload file <span className="text-cream-dim">backup.json</span> đã tải lúc deploy agent để rút tiền về ví MetaMask đang kết nối.
            </p>

            {/* File drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-ink-border2 py-8 transition-colors hover:border-red-primary/40"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#6B5D4F" strokeWidth="1.5"/>
                <path d="M14 2v6h6M12 12v6M9 15l3-3 3 3" stroke="#6B5D4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {file ? (
                <span className="font-mono text-xs text-cream-dim">{file.name}</span>
              ) : (
                <>
                  <span className="font-mono text-xs text-cream-dim">Click hoặc kéo thả backup.json</span>
                  <span className="font-mono text-[10px] text-muted">Chỉ chấp nhận file JSON</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {parseErr && (
              <div className="rounded border border-red-primary/40 bg-red-bg px-3 py-2">
                <p className="font-mono text-xs text-red-primary">{parseErr}</p>
              </div>
            )}

            {/* Task selector */}
            {tasks.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-muted">Chọn task cần rút tiền:</p>
                {tasks.map(t => (
                  <button key={t.id} onClick={() => setSelected(t)}
                    className={`flex w-full items-center justify-between rounded-card border px-4 py-3 transition-colors ${
                      selected?.id === t.id
                        ? "border-red-primary/50 bg-red-bg"
                        : "border-ink-border2 bg-ink-surface2 hover:border-ink-border"
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-mono text-xs text-cream-white">{t.label}</p>
                      <p className="font-mono text-[10px] text-muted truncate max-w-xs">{t.walletAddress}</p>
                    </div>
                    {selected?.id === t.id && (
                      <span className="font-mono text-[10px] text-red-primary">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Balance + Reclaim */}
            {selected && (
              <AgentBalanceRow
                walletAddress={selected.walletAddress}
                isConnected={isConnected}
                userAddress={userAddress ?? ""}
                onReclaim={handleReclaim}
                state={state}
                err={reclaimErr}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AgentBalanceRow({ walletAddress, isConnected, userAddress, onReclaim, state, err }: {
  walletAddress: string;
  isConnected:   boolean;
  userAddress:   string;
  onReclaim:     () => void;
  state:         "idle"|"loading"|"done"|"error";
  err:           string;
}) {
  const { balance, loading } = useArcUsdcBalance(walletAddress);
  const balNum = parseFloat(balance);
  const hasBalance = !loading && balNum >= 0.01;

  return (
    <div className="space-y-3">
      <div className={`rounded-card border p-4 ${hasBalance ? "border-yellow-500/30 bg-yellow-500/5" : "border-ink-border2 bg-ink-surface2"}`}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted">Agent Wallet Balance</span>
          <span className={`font-mono text-sm font-semibold ${hasBalance ? "text-yellow-400" : "text-muted"}`}>
            {loading ? "..." : `${balNum.toFixed(2)} USDC`}
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-muted truncate">{walletAddress}</p>
      </div>

      {err && <p className="font-mono text-[10px] text-red-primary">{err}</p>}

      {!isConnected ? (
        <div className="rounded border border-ink-border2 px-4 py-3 text-center">
          <p className="font-mono text-xs text-muted">Connect wallet to receive funds</p>
        </div>
      ) : hasBalance ? (
        <button
          onClick={onReclaim}
          disabled={state === "loading"}
          className="w-full rounded-lg border border-yellow-500/50 bg-yellow-500/15 py-3 font-body text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "loading" ? "Đang rút tiền…" : `↩ Rút ${balNum.toFixed(2)} USDC → ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`}
        </button>
      ) : (
        <div className="rounded border border-ink-border2 px-4 py-3 text-center">
          <p className="font-mono text-xs text-muted">{loading ? "Đang kiểm tra số dư…" : "Không còn USDC trong agent wallet này."}</p>
        </div>
      )}
    </div>
  );
}

// ══ FAQ Data ═══════════════════════════════════════════════
const FAQ_ITEMS = [
  {
    q: "Ví MetaMask của tôi có bị ảnh hưởng gì không?",
    a: "Không. Agent Wallet là ví riêng biệt hoàn toàn. Agent chỉ nhận USDC từ bạn và gửi đến địa chỉ đích đã cấu hình — không bao giờ có quyền truy cập ví MetaMask của bạn.",
  },
  {
    q: "Nếu tôi đổi máy hoặc xóa cache, tasks có bị mất không?",
    a: "Không — từ phiên bản này, tasks được sync lên Firebase theo địa chỉ MetaMask. Chỉ cần connect lại cùng ví là tất cả tasks xuất hiện đầy đủ.",
  },
  {
    q: "Nếu tôi mất cả tasks lẫn file backup.json thì sao?",
    a: "Đây là trường hợp xấu nhất. USDC vẫn còn trong Agent Wallet nhưng bạn không có token để rút. Hãy liên hệ support kèm địa chỉ MetaMask để tra cứu lịch sử tạo ví. Đây là lý do tại sao nên lưu backup.json và bật Firebase sync.",
  },
  {
    q: "Tasks của tôi có bị người khác thấy không?",
    a: "Không. Mỗi người dùng chỉ thấy tasks được tạo từ ví MetaMask của họ. Firestore lưu theo wallet_address — người khác không thể đọc data của bạn (miễn là bạn không chia sẻ private key).",
  },
  {
    q: "DCW (Developer Controlled Wallet) là gì?",
    a: "Là ví EVM do Circle tạo và quản lý dưới Circle account của developer ứng dụng. Khác với MetaMask (user-controlled), DCW không cần private key từ phía bạn. Developer có thể lập trình ví này thực hiện giao dịch theo policy định sẵn.",
  },
  {
    q: "Sau khi task hoàn thành hoặc bị cancel, tiền còn lại ở đâu?",
    a: "USDC vẫn nằm trong Agent Wallet cho đến khi bạn chủ động rút. Khi cancel, popup Reclaim Funds sẽ xuất hiện tự động. Nếu bỏ qua, bạn có thể dùng widget Manual Withdraw trên trang này bất cứ lúc nào.",
  },
  {
    q: "Có mất phí không?",
    a: "Không. Tất cả giao dịch đều gasless nhờ Circle Paymaster. Bạn chỉ cần có USDC trong Agent Wallet cho phần giá trị giao dịch thực tế.",
  },
  {
    q: "Agent chạy khi tôi tắt máy không?",
    a: "Có. Agent runner chạy trên server của Bento, không phải trên máy bạn. Miễn task đang Active và Agent Wallet còn tiền, nó sẽ thực thi đúng lịch.",
  },
];

// ══ FAQ accordion ══════════════════════════════════════════
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-card border transition-colors ${open ? "border-red-primary/30 bg-red-bg" : "border-ink-border bg-ink-surface"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-mono text-sm text-cream-dim pr-4">{q}</span>
        <span className={`flex-shrink-0 font-mono text-lg transition-transform ${open ? "rotate-45 text-red-primary" : "text-muted"}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="font-body text-sm leading-relaxed text-muted">{a}</p>
        </div>
      )}
    </div>
  );
}

// ══ Helper Components ═══════════════════════════════════════
function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-primary font-mono text-[11px] font-bold text-white">
        {num}
      </span>
      <h2 className="font-display text-2xl text-cream-white">{title}</h2>
    </div>
  );
}

function FlowBox({ label, sub, color }: { label: string; sub: string; color: "blue"|"red"|"green" }) {
  const borderColor = { blue: "border-blue-500/40", red: "border-red-primary/40", green: "border-success/40" }[color];
  const textColor   = { blue: "text-blue-400", red: "text-red-primary", green: "text-success" }[color];
  return (
    <div className={`flex flex-1 flex-col items-center justify-center rounded-card border ${borderColor} bg-ink-surface2 px-4 py-3 text-center`}>
      <span className={`font-mono text-xs font-semibold ${textColor}`}>{label}</span>
      <span className="mt-0.5 font-mono text-[10px] text-muted">{sub}</span>
    </div>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center px-2 sm:px-3">
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[9px] text-muted">{label}</span>
        <span className="text-red-primary">→</span>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-card border border-ink-border bg-ink-surface p-4 space-y-1.5">
      <div className="text-xl">{icon}</div>
      <p className="font-mono text-xs font-semibold text-cream-dim">{title}</p>
      <p className="font-body text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function ModeCard({ tag, title, steps }: { tag: string; title: string; steps: string[] }) {
  return (
    <div className="rounded-card border border-ink-border bg-ink-surface p-4 space-y-3">
      <div className="font-mono text-[10px] tracking-widest text-red-primary">{"{ " + tag + " }"}</div>
      <p className="font-mono text-sm font-semibold text-cream-white">{title}</p>
      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-0.5 font-mono text-[10px] text-red-primary flex-shrink-0">{i + 1}.</span>
            <span className="font-mono text-[11px] text-muted leading-relaxed">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-card border border-ink-border bg-ink-surface p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="font-mono text-xs font-semibold text-cream-dim">{title}</span>
      </div>
      <p className="font-body text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Callout({ type, text }: { type: "tip"|"warning"|"info"; text: string }) {
  const styles = {
    tip:     { border: "border-success/30",       bg: "bg-success/5",       icon: "✓", color: "text-success" },
    warning: { border: "border-yellow-500/30",    bg: "bg-yellow-500/5",    icon: "⚠", color: "text-yellow-400" },
    info:    { border: "border-blue-500/30",      bg: "bg-blue-500/5",      icon: "ℹ", color: "text-blue-400" },
  }[type];
  return (
    <div className={`flex items-start gap-3 rounded-card border ${styles.border} ${styles.bg} px-4 py-3`}>
      <span className={`mt-0.5 flex-shrink-0 font-mono text-sm ${styles.color}`}>{styles.icon}</span>
      <p className="font-body text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
