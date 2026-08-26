import { openDb, type CachedVideoRecord } from "./db";

export type CachedVideo = CachedVideoRecord;

type StoredVideo = Omit<CachedVideo, "blob"> & {
  buffer: ArrayBuffer;
  type: string;
};

export function cacheId(peerId: string, msgId: number): string {
  return `${peerId}:${msgId}`;
}

function isQuotaExceeded(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function fromStored(row: StoredVideo): CachedVideo {
  return {
    id: row.id,
    peerId: row.peerId,
    msgId: row.msgId,
    blob: new Blob([row.buffer], { type: row.type }),
    sizeBytes: row.sizeBytes,
    cachedAt: row.cachedAt,
  };
}

async function toStored(entry: Omit<CachedVideo, "id">): Promise<StoredVideo> {
  return {
    id: cacheId(entry.peerId, entry.msgId),
    peerId: entry.peerId,
    msgId: entry.msgId,
    buffer: await entry.blob.arrayBuffer(),
    type: entry.blob.type,
    sizeBytes: entry.sizeBytes,
    cachedAt: entry.cachedAt,
  };
}

export async function getCachedVideo(
  peerId: string,
  msgId: number,
): Promise<CachedVideo | undefined> {
  const db = await openDb();
  const row = (await db.get("videoCache", cacheId(peerId, msgId))) as StoredVideo | undefined;
  return row ? fromStored(row) : undefined;
}

export async function putCachedVideo(entry: Omit<CachedVideo, "id">): Promise<void> {
  const db = await openDb();
  await db.put("videoCache", await toStored(entry));
}

export async function evictOldestCachedVideos(): Promise<number> {
  const db = await openDb();
  const all = ((await db.getAllFromIndex("videoCache", "cachedAt")) as StoredVideo[]) ?? [];
  if (all.length === 0) return 0;
  const n = all.length < 5 ? 1 : 5;
  const toDelete = all.slice(0, n);
  for (const row of toDelete) {
    await db.delete("videoCache", row.id);
  }
  return toDelete.length;
}

export async function putCachedVideoWithEviction(
  entry: Omit<CachedVideo, "id">,
  deps?: { put?: (row: CachedVideo) => Promise<void> },
): Promise<"ok" | "evicted" | "full"> {
  const row: CachedVideo = { ...entry, id: cacheId(entry.peerId, entry.msgId) };
  const put =
    deps?.put ??
    (async (next: CachedVideo) => {
      await putCachedVideo(next);
    });
  try {
    await put(row);
    return "ok";
  } catch (err) {
    if (!isQuotaExceeded(err)) throw err;
    const deleted = await evictOldestCachedVideos();
    if (deleted === 0) return "full";
    try {
      await put(row);
      return "evicted";
    } catch (retryErr) {
      if (isQuotaExceeded(retryErr)) return "full";
      throw retryErr;
    }
  }
}
