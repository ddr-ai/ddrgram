import {
  listCloudWatchlist,
  removeCloudWatchlistItem,
  setCloudWatchlistMuted,
  upsertCloudWatchlistItem,
} from "./syncFns";
import type { CloudWatchlistItem } from "./types";

export type CloudWatchlistApi = {
  list(userId: string): Promise<CloudWatchlistItem[]>;
  upsert(userId: string, item: CloudWatchlistItem): Promise<void>;
  remove(userId: string, peerId: string): Promise<void>;
  setMuted(userId: string, peerId: string, muted: boolean): Promise<void>;
};

export function createMemoryCloudApi(): CloudWatchlistApi {
  const users = new Map<string, Map<string, CloudWatchlistItem>>();

  function bucket(userId: string): Map<string, CloudWatchlistItem> {
    let rows = users.get(userId);
    if (!rows) {
      rows = new Map();
      users.set(userId, rows);
    }
    return rows;
  }

  return {
    async list(userId) {
      if (!userId) return [];
      return [...bucket(userId).values()].sort((a, b) => b.addedAt - a.addedAt);
    },
    async upsert(userId, item) {
      if (!userId) return;
      bucket(userId).set(item.peerId, { ...item });
    },
    async remove(userId, peerId) {
      if (!userId) return;
      users.get(userId)?.delete(peerId);
    },
    async setMuted(userId, peerId, muted) {
      if (!userId) return;
      const row = users.get(userId)?.get(peerId);
      if (!row) return;
      users.get(userId)!.set(peerId, { ...row, muted });
    },
  };
}

export const defaultCloudApi: CloudWatchlistApi = {
  list: (userId) => listCloudWatchlist({ data: { userId } }),
  upsert: (userId, item) => upsertCloudWatchlistItem({ data: { userId, item } }),
  remove: (userId, peerId) => removeCloudWatchlistItem({ data: { userId, peerId } }),
  setMuted: (userId, peerId, muted) =>
    setCloudWatchlistMuted({ data: { userId, peerId, muted } }),
};
