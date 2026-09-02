import { useNavigate, useSearch } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { PlayerOverlay } from "@/player/PlayerOverlay";
import { useGridSize } from "@/stores/gridSizeStore";
import { loadGridScroll, saveGridScroll } from "@/stores/scrollStore";
import { listWatchlist } from "@/stores/watchlistStore";
import { AppError, errorMessage, parseTelegramError, userMessage } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { fetchAllVideoPages } from "./loadCatalog";
import { emptyVideoList, reduceVideoList } from "./videoList";

export function VideosTab({ peerId }: { peerId: string }) {
  const { port } = useTelegram();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { v?: number };
  const currentMsgId = search.v;
  const [peer, setPeer] = useState<WatchlistItem | null>(null);
  const [state, dispatch] = useReducer(reduceVideoList, undefined, emptyVideoList);
  const [error, setError] = useState<AppError | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [loadingAll, setLoadingAll] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<Record<number, string>>({});
  const requestId = useRef(0);
  const playerOpen = currentMsgId != null;
  const grid = useGridSize();
  thumbsRef.current = thumbs;

  useEffect(() => {
    let cancelled = false;
    requestId.current += 1;
    dispatch({ type: "reset" });
    setError(null);
    setPeer(null);
    for (const url of Object.values(thumbsRef.current)) URL.revokeObjectURL(url);
    thumbsRef.current = {};
    setThumbs({});
    void listWatchlist().then((list) => {
      if (cancelled) return;
      setPeer(list.find((x) => x.peerId === peerId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [peerId]);

  const loadAll = useCallback(async () => {
    if (!port || !peer) return;
    const id = ++requestId.current;
    dispatch({ type: "reset" });
    setError(null);
    setLoadingAll(true);
    try {
      const result = await fetchAllVideoPages({
        search: (offset) => port.searchVideos(peer, offset),
        onPage: (videos, nextOffset) => {
          if (id !== requestId.current) return;
          dispatch({ type: "page", videos, nextOffset });
        },
        isCancelled: () => id !== requestId.current,
      });
      if (id !== requestId.current) return;
      if (result.error) {
        setError(result.error);
        if (result.failedOnFirstPage) dispatch({ type: "error" });
        else toast.error(userMessage(result.error));
      }
    } finally {
      if (id === requestId.current) setLoadingAll(false);
    }
  }, [port, peer]);

  useEffect(() => {
    if (peer) void loadAll();
  }, [peer, loadAll]);

  useEffect(() => {
    if (!port) return;
    let cancelled = false;
    const queue = state.items.filter((v) => !thumbsRef.current[v.msgId]);
    let running = 0;
    const pump = () => {
      while (!cancelled && running < 3 && queue.length > 0) {
        const v = queue.shift()!;
        running += 1;
        void port
          .getVideoThumb(v.document)
          .then((blob) => {
            if (cancelled || !blob) return;
            let url: string;
            try {
              url = URL.createObjectURL(blob);
            } catch {
              return;
            }
            setThumbs((t) => {
              if (t[v.msgId]) {
                URL.revokeObjectURL(url);
                return t;
              }
              return { ...t, [v.msgId]: url };
            });
          })
          .catch(() => {
            // thumbs are best-effort
          })
          .finally(() => {
            running -= 1;
            if (!cancelled) pump();
          });
      }
    };
    pump();
    return () => {
      cancelled = true;
    };
  }, [state.items, port]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(thumbsRef.current)) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    if (playerOpen) return;
    const el = scroller.current;
    if (!el) return;
    const saved = loadGridScroll(peerId);
    if (!saved) return;
    el.scrollTop = saved.scrollTop;
    const cell = el.querySelector(`[data-msgid="${saved.anchorMsgId}"]`);
    if (cell) cell.scrollIntoView({ block: "nearest" });
  }, [playerOpen, peerId, state.items.length]);

  function openPlayer(msgId: number) {
    const el = scroller.current;
    saveGridScroll(peerId, el?.scrollTop ?? 0, msgId);
    void navigate({
      to: "/watchlist/$peerId",
      params: { peerId },
      search: { v: msgId },
    });
  }

  function closePlayer() {
    void navigate({
      to: "/watchlist/$peerId",
      params: { peerId },
      search: {},
    });
  }

  async function join() {
    if (!port || !peer) return;
    try {
      if (peer.username) await port.joinByUsername(peer.username);
      else await port.joinChannel(peer);
      await loadAll();
    } catch (err) {
      setError(parseTelegramError(err));
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={scroller}
        hidden={playerOpen}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5"
      >
        <div className="mb-3 flex items-center gap-2 px-1">
          <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight">
            {peer?.title ?? "Videos"}
          </h1>
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-surface-2 p-1 shadow-[var(--shadow-raised)]">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Smaller videos"
              disabled={!grid.canSmaller}
              onClick={() => grid.smaller()}
            >
              <Minus className="size-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Larger videos"
              disabled={!grid.canLarger}
              onClick={() => grid.larger()}
            >
              <Plus className="size-5" />
            </Button>
          </div>
        </div>
        {error?.code === "private_chat" ? (
          <div className="px-1">
            <p className="text-sm text-muted text-pretty">{userMessage(error)}</p>
            <Button className="mt-3" onClick={() => void join()}>
              Join
            </Button>
          </div>
        ) : null}
        {error && error.code !== "private_chat" && state.items.length === 0 ? (
          <div className="px-1">
            <p className="text-sm text-danger text-pretty">{userMessage(error)}</p>
            <Button className="mt-3" variant="outline" onClick={() => void loadAll()}>
              Retry
            </Button>
          </div>
        ) : null}
        {state.status === "empty" && !loadingAll ? (
          <p className="px-1 text-sm text-muted">No videos in this channel/group.</p>
        ) : null}
        {state.status === "loading" || (loadingAll && state.items.length === 0) ? (
          <p className="px-1 text-sm text-muted">Loading videos…</p>
        ) : null}
        {loadingAll && state.items.length > 0 ? (
          <p className="px-1 text-sm text-muted tabular-nums">
            Loading all videos… {state.items.length}
          </p>
        ) : null}
        <div
          className="video-grid"
          data-tile={grid.px}
          style={{ ["--video-tile" as string]: `${grid.px}px` }}
        >
          {state.items.map((v) => (
            <button
              key={v.msgId}
              type="button"
              data-msgid={v.msgId}
              className="video-tile group relative aspect-video overflow-hidden rounded-lg bg-surface-2"
              onClick={() => openPlayer(v.msgId)}
            >
              {thumbs[v.msgId] ? (
                <img
                  src={thumbs[v.msgId]}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 bg-surface-2" />
              )}
              {v.durationSec != null ? (
                <span className="absolute right-1.5 bottom-1.5 rounded bg-bg/80 px-1.5 py-0.5 text-xs tabular-nums">
                  {formatDuration(v.durationSec)}
                </span>
              ) : null}
            </button>
          ))}
        </div>

      </div>
      {playerOpen && peer ? (
        <PlayerOverlay
          items={state.items}
          currentMsgId={currentMsgId}
          peer={peer}
          onClose={closePlayer}
          onChangeMsgId={(id) =>
            void navigate({
              to: "/watchlist/$peerId",
              params: { peerId },
              search: { v: id },
            })
          }
        />
      ) : null}
    </div>
  );
}
