import { describe, expect, it } from "vitest";
import { emptyVideoList, reduceVideoList } from "./videoList";

describe("reduceVideoList", () => {
  it("dedupes by msgId and keeps newest-first order", () => {
    const a = { msgId: 3, peerId: "p", date: 3, sizeBytes: 1, document: null };
    const b = { msgId: 2, peerId: "p", date: 2, sizeBytes: 1, document: null };
    const s1 = reduceVideoList(emptyVideoList(), {
      type: "page",
      videos: [a, b],
      nextOffset: "x",
    });
    const s2 = reduceVideoList(s1, {
      type: "page",
      videos: [b],
      nextOffset: null,
    });
    expect(s2.items.map((v) => v.msgId)).toEqual([3, 2]);
    expect(s2.nextOffset).toBeNull();
  });

  it("marks empty when first page has no videos", () => {
    const s = reduceVideoList(emptyVideoList(), {
      type: "page",
      videos: [],
      nextOffset: null,
    });
    expect(s.status).toBe("empty");
  });

  it("keeps paging when a page has no new videos but a new offset", () => {
    const s = reduceVideoList(emptyVideoList(), {
      type: "page",
      videos: [],
      nextOffset: "9",
    });
    expect(s.nextOffset).toBe("9");
    expect(s.status).toBe("idle");
  });

  it("does not throw on a malformed page and stops pagination when nothing new arrives", () => {
    const a = { msgId: 3, peerId: "p", date: 3, sizeBytes: 1, document: null };
    const loaded = reduceVideoList(emptyVideoList(), {
      type: "page",
      videos: [a],
      nextOffset: "3",
    });
    const junk = reduceVideoList(loaded, {
      type: "page",
      videos: undefined as unknown as [],
      nextOffset: "3",
    });
    expect(junk.items).toEqual(loaded.items);
    expect(junk.nextOffset).toBeNull();
  });
});
