import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItem } from "../telegram/types";
import { deleteDatabase } from "./db";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
  updateWatchlistMuted,
} from "./watchlistStore";

const item = (over: Partial<WatchlistItem> = {}): WatchlistItem => ({
  peerId: "1",
  accessHash: "h",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 100,
  ...over,
});

describe("watchlistStore", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("adds idempotently by peerId", async () => {
    await addToWatchlist(item({ title: "A", addedAt: 1 }));
    await addToWatchlist(item({ title: "B", addedAt: 2 }));
    const list = await listWatchlist();
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("B");
  });

  it("orders by addedAt descending", async () => {
    await addToWatchlist(item({ peerId: "1", addedAt: 1, title: "old" }));
    await addToWatchlist(item({ peerId: "2", addedAt: 2, title: "new" }));
    const titles = (await listWatchlist()).map((x) => x.title);
    expect(titles).toEqual(["new", "old"]);
  });

  it("remove does not leave the Telegram chat — it only drops the row", async () => {
    await addToWatchlist(item());
    await removeFromWatchlist("1");
    expect(await listWatchlist()).toEqual([]);
  });

  it("updates muted without changing other fields", async () => {
    await addToWatchlist(item({ muted: false, title: "Cats" }));
    await updateWatchlistMuted("1", true);
    const row = (await listWatchlist())[0]!;
    expect(row.muted).toBe(true);
    expect(row.title).toBe("Cats");
  });
});
