import { deleteDB, openDB, type IDBPDatabase } from "idb";

export const DB_NAME = "tg-video-browser";

type KvRecord = { key: string; value: unknown };

export type TgDb = IDBPDatabase<{
  watchlist: {
    key: string;
    value: import("../telegram/types").WatchlistItem;
  };
  kv: {
    key: string;
    value: KvRecord;
  };
}>;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function openDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("watchlist")) {
          db.createObjectStore("watchlist", { keyPath: "peerId" });
        }
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv", { keyPath: "key" });
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
