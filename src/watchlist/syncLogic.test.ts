import { describe, expect, it } from "vitest";
import { mergeWatchlists, toCloudItem } from "./syncLogic";
import type { WatchlistItem } from "@/telegram/types";

const local = (over: Partial<WatchlistItem> = {}): WatchlistItem => ({
  peerId: "1",
  accessHash: "h",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 100,
  ...over,
});

describe("toCloudItem", () => {
  it("drops photoBlob", () => {
    const item = local({ photoBlob: new Blob(["x"]) });
    expect(toCloudItem(item)).toEqual({
      peerId: "1",
      accessHash: "h",
      title: "Cats",
      kind: "channel",
      muted: false,
      addedAt: 100,
    });
  });
});

describe("mergeWatchlists", () => {
  it("upserts local-only rows to cloud", () => {
    const { cloudUpserts, localWrites } = mergeWatchlists([local()], []);
    expect(cloudUpserts).toHaveLength(1);
    expect(localWrites).toEqual([]);
  });
  it("writes cloud-only rows locally without doubling", () => {
    const { localWrites, cloudUpserts } = mergeWatchlists([], [toCloudItem(local())]);
    expect(localWrites).toHaveLength(1);
    expect(cloudUpserts).toEqual([]);
  });
  it("keeps later addedAt when both exist", () => {
    const { localWrites, cloudUpserts } = mergeWatchlists(
      [local({ addedAt: 1, title: "old" })],
      [toCloudItem(local({ addedAt: 2, title: "new" }))],
    );
    expect(localWrites[0]?.title).toBe("new");
    expect(cloudUpserts).toEqual([]);
  });
  it("when addedAt equal, cloud muted wins", () => {
    const { localWrites } = mergeWatchlists(
      [local({ addedAt: 5, muted: false })],
      [toCloudItem(local({ addedAt: 5, muted: true }))],
    );
    expect(localWrites[0]?.muted).toBe(true);
  });
  it("upserts newer local row to cloud", () => {
    const { localWrites, cloudUpserts } = mergeWatchlists(
      [local({ addedAt: 9, title: "mine" })],
      [toCloudItem(local({ addedAt: 2, title: "theirs" }))],
    );
    expect(localWrites).toEqual([]);
    expect(cloudUpserts[0]?.title).toBe("mine");
  });
  it("preserves local photo when applying newer cloud row", () => {
    const photo = new Blob(["p"]);
    const { localWrites } = mergeWatchlists(
      [local({ addedAt: 1, photoBlob: photo })],
      [toCloudItem(local({ addedAt: 2, title: "new" }))],
    );
    expect(localWrites[0]?.photoBlob).toBe(photo);
    expect(localWrites[0]?.title).toBe("new");
  });
});
