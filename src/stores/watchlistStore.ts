import type { WatchlistItem } from "../telegram/types";
import { openDb } from "./db";

export const WATCHLIST_CHANGED = "ddrgram:watchlist";

function notifyWatchlistChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WATCHLIST_CHANGED));
}

export async function addToWatchlist(item: WatchlistItem): Promise<void> {
  const db = await openDb();
  await db.put("watchlist", item);
  notifyWatchlistChanged();
}

export async function removeFromWatchlist(peerId: string): Promise<void> {
  const db = await openDb();
  await db.delete("watchlist", peerId);
  notifyWatchlistChanged();
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const db = await openDb();
  const items = (await db.getAll("watchlist")) as WatchlistItem[];
  return items.sort((a, b) => b.addedAt - a.addedAt);
}

export async function updateWatchlistMuted(
  peerId: string,
  muted: boolean,
): Promise<void> {
  const db = await openDb();
  const item = (await db.get("watchlist", peerId)) as WatchlistItem | undefined;
  if (!item) return;
  await db.put("watchlist", { ...item, muted });
  notifyWatchlistChanged();
}

export async function replaceWatchlist(items: WatchlistItem[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("watchlist", "readwrite");
  await tx.store.clear();
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
  notifyWatchlistChanged();
}

export async function clearWatchlist(): Promise<void> {
  const db = await openDb();
  await db.clear("watchlist");
  notifyWatchlistChanged();
}
