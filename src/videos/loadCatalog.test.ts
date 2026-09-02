import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/telegram/errors";
import type { VideoItem } from "@/telegram/types";
import { fetchAllVideoPages } from "./loadCatalog";

function video(msgId: number): VideoItem {
  return {
    msgId,
    peerId: "p",
    date: msgId,
    sizeBytes: 1,
    document: null,
  };
}

describe("fetchAllVideoPages", () => {
  it("walks every page without a scroll trigger", async () => {
    const pages = [
      { videos: [video(3), video(2)], nextOffset: "2" },
      { videos: [video(1)], nextOffset: null },
    ];
    let calls = 0;
    const received: number[][] = [];
    const result = await fetchAllVideoPages({
      search: async () => {
        const page = pages[calls]!;
        calls += 1;
        return page;
      },
      onPage: (videos) => {
        received.push(videos.map((v) => v.msgId));
      },
      isCancelled: () => false,
    });
    expect(result).toEqual({ error: null, failedOnFirstPage: false });
    expect(calls).toBe(2);
    expect(received).toEqual([
      [3, 2],
      [1],
    ]);
  });

  it("retries the same offset after flood_wait", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const search = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new AppError("flood_wait", "FLOOD_WAIT", 1);
      return { videos: [video(1)], nextOffset: null };
    });
    const done = fetchAllVideoPages({
      search,
      onPage: () => {},
      isCancelled: () => false,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await done;
    expect(result.error).toBeNull();
    expect(search).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("stops on a hard error and reports whether the first page failed", async () => {
    const err = new AppError("private_chat", "CHANNEL_PRIVATE");
    const result = await fetchAllVideoPages({
      search: async () => {
        throw err;
      },
      onPage: () => {},
      isCancelled: () => false,
    });
    expect(result.failedOnFirstPage).toBe(true);
    expect(result.error?.code).toBe("private_chat");
  });
});
