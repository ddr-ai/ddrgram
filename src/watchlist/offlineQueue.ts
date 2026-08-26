import { openDb } from "@/stores/db";
import type { CloudWatchlistItem } from "./types";

const QUEUE_KEY = "watchlistOfflineQueue";

export type OfflineOp =
  | { type: "upsert"; item: CloudWatchlistItem }
  | { type: "remove"; peerId: string }
  | { type: "muted"; peerId: string; muted: boolean };

async function readQueue(): Promise<OfflineOp[]> {
  const db = await openDb();
  const row = (await db.get("kv", QUEUE_KEY)) as { key: string; value: OfflineOp[] } | undefined;
  return row?.value ?? [];
}

async function writeQueue(ops: OfflineOp[]): Promise<void> {
  const db = await openDb();
  await db.put("kv", { key: QUEUE_KEY, value: ops });
}

export async function enqueueOffline(op: OfflineOp): Promise<void> {
  const ops = await readQueue();
  ops.push(op);
  await writeQueue(ops);
}

export async function loadOfflineQueue(): Promise<OfflineOp[]> {
  return readQueue();
}

export async function saveOfflineQueue(ops: OfflineOp[]): Promise<void> {
  await writeQueue(ops);
}
