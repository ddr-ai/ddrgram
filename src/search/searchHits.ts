import type { SearchHit, WatchlistItem } from "../telegram/types";

const HIT_KEY = "tg-video-browser:search-hit:";

export function stashSearchHit(hit: SearchHit): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const { photoBlob: _photo, ...rest } = hit;
    sessionStorage.setItem(HIT_KEY + hit.peerId, JSON.stringify(rest));
  } catch {
    // ignore quota
  }
}

export function loadSearchHit(peerId: string): SearchHit | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HIT_KEY + peerId);
    if (!raw) return null;
    return JSON.parse(raw) as SearchHit;
  } catch {
    return null;
  }
}

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
