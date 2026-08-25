import { describe, expect, it } from "vitest";
import { hitToWatchlistItem } from "./searchHits";
import type { SearchHit } from "../telegram/types";

describe("hitToWatchlistItem", () => {
  it("copies identity fields and stamps addedAt", () => {
    const hit: SearchHit = {
      peerId: "9",
      accessHash: "ah",
      username: "cats",
      title: "Cats",
      kind: "channel",
      membership: "unknown",
    };
    const item = hitToWatchlistItem(hit, 42);
    expect(item).toMatchObject({
      peerId: "9",
      accessHash: "ah",
      username: "cats",
      title: "Cats",
      kind: "channel",
      muted: false,
      addedAt: 42,
    });
  });
});
