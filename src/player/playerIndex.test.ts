import { describe, expect, it } from "vitest";
import { nearbyMsgIds, neighborMsgIds } from "./playerIndex";

const items = [4, 3, 2, 1].map((msgId) => ({
  msgId,
  peerId: "p",
  date: msgId,
  sizeBytes: 1,
  document: null,
}));

describe("neighborMsgIds", () => {
  it("next is older, prev is newer", () => {
    expect(neighborMsgIds(items, 2)).toEqual({ prev: 3, next: 1 });
    expect(neighborMsgIds(items, 4)).toEqual({ prev: null, next: 3 });
  });
});

describe("nearbyMsgIds", () => {
  it("prefetches two ahead and one behind", () => {
    expect(nearbyMsgIds(items, 3, 1, 2)).toEqual([2, 1, 4]);
  });
});
