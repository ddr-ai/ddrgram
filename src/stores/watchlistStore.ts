import type { WatchlistItem } from "../telegram/types";
import { openDb } from "./db";

export async function addToWatchlist(item: WatchlistItem): Promise<void> {
  const db = await openDb();
  await db.put("watchlist", item);
}

export async function removeFromWatchlist(peerId: string): Promise<void> {
  const db = await openDb();
  await db.delete("watchlist", peerId);
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
}

export async function clearWatchlist(): Promise<void> {
  const db = await openDb();
  await db.clear("watchlist");
}
