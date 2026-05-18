"use client";

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { StoredTask } from "./agentTasks";

const COLLECTION = "bento-tasks";

/**
 * Load tasks for a wallet address from Firestore.
 * Returns [] on error (graceful degradation to localStorage).
 */
export async function loadTasksFromFirestore(walletAddress: string): Promise<StoredTask[]> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, walletAddress.toLowerCase()));
    if (!snap.exists()) return [];
    return (snap.data().tasks as StoredTask[]) ?? [];
  } catch (err) {
    console.warn("[firestore] load failed:", err);
    return [];
  }
}

/**
 * Save tasks for a wallet address to Firestore.
 * Fails silently — localStorage is always kept in sync as fallback.
 */
export async function saveTasksToFirestore(
  walletAddress: string,
  tasks: StoredTask[]
): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTION, walletAddress.toLowerCase()), {
      tasks,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[firestore] save failed:", err);
  }
}

/**
 * Merge two task lists: remote wins on conflict (same id), keeps local-only tasks.
 */
export function mergeTaskLists(local: StoredTask[], remote: StoredTask[]): StoredTask[] {
  const map = new Map<string, StoredTask>();
  local.forEach(t => map.set(t.id, t));
  remote.forEach(t => map.set(t.id, t)); // remote overwrites local
  return Array.from(map.values());
}
