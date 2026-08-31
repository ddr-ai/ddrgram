import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatCount, hueFromId, initials } from "@/lib/format";
import { FilePreview } from "@/other/FilePreview";
import { PlayerOverlay } from "@/player/PlayerOverlay";
import { saveBlobToDownloads } from "@/files/saveToDownloads";
import { addToOtherlist } from "@/stores/otherStore";
import { addToWatchlist } from "@/stores/watchlistStore";
import { AppError, parseTelegramError, userMessage } from "@/telegram/errors";
import {
  mergeMessagePages,
  showSenderName,
  threadSections,
} from "@/telegram/messages";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { ChatMessage, FileItem, SearchHit, VideoItem, WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { startPrefetchForPeer } from "@/videos/prefetch";
import { pushUpsert } from "@/watchlist/syncClient";
import { hitToWatchlistItem, loadSearchHit } from "./searchHits";
import { ThreadBubble } from "./ThreadBubble";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const [busy, setBusy] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const thumbUrls = useRef<string[]>([]);
  const initialScrolled = useRef(false);
  const pendingRestore = useRef<{ height: number; top: number } | null>(null);
  const requestId = useRef(0);
  const overlayOpen = preview != null || playing != null;

  useEffect(() => {
    requestId.current += 1;
    setHit((current) =>
      current?.peerId === peerId ? current : loadSearchHit(peerId),
    );
    for (const url of thumbUrls.current) URL.revokeObjectURL(url);
    thumbUrls.current = [];
    setMessages([]);
    setNextOffset(null);
    setThumbs({});
    setPreview(null);
    setPlaying(null);
    setBusy(true);
    setError(null);
    initialScrolled.current = false;
  }, [peerId]);

  const loadPage = useCallback(
    async (offset?: string) => {
      if (!port || !hit) return;
      const id = requestId.current;
      const peer = hitToWatchlistItem(hit, 0);
      const el = scroller.current;
      if (offset && el) {
        pendingRestore.current = { height: el.scrollHeight, top: el.scrollTop };
        setLoadingOlder(true);
      } else {
        setBusy(true);
      }
      setError(null);
      try {
        const page = await port.listMessages(peer, offset);
        if (id !== requestId.current) return;
        setMessages((current) =>
          offset ? mergeMessagePages(current, page.messages) : page.messages,
        );
        setNextOffset(page.nextOffset);
      } catch (err) {
        if (id !== requestId.current) return;
        const parsed = parseTelegramError(err);
        setError(
          parsed.code === "private_chat"
            ? "Join this channel or group to read the conversation."
            : userMessage(parsed),
        );
      } finally {
        if (id === requestId.current) {
          setBusy(false);
          setLoadingOlder(false);
        }
      }
    },
    [port, hit],
  );

  useEffect(() => {
    if (!port || !hit) {
      setBusy(false);
      return;
    }
    void loadPage();
  }, [port, hit, loadPage]);

  useEffect(() => {
    if (!port) return;
    let cancelled = false;
    for (const msg of messages) {
      for (const photo of msg.photos) {
        const key = `p:${photo.msgId}`;
        if (thumbs[key]) continue;
        void port.getFileThumb(photo.media).then((blob) => {
          if (cancelled || !blob) return;
          const url = URL.createObjectURL(blob);
          thumbUrls.current.push(url);
          setThumbs((t) => (t[key] ? t : { ...t, [key]: url }));
        });
      }
      for (const video of msg.videos) {
        const key = `v:${video.msgId}`;
        if (thumbs[key]) continue;
        void port.getVideoThumb(video.document).then((blob) => {
          if (cancelled || !blob) return;
          const url = URL.createObjectURL(blob);
          thumbUrls.current.push(url);
          setThumbs((t) => (t[key] ? t : { ...t, [key]: url }));
        });
      }
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, port]);

  useEffect(() => {
    return () => {
      for (const url of thumbUrls.current) URL.revokeObjectURL(url);
    };
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || overlayOpen) return;
    const restore = pendingRestore.current;
    if (restore) {
      el.scrollTop = restore.top + (el.scrollHeight - restore.height);
      pendingRestore.current = null;
      return;
    }
    if (!initialScrolled.current && !busy) {
      if (messages.length > 0) el.scrollTop = el.scrollHeight;
      initialScrolled.current = true;
    }
  }, [messages, busy, overlayOpen]);

  useEffect(() => {
    const root = scroller.current;
    const el = topSentinel.current;
    if (!root || !el || overlayOpen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          nextOffset &&
          !loadingOlder &&
          !busy &&
          initialScrolled.current
        ) {
          void loadPage(nextOffset);
        }
      },
      { root, threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nextOffset, loadingOlder, busy, loadPage, overlayOpen]);

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
        toast.error(err instanceof AppError ? userMessage(err) : "Could not add");
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
        initialScrolled.current = false;
        setHit({ ...hit, membership: "joined" });
      }
    } catch (err) {
      const parsed = parseTelegramError(err);
      if (parsed.code === "join_pending") {
        setPending(true);
        toast("Join request sent — pending approval");
        return;
      }
      toast.error(userMessage(parsed));
    }
  }

  const sections = useMemo(() => threadSections(messages), [messages]);
  const allVideos = useMemo(
    () => messages.flatMap((msg) => msg.videos),
    [messages],
  );

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
  const peer = hitToWatchlistItem(hit, 0);

  return (
    <div className="relative flex h-full flex-col">
      <header className="thread-header" hidden={overlayOpen}>
        <div className="flex items-center gap-2 px-2 pt-2">
          <Button variant="ghost" aria-label="Back" onClick={() => void navigate({ to: "/search" })}>
            <ChevronLeft className="size-5" />
            Back
          </Button>
          <span
            className="search-avatar flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
            style={{ background: `hsl(${hueFromId(hit.peerId)} 32% 24%)` }}
          >
            {initials(hit.title)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-semibold tracking-tight">
              {hit.title}
            </h1>
            {hit.username ? (
              <p className="truncate text-xs text-subtle">@{hit.username}</p>
            ) : null}
            <p className="truncate text-xs text-muted capitalize">
              {hit.kind}
              {hit.memberCount != null ? ` · ${formatCount(hit.memberCount)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-3">
          <Button variant="outline" onClick={() => void join()} disabled={joined}>
            Join
          </Button>
          <Button onClick={() => void add("watchlist")}>Add to Watchlist</Button>
          <Button variant="secondary" onClick={() => void add("other")}>
            Add to Other
          </Button>
        </div>
      </header>
      <div
        ref={scroller}
        className="thread-scroll"
        hidden={overlayOpen}
        role="log"
        aria-label="Conversation"
        aria-busy={busy || loadingOlder}
      >
        <div ref={topSentinel} className="h-2" />
        {loadingOlder ? (
          <p className="py-2 text-center text-xs text-muted">Loading earlier messages…</p>
        ) : null}
        {error ? (
          <div className="px-1 py-2">
            <p className="text-sm text-danger">{error}</p>
            <Button className="mt-3" variant="outline" onClick={() => void loadPage()}>
              Retry
            </Button>
          </div>
        ) : null}
        {busy ? <p className="px-1 py-6 text-sm text-muted">Loading conversation…</p> : null}
        {!busy && messages.length === 0 && !error ? (
          <p className="px-1 py-6 text-sm text-muted">No messages in this {hit.kind} yet.</p>
        ) : null}
        {sections.map((section) => (
            <section key={section.key} className="thread-day-block">
              <h2 className="thread-day">
                <span className="thread-day-label">{section.heading}</span>
              </h2>
              {section.messages.map((message, index) => (
                <ThreadBubble
                  key={message.msgId}
                  message={message}
                  showSender={showSenderName(section.messages[index - 1], message, hit.kind)}
                  thumbs={thumbs}
                  onOpenFile={setPreview}
                  onOpenVideo={setPlaying}
                />
              ))}
            </section>
        ))}
      </div>
      {preview ? (
        <FilePreview
          file={preview}
          port={port}
          onClose={() => setPreview(null)}
          saveFile={saveBlobToDownloads}
        />
      ) : null}
      {playing ? (
        <PlayerOverlay
          items={allVideos.length > 0 ? allVideos : [playing]}
          currentMsgId={playing.msgId}
          peer={peer}
          onClose={() => setPlaying(null)}
          onChangeMsgId={(id) => {
            const next = allVideos.find((video) => video.msgId === id) ?? playing;
            setPlaying(next);
          }}
        />
      ) : null}
    </div>
  );
}
