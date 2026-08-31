import type { VideoItem } from "../telegram/types";

export type VideoListState = {
  items: VideoItem[];
  nextOffset: string | null;
  status: "idle" | "loading" | "error" | "empty";
};

export type VideoListAction =
  | { type: "reset" }
  | { type: "page"; videos: VideoItem[]; nextOffset: string | null }
  | { type: "error" };

export function emptyVideoList(): VideoListState {
  return { items: [], nextOffset: null, status: "idle" };
}

export function reduceVideoList(
  state: VideoListState,
  action: VideoListAction,
): VideoListState {
  switch (action.type) {
    case "reset":
      return { items: [], nextOffset: null, status: "loading" };
    case "error":
      return { ...state, status: "error" };
    case "page": {
      const videos = Array.isArray(action.videos) ? action.videos : [];
      const seen = new Set(state.items.map((v) => v.msgId));
      const merged = [...state.items];
      let added = 0;
      for (const v of videos) {
        if (!v || v.msgId == null || seen.has(v.msgId)) continue;
        seen.add(v.msgId);
        merged.push(v);
        added += 1;
      }
      merged.sort((a, b) => (b.date ?? 0) - (a.date ?? 0) || b.msgId - a.msgId);
      const nextOffset = added === 0 ? null : action.nextOffset;
      const status =
        merged.length === 0 && !nextOffset ? "empty" : "idle";
      return { items: merged, nextOffset, status };
    }
    default:
      return state;
  }
}
