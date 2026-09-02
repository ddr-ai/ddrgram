import { parseTelegramError, type AppError } from "@/telegram/errors";
import type { VideoItem } from "@/telegram/types";

export type VideoPage = {
  videos: VideoItem[];
  nextOffset: string | null;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Pull every video page in the background. Does not wait for the user to scroll. */
export async function fetchAllVideoPages(options: {
  search: (offset?: string) => Promise<VideoPage>;
  onPage: (videos: VideoItem[], nextOffset: string | null) => void;
  isCancelled: () => boolean;
}): Promise<{ error: AppError | null; failedOnFirstPage: boolean }> {
  let offset: string | undefined;
  let first = true;
  while (!options.isCancelled()) {
    try {
      const page = await options.search(offset);
      if (options.isCancelled()) return { error: null, failedOnFirstPage: false };
      options.onPage(page.videos, page.nextOffset);
      first = false;
      if (!page.nextOffset) return { error: null, failedOnFirstPage: false };
      if (offset != null && page.nextOffset === offset) {
        return { error: null, failedOnFirstPage: false };
      }
      offset = page.nextOffset;
    } catch (err) {
      const parsed = parseTelegramError(err);
      if (parsed.code === "flood_wait") {
        const seconds = Math.max(1, parsed.waitSeconds ?? 1);
        await sleep(seconds * 1000);
        continue;
      }
      return { error: parsed, failedOnFirstPage: first };
    }
  }
  return { error: null, failedOnFirstPage: false };
}
