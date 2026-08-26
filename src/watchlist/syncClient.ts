import { addToWatchlist, listWatchlist } from "@/stores/watchlistStore";
import type { WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { defaultCloudApi, type CloudWatchlistApi } from "./cloudApi";
import { enqueueOffline, loadOfflineQueue, saveOfflineQueue } from "./offlineQueue";
import { mergeWatchlists, toCloudItem } from "./syncLogic";
import type { CloudWatchlistItem } from "./types";

const SYNC_TOAST = "watchlist will sync when online";

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
    toast(SYNC_TOAST);
  }
}

export async function syncWatchlist(
  userId: string,
  api: CloudWatchlistApi = defaultCloudApi,
): Promise<WatchlistItem[]> {
  if (!userId) return listWatchlist();
  let cloud: CloudWatchlistItem[] = [];
  try {
    cloud = await api.list(userId);
  } catch {
    toast(SYNC_TOAST);
    return listWatchlist();
  }
  const local = await listWatchlist();
  const { localWrites, cloudUpserts } = mergeWatchlists(local, cloud);
  for (const item of localWrites) {
    await addToWatchlist(item);
  }
  for (const item of cloudUpserts) {
    await withCloud(
      userId,
      (cloudApi) => cloudApi.upsert(userId, item),
      () => enqueueOffline({ type: "upsert", item }),
      api,
    );
  }
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
