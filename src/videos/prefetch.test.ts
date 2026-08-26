import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDatabase } from "@/stores/db";
import { putCachedVideo } from "@/stores/videoCacheStore";
import { createMockPort } from "@/telegram/mockPort";
import type { WatchlistItem } from "@/telegram/types";
import { startPrefetchForPeer } from "./prefetch";

const peer: WatchlistItem = {
  peerId: "p",
  accessHash: "h",
  title: "t",
  kind: "channel",
  muted: false,
  addedAt: 1,
};

describe("startPrefetchForPeer", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("downloads each of 3 videos once and skips already-cached", async () => {
    const download = vi.fn(async (doc: { id: number }) => new Blob([String(doc.id)]));
    const port = createMockPort({
      searchVideos: async () => ({
        videos: [1, 2, 3].map((msgId) => ({
          msgId,
          peerId: "p",
          date: msgId,
          sizeBytes: 1,
          document: { id: msgId },
        })),
        nextOffset: null,
      }),
      downloadVideo: download,
    });
    await putCachedVideo({
      peerId: "p",
      msgId: 2,
      blob: new Blob(["x"]),
      sizeBytes: 1,
      cachedAt: 0,
    });
    await startPrefetchForPeer(peer, port);
    expect(download).toHaveBeenCalledTimes(2);
  });
});
