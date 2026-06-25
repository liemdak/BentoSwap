// ── Types ─────────────────────────────────────────────────────
export type AgentMode   = "topup" | "autosplit" | "payout" | "distribute";
export type TaskStatus  = "active" | "paused";
export type RunResult   = "ok" | "fail";

export interface PayoutRecipient {
  address:   string;
  amount:    string;
  name:      string;
  firstDate: string; // YYYY-MM-DD
  time:      string; // HH:MM
}

export interface SplitRule {
  address: string;
  pct:     string;
}

export interface TaskConfig {
  // Recurring Payout
  payoutFreq?:  string;
  payoutRules?: PayoutRecipient[];
  // Auto Top-Up
  tuChain?:     string;
  tuThreshold?: string;
  tuRefill?:    string;
  tuCap?:       string;
  // Auto Split
  splitTotal?:  string;
  splitFreq?:   string;
  splitRules?:  SplitRule[];
  // Auto Distribute
  distChain?:   string;
  distCap?:     string;
  distRules?:   SplitRule[];
}

export interface StoredTask {
  id:            string;   // Circle walletId
  walletAddress: string;   // Circle agent wallet address (funded by user)
  token:         string;   // HMAC token · required by server to authorize execution
  mode:          AgentMode;
  label:         string;
  sublabel:      string;
  status:        TaskStatus;
  createdAt:     string;
  nextRunAt:     string;   // ISO · when to fire next
  lastRunAt?:    string;
  lastResult?:   RunResult;
  lastError?:    string;
  runCount:      number;
  config:        TaskConfig;
}

// ── localStorage ──────────────────────────────────────────────
const KEY = "bento_agent_tasks";

export function loadTasks(): StoredTask[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

export function saveTasks(tasks: StoredTask[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

export function upsertTask(task: StoredTask): void {
  const all = loadTasks();
  const idx = all.findIndex(t => t.id === task.id);
  if (idx >= 0) all[idx] = task;
  else all.unshift(task);
  saveTasks(all);
}

// ── Time helpers ──────────────────────────────────────────────

/** Build ISO from YYYY-MM-DD + HH:MM (local time) */
export function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

/** Compute next recurrence after `after` date */
export function nextOccurrence(after: Date, freq: string, firstDate: string): Date {
  const d = new Date(after);
  if (freq === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (freq === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    // monthly · same calendar day as firstDate
    const day = new Date(firstDate + "T12:00:00").getDate();
    d.setMonth(d.getMonth() + 1);
    d.setDate(day);
  }
  return d;
}

/** Format ISO for display: "17 May · 15:18" */
export function fmtNextRun(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Returns a human countdown: "in 1m 30s" or "overdue" */
export function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "running now…";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (m > 60) return `in ${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 0)  return `in ${m}m ${s}s`;
  return `in ${s}s`;
}
