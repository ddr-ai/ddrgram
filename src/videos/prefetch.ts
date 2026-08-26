import { openDb } from "@/stores/db";
import {
  getCachedVideo,
  putCachedVideoWithEviction,
} from "@/stores/videoCacheStore";
import { parseTelegramError } from "@/telegram/errors";
import type { TelegramPort } from "@/telegram/port";
import type { WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";

export const PREFETCH_CAP = 50;
const CONCURRENCY = 2;
const HIDDEN_PAUSE_MS = 5 * 60_000;
const STORAGE_TOAST = "storage full, dropped old cache";

type PrefetchCursor = {
  nextOffset: string | null;
  completedMsgIds: number[];
};

let prefetchStopped = false;
let inFlight = 0;
const waiters: Array<() => void> = [];
let toastedStorageFull = false;

function cursorKey(peerId: string): string {
  return `prefetch:${peerId}`;
}

async function loadCursor(peerId: string): Promise<PrefetchCursor> {
  const db = await openDb();
  const row = (await db.get("kv", cursorKey(peerId))) as
    | { key: string; value: PrefetchCursor }
    | undefined;
  return row?.value ?? { nextOffset: "", completedMsgIds: [] };
}

async function saveCursor(peerId: string, cursor: PrefetchCursor): Promise<void> {
  const db = await openDb();
  await db.put("kv", { key: cursorKey(peerId), value: cursor });
}

function acquire(): Promise<void> {
  if (inFlight < CONCURRENCY) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function release(): void {
  inFlight = Math.max(0, inFlight - 1);
  const next = waiters.shift();
  if (next) next();
}

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitIfHidden(): Promise<void> {
  if (typeof document === "undefined" || document.visibilityState !== "hidden") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(finish, HIDDEN_PAUSE_MS);
    function onVis() {
      if (document.visibilityState === "visible") finish();
    }
    function finish() {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      resolve();
    }
    document.addEventListener("visibilitychange", onVis);
  });
}

function noteStoragePressure(result: "ok" | "evicted" | "full"): void {
  if (result === "ok") return;
  if (!toastedStorageFull) {
    toastedStorageFull = true;
    toast(STORAGE_TOAST);
  }
  if (result === "full") prefetchStopped = true;
}

export async function startPrefetchForPeer(
  peer: WatchlistItem,
  port: TelegramPort,
): Promise<void> {
  if (prefetchStopped) return;
  const cursor = await loadCursor(peer.peerId);
  const completed = new Set(cursor.completedMsgIds);
  if (completed.size >= PREFETCH_CAP) return;

  let nextOffset: string | null | "" = cursor.nextOffset;

  while (completed.size < PREFETCH_CAP && !prefetchStopped) {
    await waitIfHidden();
    if (prefetchStopped) return;
    if (nextOffset === null) break;

    const offset = nextOffset === "" ? undefined : nextOffset;
    let page;
    try {
      page = await port.searchVideos(peer, offset);
    } catch (err) {
      const parsed = parseTelegramError(err);
      if (parsed.code === "private_chat") return;
      if (parsed.code === "flood_wait") {
        await sleep((parsed.waitSeconds ?? 0) * 1000);
        continue;
      }
      return;
    }

    for (const video of page.videos) {
      if (completed.size >= PREFETCH_CAP || prefetchStopped) break;
      if (completed.has(video.msgId)) continue;
      const cached = await getCachedVideo(peer.peerId, video.msgId);
      if (cached) {
        completed.add(video.msgId);
        continue;
      }
      try {
        await withSlot(async () => {
          await waitIfHidden();
          if (prefetchStopped) return;
          const blob = await port.downloadVideo(video.document);
          const result = await putCachedVideoWithEviction({
            peerId: peer.peerId,
            msgId: video.msgId,
            blob,
            sizeBytes: blob.size,
            cachedAt: Date.now(),
          });
          noteStoragePressure(result);
        });
      } catch (err) {
        const parsed = parseTelegramError(err);
        if (parsed.code === "flood_wait") {
          await sleep((parsed.waitSeconds ?? 0) * 1000);
          continue;
        }
        if (parsed.code === "private_chat") return;
        return;
      }
      completed.add(video.msgId);
    }

    nextOffset = page.nextOffset;
    await saveCursor(peer.peerId, {
      nextOffset,
      completedMsgIds: [...completed],
    });
    if (page.nextOffset == null) break;
  }
}

export async function startPrefetchForWatchlist(
  items: WatchlistItem[],
  port: TelegramPort,
): Promise<void> {
  prefetchStopped = false;
  toastedStorageFull = false;
  await Promise.all(items.map((item) => startPrefetchForPeer(item, port)));
}
