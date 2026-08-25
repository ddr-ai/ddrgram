import { describe, expect, it } from "vitest";
import { neighborMsgIds } from "./playerIndex";

describe("neighborMsgIds", () => {
  it("next is older, prev is newer", () => {
    const items = [3, 2, 1].map((msgId) => ({
      msgId,
      peerId: "p",
      date: msgId,
      sizeBytes: 1,
      document: null,
    }));
    expect(neighborMsgIds(items, 2)).toEqual({ prev: 3, next: 1 });
    expect(neighborMsgIds(items, 3)).toEqual({ prev: null, next: 2 });
  });
});
