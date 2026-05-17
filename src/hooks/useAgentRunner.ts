"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  loadTasks, saveTasks, nextOccurrence,
  StoredTask, RunResult,
} from "@/lib/agentTasks";

interface RunnerOptions {
  /** Called whenever a task finishes (with updated task list) */
  onUpdate: (tasks: StoredTask[]) => void;
  /** Polling interval in ms (default: 20 000 = 20 s) */
  intervalMs?: number;
}

export function useAgentRunner({ onUpdate, intervalMs = 20_000 }: RunnerOptions) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const run = useCallback(async () => {
    const tasks  = loadTasks();
    const now    = new Date();
    let   changed = false;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (task.status !== "active") continue;
      if (!task.nextRunAt)         continue;
      if (new Date(task.nextRunAt) > now) continue;

      // ── Execute ──────────────────────────────────────────
      let result: RunResult = "fail";
      let errMsg = "";
      let nextRun = task.nextRunAt;

      try {
        const res  = await fetch("/api/agent/execute", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          // Send token alongside task — server verifies HMAC before executing
          body:    JSON.stringify({ task, token: task.token }),
        });
        const body = await res.json();

        if (res.ok) {
          result  = "ok";
          // Advance to next occurrence
          if (task.mode === "payout" && task.config.payoutRules?.length) {
            const rule     = task.config.payoutRules[0];
            const nextDate = nextOccurrence(now, task.config.payoutFreq ?? "monthly", rule.firstDate);
            // Keep same HH:MM
            const hhmm = rule.time;
            const yyyy = nextDate.getFullYear();
            const mm   = String(nextDate.getMonth() + 1).padStart(2, "0");
            const dd   = String(nextDate.getDate()).padStart(2, "0");
            nextRun    = new Date(`${yyyy}-${mm}-${dd}T${hhmm}:00`).toISOString();
          } else if (task.mode === "autosplit" && task.config.splitFreq) {
            const nextDate = nextOccurrence(now, task.config.splitFreq, "");
            nextRun = nextDate.toISOString();
          }
          console.log("[AgentRunner] task", task.id, "executed OK →", body);
        } else {
          errMsg = body.error ?? "Execution failed";
          console.error("[AgentRunner] task", task.id, "failed:", errMsg);
        }
      } catch (e: unknown) {
        errMsg = (e as Error).message ?? "Network error";
        console.error("[AgentRunner] task", task.id, "error:", errMsg);
      }

      tasks[i] = {
        ...task,
        lastRunAt:  now.toISOString(),
        lastResult: result,
        lastError:  errMsg || undefined,
        runCount:   (task.runCount ?? 0) + 1,
        nextRunAt:  nextRun,
      };
      changed = true;
    }

    if (changed) {
      saveTasks(tasks);
      onUpdateRef.current(tasks);
    }
  }, []);

  useEffect(() => {
    run(); // immediate check on mount
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);
}
