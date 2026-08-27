import { beforeEach, describe, expect, it } from "vitest";
import type { WatchlistItem } from "../telegram/types";
import { deleteDatabase } from "./db";
import { addToOtherlist, listOtherlist, removeFromOtherlist } from "./otherStore";

const item = (over: Partial<WatchlistItem> = {}): WatchlistItem => ({
  peerId: "1",
  accessHash: "h",
  title: "Docs",
  kind: "channel",
  muted: false,
  addedAt: 100,
  ...over,
});

describe("otherStore", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("stores Other channels separately from the watchlist", async () => {
    await addToOtherlist(item({ title: "A" }));
    await addToOtherlist(item({ title: "B" }));
    const list = await listOtherlist();
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("B");
  });

  it("removes a row without affecting other items", async () => {
    await addToOtherlist(item({ peerId: "1" }));
    await addToOtherlist(item({ peerId: "2", title: "Keep" }));
    await removeFromOtherlist("1");
    const list = await listOtherlist();
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("Keep");
  });
});
