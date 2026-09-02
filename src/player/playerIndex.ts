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

/** Next items first (playback direction), then previous. */
export function nearbyMsgIds(
  items: VideoItem[],
  currentMsgId: number,
  behind = 1,
  ahead = 2,
): number[] {
  const i = items.findIndex((v) => v.msgId === currentMsgId);
  if (i < 0) return [];
  const ids: number[] = [];
  for (let d = 1; d <= ahead; d++) {
    const id = items[i + d]?.msgId;
    if (id != null) ids.push(id);
  }
  for (let d = 1; d <= behind; d++) {
    const id = items[i - d]?.msgId;
    if (id != null) ids.push(id);
  }
  return ids;
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}
