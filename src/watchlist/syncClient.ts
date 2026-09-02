import { listWatchlist, replaceWatchlist } from "@/stores/watchlistStore";
import type { WatchlistItem } from "@/telegram/types";
import { defaultCloudApi, type CloudWatchlistApi } from "./cloudApi";
import { enqueueOffline, loadOfflineQueue, saveOfflineQueue } from "./offlineQueue";
import { toCloudItem } from "./syncLogic";
import type { CloudWatchlistItem } from "./types";

async function withCloud(
  userId: string,
  run: (api: CloudWatchlistApi) => Promise<void>,
  onFail: () => Promise<void>,
  api: CloudWatchlistApi,
): Promise<void> {
  if (!userId) return;
  try {
    await run(api);
  } catch {
    await onFail();
  }
}

/** Load the watchlist from the single cloud database. Local IndexedDB is only a cache. */
export async function hydrateWatchlist(
  userId: string,
  api: CloudWatchlistApi = defaultCloudApi,
): Promise<WatchlistItem[]> {
  if (!userId) return listWatchlist();
  await flushOfflineQueue(userId, api);

  let cloud: CloudWatchlistItem[] = [];
  try {
    cloud = await api.list(userId);
  } catch {
    return listWatchlist();
  }

  const local = await listWatchlist();
  if (cloud.length === 0) {
    for (const item of local) {
      await withCloud(
        userId,
        (cloudApi) => cloudApi.upsert(userId, toCloudItem(item)),
        () => enqueueOffline({ type: "upsert", item: toCloudItem(item) }),
        api,
      );
    }
    return local;
  }

  const queued = await loadOfflineQueue();
  const pendingRemoves = new Set(
    queued.filter((op) => op.type === "remove").map((op) => op.peerId),
  );
  const pendingUpserts = queued.filter((op) => op.type === "upsert");
  const localByPeer = new Map(local.map((row) => [row.peerId, row]));
  const byPeer = new Map<string, WatchlistItem>();
  for (const row of cloud) {
    if (pendingRemoves.has(row.peerId)) continue;
    byPeer.set(row.peerId, {
      ...row,
      photoBlob: localByPeer.get(row.peerId)?.photoBlob,
    });
  }
  for (const op of pendingUpserts) {
    if (pendingRemoves.has(op.item.peerId)) continue;
    byPeer.set(op.item.peerId, {
      ...op.item,
      photoBlob: localByPeer.get(op.item.peerId)?.photoBlob,
    });
  }
  await replaceWatchlist([...byPeer.values()]);
  return listWatchlist();
}

export async function pushUpsert(
  userId: string,
  item: WatchlistItem,
  api: CloudWatchlistApi = defaultCloudApi,
): Promise<void> {
  const cloudItem = toCloudItem(item);
  await withCloud(
    userId,
    (cloudApi) => cloudApi.upsert(userId, cloudItem),
    () => enqueueOffline({ type: "upsert", item: cloudItem }),
    api,
  );
}

export async function pushRemove(
  userId: string,
  peerId: string,
  api: CloudWatchlistApi = defaultCloudApi,
): Promise<void> {
  await withCloud(
    userId,
    (cloudApi) => cloudApi.remove(userId, peerId),
    () => enqueueOffline({ type: "remove", peerId }),
    api,
  );
}

export async function pushMuted(
  userId: string,
  peerId: string,
  muted: boolean,
  api: CloudWatchlistApi = defaultCloudApi,
): Promise<void> {
  await withCloud(
    userId,
    (cloudApi) => cloudApi.setMuted(userId, peerId, muted),
    () => enqueueOffline({ type: "muted", peerId, muted }),
    api,
  );
}

export async function flushOfflineQueue(
  userId: string,
  api: CloudWatchlistApi = defaultCloudApi,
): Promise<void> {
  if (!userId) return;
  const ops = await loadOfflineQueue();
  if (ops.length === 0) return;
  const remaining = [...ops];
  while (remaining.length > 0) {
    const op = remaining[0]!;
    try {
      if (op.type === "upsert") await api.upsert(userId, op.item);
      else if (op.type === "remove") await api.remove(userId, op.peerId);
      else await api.setMuted(userId, op.peerId, op.muted);
      remaining.shift();
    } catch {
      break;
    }
  }
  await saveOfflineQueue(remaining);
}
