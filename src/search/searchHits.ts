import type { SearchHit, WatchlistItem } from "../telegram/types";

export function hitToWatchlistItem(
  hit: SearchHit,
  addedAt: number,
): WatchlistItem {
  return {
    peerId: hit.peerId,
    accessHash: hit.accessHash,
    username: hit.username,
    title: hit.title,
    kind: hit.kind,
    photoBlob: hit.photoBlob,
    muted: false,
    addedAt,
  };
}
