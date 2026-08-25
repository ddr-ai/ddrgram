import type { VideoItem } from "../telegram/types";

export function neighborMsgIds(
  items: VideoItem[],
  currentMsgId: number,
): { prev: number | null; next: number | null } {
  const i = items.findIndex((v) => v.msgId === currentMsgId);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? items[i - 1]!.msgId : null,
    next: i < items.length - 1 ? items[i + 1]!.msgId : null,
  };
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}
