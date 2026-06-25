import { NextResponse } from "next/server";

// GET /api/agent/cron  · called by Vercel Cron every minute
// Tasks are stored in localStorage (client), so the server-side cron
// is a no-op placeholder for now.  When a database is added, this
// route will load tasks from DB and execute due ones.
//
// Primary execution path: client-side useAgentRunner (every 20 s while
// the browser tab is open) · this is already live and functional.
export async function GET() {
  return NextResponse.json({
    ok:   true,
    note: "Client-side runner handles execution while browser is open. DB-backed cron coming soon.",
    ts:   new Date().toISOString(),
  });
}
