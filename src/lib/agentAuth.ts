/**
 * Server-side HMAC utilities for protecting /api/agent/* routes.
 *
 * Flow:
 *  1. POST /api/agent/wallet  →  creates Circle wallet, returns token = HMAC(walletId)
 *  2. Client stores {walletId, walletAddress, token} in localStorage
 *  3. POST /api/agent/execute | /api/agent/send  →  client sends token
 *  4. Server calls verifyToken(walletId, token) before executing
 *
 * Without AGENT_HMAC_SECRET an attacker cannot forge a valid token.
 */

import { createHmac, timingSafeEqual } from "crypto";

function hmacSecret(): string {
  const s = process.env.AGENT_HMAC_SECRET;
  if (!s) throw new Error("AGENT_HMAC_SECRET is not set");
  return s;
}

/** Generate a token for a wallet id */
export function signWalletId(walletId: string): string {
  return createHmac("sha256", hmacSecret()).update(walletId).digest("hex");
}

/** Verify that token matches walletId — timing-safe */
export function verifyToken(walletId: string, token: string): boolean {
  try {
    const expected = Buffer.from(signWalletId(walletId), "hex");
    const actual   = Buffer.from(token, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Express-style helper — returns 401 NextResponse or null */
export function requireToken(
  walletId: string | undefined,
  token: string | undefined,
): { ok: false; error: string } | { ok: true } {
  if (!walletId || !token) return { ok: false, error: "Missing walletId or token" };
  if (!verifyToken(walletId, token)) return { ok: false, error: "Invalid token" };
  return { ok: true };
}
