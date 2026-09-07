import type { SupabaseClient } from "@supabase/supabase-js";

const QUEUE_KEY = "nexus-offline-capture-queue";

export type QueuedCapture = {
  localId: string;
  raw_text: string;
  user_id: string;
  captured_at: string;
};

function readQueue(): QueuedCapture[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedCapture[]) : [];
  } catch {
    // Corrupted or inaccessible storage shouldn't crash capture — treat as empty.
    return [];
  }
}

function writeQueue(queue: QueuedCapture[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — the item stays
    // in memory for this session only, nothing more we can do here.
  }
}

export function enqueueCapture(item: QueuedCapture) {
  writeQueue([...readQueue(), item]);
}

export function getQueuedCaptureCount(): number {
  return readQueue().length;
}

/**
 * True when a Postgrest/Supabase error looks like a connectivity problem
 * (request never reached the server) rather than a real rejection from it
 * (RLS denial, constraint violation, expired auth, etc). Network failures
 * are safe to retry later; real rejections are not — retrying those forever
 * would just re-fail the same way on every reconnect.
 */
function isConnectivityError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  if (!error.code) return true;
  return /fetch|network|NetworkError/i.test(error.message ?? "");
}

/**
 * Attempts to sync every queued capture. Items that fail for connectivity
 * reasons are kept for the next attempt; items that fail for a real reason
 * are dropped (and logged) so a single bad row can't block the rest of the
 * queue forever.
 */
export async function flushCaptureQueue(
  supabase: SupabaseClient,
): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const stillQueued: QueuedCapture[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      const { error } = await supabase.from("inbox_items").insert({
        raw_text: item.raw_text,
        user_id: item.user_id,
        captured_at: item.captured_at,
      });
      if (!error) {
        synced += 1;
        continue;
      }
      if (isConnectivityError(error)) {
        stillQueued.push(item);
      } else {
        console.error("Dropping queued capture after permanent error", {
          code: error.code,
        });
      }
    } catch {
      // Thrown fetch failure (e.g. offline mid-flush) — keep it for next time.
      stillQueued.push(item);
    }
  }

  writeQueue(stillQueued);
  return { synced, remaining: stillQueued.length };
}
