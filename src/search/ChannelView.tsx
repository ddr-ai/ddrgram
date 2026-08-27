import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatCount, formatDuration, hueFromId, initials } from "@/lib/format";
import { FilePreview } from "@/other/FilePreview";
import { saveBlobToDownloads } from "@/files/saveToDownloads";
import { addToOtherlist } from "@/stores/otherStore";
import { addToWatchlist } from "@/stores/watchlistStore";
import { AppError, parseTelegramError } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { FileItem, SearchHit, VideoItem, WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { startPrefetchForPeer } from "@/videos/prefetch";
import { pushUpsert } from "@/watchlist/syncClient";
import { hitToWatchlistItem, loadSearchHit } from "./searchHits";

export function ChannelView({
  peerId,
  addItem = addToWatchlist,
  addOtherItem = addToOtherlist,
}: {
  peerId: string;
  addItem?: (item: WatchlistItem) => Promise<void>;
  addOtherItem?: (item: WatchlistItem) => Promise<void>;
}) {
  const { port, me } = useTelegram();
  const navigate = useNavigate();
  const [hit, setHit] = useState<SearchHit | null>(() => loadSearchHit(peerId));
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setHit(loadSearchHit(peerId));
  }, [peerId]);

  useEffect(() => {
    if (!port || !hit) {
      setBusy(false);
      return;
    }
    const peer = hitToWatchlistItem(hit, 0);
    let cancelled = false;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const [v, f] = await Promise.all([
          port.searchVideos(peer),
          port.searchFiles(peer),
        ]);
        if (cancelled) return;
        setVideos(v.videos);
        setFiles(f.files);
      } catch (err) {
        if (!cancelled) setError(parseTelegramError(err).message);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [port, hit]);

  useEffect(() => {
    if (!port) return;
    let cancelled = false;
    for (const v of videos) {
      if (thumbs[v.msgId]) continue;
      void port.getVideoThumb(v.document).then((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        setThumbs((t) => ({ ...t, [v.msgId]: url }));
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, port]);

  const add = useCallback(
    async (dest: "watchlist" | "other") => {
      if (!hit) return;
      try {
        const item = hitToWatchlistItem(hit, Date.now());
        if (dest === "other") {
          await addOtherItem(item);
          toast.success("Added to Other");
          return;
        }
        await addItem(item);
        toast.success("Added to watchlist");
        void pushUpsert(me?.id ?? "", item);
        if (port) void startPrefetchForPeer(item, port);
      } catch (err) {
        toast.error(err instanceof AppError ? err.message : "Could not add");
      }
    },
    [hit, addItem, addOtherItem, me?.id, port],
  );

  async function join() {
    if (!port || !hit) return;
    try {
      const result = hit.username
        ? await port.joinByUsername(hit.username)
        : await port.joinChannel(hit);
      if (result.pending) {
        setPending(true);
        toast("Join request sent — pending approval");
      } else {
        toast.success("Joined");
        setHit({ ...hit, membership: "joined" });
      }
    } catch (err) {
      const parsed = parseTelegramError(err);
      if (parsed.code === "join_pending") {
        setPending(true);
        toast("Join request sent — pending approval");
        return;
      }
      toast.error(parsed.message);
    }
  }

  if (!hit) {
    return (
      <div className="flex h-full flex-col px-4 py-4">
        <Button variant="ghost" aria-label="Back" onClick={() => void navigate({ to: "/search" })}>
          <ChevronLeft className="size-5" />
          Back
        </Button>
        <p className="mt-4 text-sm text-muted">This search result is no longer available.</p>
      </div>
    );
  }

  const joined = pending || hit.membership === "joined";

  return (
    <div className="relative flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6" hidden={preview != null}>
        <div className="mb-4 flex items-start gap-2">
          <Button variant="ghost" aria-label="Back" onClick={() => void navigate({ to: "/search" })}>
            <ChevronLeft className="size-5" />
            Back
          </Button>
        </div>
        <div className="mb-5 flex items-center gap-3">
          <span
            className="search-avatar flex size-14 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
            style={{ background: `hsl(${hueFromId(hit.peerId)} 32% 24%)` }}
          >
            {initials(hit.title)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold tracking-tight">
              {hit.title}
            </h1>
            {hit.username ? (
              <p className="truncate text-xs text-subtle">@{hit.username}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted capitalize">
              {hit.kind}
              {hit.memberCount != null ? ` · ${formatCount(hit.memberCount)}` : ""}
            </p>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void join()}
            disabled={joined}
          >
            Join
          </Button>
          <Button onClick={() => void add("watchlist")}>Add to Watchlist</Button>
          <Button variant="secondary" onClick={() => void add("other")}>
            Add to Other
          </Button>
        </div>
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        {busy ? <p className="text-sm text-muted">Loading content…</p> : null}
        <section className="mb-8">
          <h2 className="mb-3 font-display text-base font-semibold">Videos</h2>
          {videos.length === 0 && !busy ? (
            <p className="text-sm text-muted">No videos in this channel/group.</p>
          ) : (
            <div className="video-grid">
              {videos.map((v) => (
                <div
                  key={v.msgId}
                  className="video-tile relative aspect-video overflow-hidden rounded-lg bg-surface-2"
                >
                  {thumbs[v.msgId] ? (
                    <img src={thumbs[v.msgId]} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 bg-surface-2" />
                  )}
                  {v.durationSec != null ? (
                    <span className="absolute right-1.5 bottom-1.5 rounded bg-bg/80 px-1.5 py-0.5 text-xs tabular-nums">
                      {formatDuration(v.durationSec)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-display text-base font-semibold">Files</h2>
          {files.length === 0 && !busy ? (
            <p className="text-sm text-muted">No downloadable files in this channel/group.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {files.map((file) => (
                <li key={`${file.kind}-${file.msgId}`}>
                  <button
                    type="button"
                    className="raised-card flex min-h-11 w-full items-center justify-between rounded-2xl bg-surface px-3 py-3 text-left"
                    aria-label={`View ${file.name}`}
                    onClick={() => setPreview(file)}
                  >
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="meta-chip capitalize">{file.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {preview ? (
        <FilePreview
          file={preview}
          port={port}
          onClose={() => setPreview(null)}
          saveFile={saveBlobToDownloads}
        />
      ) : null}
    </div>
  );
}
