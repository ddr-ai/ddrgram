import { deleteDB, openDB, type IDBPDatabase } from "idb";

export const DB_NAME = "tg-video-browser";

type KvRecord = { key: string; value: unknown };

export type CachedVideoRecord = {
  id: string;
  peerId: string;
  msgId: number;
  blob: Blob;
  sizeBytes: number;
  cachedAt: number;
};

export type TgDb = IDBPDatabase<{
  watchlist: {
    key: string;
    value: import("../telegram/types").WatchlistItem;
  };
  kv: {
    key: string;
    value: KvRecord;
  };
  videoCache: {
    key: string;
    value: CachedVideoRecord;
    indexes: { cachedAt: number };
  };
}>;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function openDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains("watchlist")) {
            db.createObjectStore("watchlist", { keyPath: "peerId" });
          }
          if (!db.objectStoreNames.contains("kv")) {
            db.createObjectStore("kv", { keyPath: "key" });
          }
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains("videoCache")) {
          const store = db.createObjectStore("videoCache", { keyPath: "id" });
          store.createIndex("cachedAt", "cachedAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function resetDbConnection(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    }
    dbPromise = null;
  }
}

export async function deleteDatabase(): Promise<void> {
  await resetDbConnection();
  await deleteDB(DB_NAME);
}
