import { Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCount, hueFromId, initials } from "@/lib/format";
import { parseTelegramLink } from "@/parse/telegramLink";
import { hitToWatchlistItem } from "./searchHits";
import { addToWatchlist } from "@/stores/watchlistStore";
import { AppError, parseTelegramError } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { TelegramPort } from "@/telegram/port";
import type { SearchHit, WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { startPrefetchForPeer } from "@/videos/prefetch";
import { pushUpsert } from "@/watchlist/syncClient";

function usePeerVideoCounts(port: TelegramPort | null, hits: SearchHit[]) {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const inflight = useRef(new Set<string>());
  const queued = useRef(new Set<string>());
  const queue = useRef<SearchHit[]>([]);
  const active = useRef(0);
  const pauseUntil = useRef(0);
  const portRef = useRef(port);
  const countsRef = useRef(counts);
  portRef.current = port;
  countsRef.current = counts;

  const pump = useCallback(() => {
    const p = portRef.current;
    if (!p) return;
    const resume = () => {
      const wait = pauseUntil.current - Date.now();
      if (wait > 0) {
        window.setTimeout(() => pump(), wait);
        return;
      }
      pump();
    };
    while (active.current < 2 && queue.current.length) {
      if (Date.now() < pauseUntil.current) {
        resume();
        return;
      }
      const hit = queue.current.shift()!;
      queued.current.delete(hit.peerId);
      if (hit.peerId in countsRef.current || inflight.current.has(hit.peerId)) continue;
      inflight.current.add(hit.peerId);
      active.current++;
      void p
        .countVideos(hit)
        .then((n) => {
          setCounts((c) => ({ ...c, [hit.peerId]: n }));
        })
        .catch((err) => {
          const parsed = parseTelegramError(err);
          if (parsed.code === "flood_wait" && (parsed.waitSeconds ?? 0) > 0) {
            pauseUntil.current = Date.now() + parsed.waitSeconds! * 1000;
            inflight.current.delete(hit.peerId);
            queue.current.unshift(hit);
            queued.current.add(hit.peerId);
          } else {
            setCounts((c) => ({ ...c, [hit.peerId]: null }));
          }
        })
        .finally(() => {
          active.current--;
          inflight.current.delete(hit.peerId);
          pump();
        });
    }
  }, []);

  useEffect(() => {
    if (!port) return;
    for (const hit of hits) {
      if (hit.peerId in countsRef.current) continue;
      if (inflight.current.has(hit.peerId) || queued.current.has(hit.peerId)) continue;
      queued.current.add(hit.peerId);
      queue.current.push(hit);
    }
    pump();
  }, [hits, port, pump]);

  return counts;
}

export function SearchTab({
  addItem = addToWatchlist,
}: {
  addItem?: (item: WatchlistItem) => Promise<void>;
}) {
  const { port, me } = useTelegram();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const seq = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const nextOffsetRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const videoCounts = usePeerVideoCounts(port, hits);
  nextOffsetRef.current = nextOffset;
  loadingMoreRef.current = loadingMore;

  const loadPage = useCallback(
    async (raw: string, offset?: string) => {
      if (!port) return;
      const parsed = parseTelegramLink(raw);
      const id = seq.current;
      if (!offset) {
        setBusy(true);
        setLoadingMore(false);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        let pageHits: SearchHit[] = [];
        let pageNext: string | null = null;
        if (parsed.kind === "invite") {
          if (offset) {
            pageHits = [];
            pageNext = null;
          } else {
            pageHits = [await port.previewInvite(parsed.hash)];
          }
        } else {
          const q = parsed.kind === "username" ? parsed.username : parsed.query;
          const page = await port.searchPublic(q, offset);
          pageHits = page.hits;
          pageNext = page.nextOffset;
          if (
            !offset &&
            parsed.kind === "username" &&
            pageHits.length === 0
          ) {
            pageHits = [
              {
                peerId: parsed.username,
                accessHash: "0",
                username: parsed.username,
                title: parsed.username,
                kind: "channel",
                membership: "unknown",
              },
            ];
            pageNext = null;
          }
        }
        if (id !== seq.current) return;
        setHits((list) => {
          if (!offset) return pageHits;
          const seen = new Set(list.map((h) => h.peerId));
          return [...list, ...pageHits.filter((h) => !seen.has(h.peerId))];
        });
        setNextOffset(pageNext);
      } catch (err) {
        if (id !== seq.current) return;
        const parsedErr = parseTelegramError(err);
        if (!offset) {
          setHits([]);
          setNextOffset(null);
          setError(parsedErr.message);
        } else {
          toast.error(parsedErr.message);
        }
      } finally {
        if (id === seq.current) {
          setBusy(false);
          setLoadingMore(false);
        }
      }
    },
    [port],
  );

  useEffect(() => {
    if (!port) return;
    const q = query.trim();
    if (!q) {
      seq.current += 1;
      setHits([]);
      setError(null);
      setNextOffset(null);
      setBusy(false);
      setLoadingMore(false);
      return;
    }
    const t = window.setTimeout(() => {
      seq.current += 1;
      void loadPage(q);
    }, 300);
    return () => window.clearTimeout(t);
  }, [query, port, loadPage]);

  useEffect(() => {
    const root = scroller.current;
    const el = sentinel.current;
    if (!root || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((e) => e.isIntersecting) &&
          nextOffsetRef.current &&
          !loadingMoreRef.current &&
          !busy
        ) {
          const q = query.trim();
          if (!q) return;
          loadingMoreRef.current = true;
          void loadPage(q, nextOffsetRef.current);
        }
      },
      { root, threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nextOffset, loadingMore, busy, query, loadPage]);

  async function join(hit: SearchHit) {
    if (!port) return;
    try {
      let result = { pending: false };
      const parsed = parseTelegramLink(query);
      if (parsed.kind === "invite") {
        result = await port.joinInvite(parsed.hash);
      } else if (hit.username) {
        result = await port.joinByUsername(hit.username);
      } else {
        result = await port.joinChannel(hit);
      }
      if (result.pending) {
        setPending((p) => ({ ...p, [hit.peerId]: true }));
        toast("Join request sent — pending approval");
      } else {
        toast.success("Joined");
        setHits((list) =>
          list.map((h) =>
            h.peerId === hit.peerId ? { ...h, membership: "joined" } : h,
          ),
        );
      }
    } catch (err) {
      const parsedErr = parseTelegramError(err);
      if (parsedErr.code === "join_pending") {
        setPending((p) => ({ ...p, [hit.peerId]: true }));
        toast("Join request sent — pending approval");
        return;
      }
      toast.error(parsedErr.message);
    }
  }

  async function add(hit: SearchHit) {
    try {
      const item = hitToWatchlistItem(hit, Date.now());
      await addItem(item);
      toast.success("Added to watchlist");
      void pushUpsert(me?.id ?? "", item);
      if (port) void startPrefetchForPeer(item, port);
    } catch (err) {
      toast.error(err instanceof AppError ? err.message : "Could not add");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <label className="sr-only" htmlFor="search-q">
          Search
        </label>
        <Input
          id="search-q"
          placeholder="Search, @username, or t.me link"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {!query.trim() ? (
          <p className="text-sm text-muted text-pretty">
            Search public channels and groups, or paste an invite link. Join and Add
            are separate — adding does not join.
          </p>
        ) : null}
        {busy && hits.length === 0 ? (
          <p className="text-sm text-muted">Searching…</p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {!busy && query.trim() && hits.length === 0 && !error ? (
          <p className="text-sm text-muted">No channels or groups found.</p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {hits.map((hit) => {
            const isPending = pending[hit.peerId] || hit.membership === "pending";
            const resolved = hit.peerId in videoCounts;
            const count = videoCounts[hit.peerId];
            const countLabel = !resolved
              ? "Counting videos"
              : count == null
                ? "Video count unavailable"
                : `${count} videos`;
            return (
              <li
                key={hit.peerId}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-semibold"
                  style={{
                    background: `hsl(${hueFromId(hit.peerId)} 28% 22%)`,
                  }}
                >
                  {initials(hit.title)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{hit.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    <span>
                      {hit.kind}
                      {hit.memberCount != null ? ` · ${formatCount(hit.memberCount)}` : ""}
                    </span>
                    <span
                      className="inline-flex items-center gap-1"
                      aria-label={countLabel}
                    >
                      <Video className="size-3.5" aria-hidden />
                      {!resolved ? (
                        <span className="inline-block h-3 w-6 animate-pulse rounded bg-surface-2" />
                      ) : count == null ? (
                        "—"
                      ) : (
                        <span className="tabular-nums">{formatCount(count)}</span>
                      )}
                    </span>
                  </p>
                  {isPending ? (
                    <p className="text-xs text-muted">pending approval</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void join(hit)}
                    disabled={isPending || hit.membership === "joined"}
                  >
                    Join
                  </Button>
                  <Button size="sm" onClick={() => void add(hit)}>
                    Add
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={sentinel} className="h-8" />
        {loadingMore ? (
          <p className="py-2 text-center text-xs text-muted">Loading more…</p>
        ) : null}
      </div>
    </div>
  );
}
