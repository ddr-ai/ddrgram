import { beforeEach, describe, expect, it } from "vitest";
import { deleteDatabase } from "@/stores/db";
import { putCachedVideo, getCachedVideo } from "@/stores/videoCacheStore";
import { addToWatchlist, listWatchlist, removeFromWatchlist } from "@/stores/watchlistStore";
import type { WatchlistItem } from "@/telegram/types";
import { createMemoryCloudApi } from "./cloudApi";
import { pushRemove, syncWatchlist } from "./syncClient";
import { toCloudItem } from "./syncLogic";

const local = (over: Partial<WatchlistItem> = {}): WatchlistItem => ({
  peerId: "1",
  accessHash: "h",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 100,
  ...over,
});

describe("syncWatchlist", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("local-only row is upserted to cloud", async () => {
    await addToWatchlist(local());
    const api = createMemoryCloudApi();
    await syncWatchlist("u", api);
    expect(await api.list("u")).toHaveLength(1);
    expect((await api.list("u"))[0]?.peerId).toBe("1");
  });

  it("cloud-only row appears locally", async () => {
    const api = createMemoryCloudApi();
    await api.upsert("u", toCloudItem(local()));
    await syncWatchlist("u", api);
    expect(await listWatchlist()).toHaveLength(1);
  });

  it("duplicate peerId does not double", async () => {
    await addToWatchlist(local());
    const api = createMemoryCloudApi();
    await api.upsert("u", toCloudItem(local({ title: "Cats" })));
    await syncWatchlist("u", api);
    expect(await listWatchlist()).toHaveLength(1);
    expect(await api.list("u")).toHaveLength(1);
  });

  it("remove calls cloud remove; local empty; does not touch video cache", async () => {
    await addToWatchlist(local());
    await putCachedVideo({
      peerId: "1",
      msgId: 9,
      blob: new Blob(["v"]),
      sizeBytes: 1,
      cachedAt: 1,
    });
    const api = createMemoryCloudApi();
    await api.upsert("u", toCloudItem(local()));
    await removeFromWatchlist("1");
    await pushRemove("u", "1", api);
    expect(await listWatchlist()).toEqual([]);
    expect(await api.list("u")).toEqual([]);
    expect(await getCachedVideo("1", 9)).toBeTruthy();
  });
});
