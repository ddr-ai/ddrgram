import { ChevronLeft, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { neighborMsgIds, revokeObjectUrl } from "./playerIndex";
import { getCachedVideo, putCachedVideoWithEviction } from "@/stores/videoCacheStore";
import { errorMessage } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { VideoItem, WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";

export function PlayerOverlay({
  items,
  currentMsgId,
  peer,
  onClose,
  onChangeMsgId,
}: {
  items: VideoItem[];
  currentMsgId: number;
  peer: Pick<WatchlistItem, "peerId" | "accessHash">;
  onClose: () => void;
  onChangeMsgId: (id: number) => void;
}) {
  const { port } = useTelegram();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cache = useRef(new Map<number, Blob>());
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const current = items.find((v) => v.msgId === currentMsgId) ?? null;
  const neighbors = neighborMsgIds(items, currentMsgId);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onVis = () => {
      if (document.hidden) el.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!port || !current) return;
      setError(null);
      setProgress(0);
      setBusy(true);
      try {
        let blob = cache.current.get(current.msgId);
        if (!blob) {
          const disk = await getCachedVideo(peer.peerId, current.msgId);
          blob = disk?.blob;
        }
        if (!blob) {
          blob = await port.downloadVideo(current.document, (ratio) => {
            if (!cancelled) setProgress(ratio);
          });
          void persistCache(current.msgId, blob);
        }
        cache.current.set(current.msgId, blob);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setObjectUrl((prev) => {
          revokeObjectUrl(prev);
          return url;
        });
        setProgress(1);
        const { prev, next } = neighborMsgIds(items, current.msgId);
        void prefetch(prev);
        void prefetch(next);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    async function persistCache(msgId: number, blob: Blob) {
      const result = await putCachedVideoWithEviction({
        peerId: peer.peerId,
        msgId,
        blob,
        sizeBytes: blob.size,
        cachedAt: Date.now(),
      });
      if (result === "evicted" || result === "full") {
        toast("storage full, dropped old cache");
      }
    }
    async function prefetch(msgId: number | null) {
      if (!port || msgId == null || cache.current.has(msgId)) return;
      const item = items.find((v) => v.msgId === msgId);
      if (!item) return;
      try {
        const disk = await getCachedVideo(peer.peerId, msgId);
        if (disk) {
          if (!cancelled) cache.current.set(msgId, disk.blob);
          return;
        }
        const blob = await port.downloadVideo(item.document);
        if (!cancelled) cache.current.set(msgId, blob);
        void persistCache(msgId, blob);
      } catch {
        // prefetch is best-effort
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [current, items, port, peer.peerId, attempt]);

  useEffect(() => {
    return () => {
      setObjectUrl((prev) => {
        revokeObjectUrl(prev);
        return null;
      });
    };
  }, []);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (target?.tagName === "VIDEO") return;
      if (event.key === "ArrowLeft" && neighbors.prev != null) {
        event.preventDefault();
        onChangeMsgId(neighbors.prev);
      } else if (event.key === "ArrowRight" && neighbors.next != null) {
        event.preventDefault();
        onChangeMsgId(neighbors.next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [neighbors.prev, neighbors.next, onClose, onChangeMsgId]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" aria-label="Back" onClick={onClose}>
          <ChevronLeft className="size-5" />
          Back
        </Button>
        <span className="truncate text-sm text-muted">
          {current ? new Date(current.date * 1000).toLocaleString() : ""}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 bg-bg">
        {objectUrl ? (
          <video
            ref={videoRef}
            className="size-full object-contain"
            src={objectUrl}
            controls
            playsInline
            autoPlay
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
            {error ? (
              <>
                <p className="text-sm text-danger">{error}</p>
                <Button
                  onClick={() => {
                    cache.current.delete(currentMsgId);
                    setError(null);
                    setObjectUrl((u) => {
                      revokeObjectUrl(u);
                      return null;
                    });
                    setAttempt((n) => n + 1);
                  }}
                >
                  Retry
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted tabular-nums">
                {busy ? `Downloading ${Math.round(progress * 100)}%` : "Preparing…"}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button
          variant="secondary"
          disabled={neighbors.prev == null}
          onClick={() => neighbors.prev != null && onChangeMsgId(neighbors.prev)}
        >
          <SkipBack className="size-4" />
          Previous
        </Button>
        <Button onClick={togglePlay} disabled={!objectUrl}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="secondary"
          disabled={neighbors.next == null}
          onClick={() => neighbors.next != null && onChangeMsgId(neighbors.next)}
        >
          Next
          <SkipForward className="size-4" />
        </Button>
      </div>
    </div>
  );
}
