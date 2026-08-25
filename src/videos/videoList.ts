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
      const seen = new Set(state.items.map((v) => v.msgId));
      const merged = [...state.items];
      for (const v of action.videos) {
        if (!seen.has(v.msgId)) {
          seen.add(v.msgId);
          merged.push(v);
        }
      }
      merged.sort((a, b) => b.date - a.date || b.msgId - a.msgId);
      const status =
        merged.length === 0 && !action.nextOffset ? "empty" : "idle";
      return { items: merged, nextOffset: action.nextOffset, status };
    }
    default:
      return state;
  }
}
