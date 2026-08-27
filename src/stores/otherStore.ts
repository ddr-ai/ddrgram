import type { WatchlistItem } from "../telegram/types";
import { openDb } from "./db";

export async function addToOtherlist(item: WatchlistItem): Promise<void> {
  const db = await openDb();
  await db.put("otherlist", item);
}

export async function removeFromOtherlist(peerId: string): Promise<void> {
  const db = await openDb();
  await db.delete("otherlist", peerId);
}

export async function listOtherlist(): Promise<WatchlistItem[]> {
  const db = await openDb();
  const items = (await db.getAll("otherlist")) as WatchlistItem[];
  return items.sort((a, b) => b.addedAt - a.addedAt);
}

export async function clearOtherlist(): Promise<void> {
  const db = await openDb();
  await db.clear("otherlist");
}
