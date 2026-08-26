import { beforeEach, describe, expect, it } from "vitest";
import { deleteDatabase } from "./db";
import {
  evictOldestCachedVideos,
  getCachedVideo,
  putCachedVideo,
  putCachedVideoWithEviction,
} from "./videoCacheStore";

describe("videoCacheStore", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("puts and gets a cached video", async () => {
    const blob = new Blob(["a"]);
    await putCachedVideo({
      peerId: "p",
      msgId: 1,
      blob,
      sizeBytes: 1,
      cachedAt: 10,
    });
    const hit = await getCachedVideo("p", 1);
    expect(hit?.msgId).toBe(1);
    expect(await hit?.blob.text()).toBe("a");
  });

  it("QuotaExceeded on put → oldest evicted, newest saved", async () => {
    await putCachedVideo({
      peerId: "p",
      msgId: 1,
      blob: new Blob(["a"]),
      sizeBytes: 1,
      cachedAt: 1,
    });
    await putCachedVideo({
      peerId: "p",
      msgId: 2,
      blob: new Blob(["b"]),
      sizeBytes: 1,
      cachedAt: 2,
    });
    await evictOldestCachedVideos();
    expect(await getCachedVideo("p", 1)).toBeUndefined();
    expect(await getCachedVideo("p", 2)).toBeTruthy();
  });

  it("putCachedVideoWithEviction retries after quota", async () => {
    await putCachedVideo({
      peerId: "p",
      msgId: 1,
      blob: new Blob(["a"]),
      sizeBytes: 1,
      cachedAt: 1,
    });
    let calls = 0;
    const result = await putCachedVideoWithEviction(
      { peerId: "p", msgId: 3, blob: new Blob(["c"]), sizeBytes: 1, cachedAt: 3 },
      {
        put: async (row) => {
          calls += 1;
          if (calls === 1) {
            throw Object.assign(new Error("QuotaExceededError"), {
              name: "QuotaExceededError",
            });
          }
          await putCachedVideo(row);
        },
      },
    );
    expect(result).toBe("evicted");
    expect(await getCachedVideo("p", 1)).toBeUndefined();
    expect(await getCachedVideo("p", 3)).toBeTruthy();
  });
});
