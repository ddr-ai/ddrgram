import { Users, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCount, hueFromId, initials } from "@/lib/format";
import { parseTelegramLink } from "@/parse/telegramLink";
import { stashSearchHit } from "./searchHits";
import { parseTelegramError, userMessage } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { SearchHit } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { usePeerVideoCounts } from "@/videos/usePeerVideoCounts";

export function SearchTab() {
  const { port } = useTelegram();
  const navigate = useNavigate();
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
  const hitsRef = useRef(hits);
  hitsRef.current = hits;
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
        const valid = pageHits.filter((h) => h && h.peerId);
        if (!offset) {
          setHits(valid);
          setNextOffset(pageNext);
        } else {
          const seen = new Set(hitsRef.current.map((h) => h.peerId));
          const extra = valid.filter((h) => !seen.has(h.peerId));
          if (extra.length === 0) {
            setNextOffset(null);
          } else {
            setHits((list) => {
              const have = new Set(list.map((h) => h.peerId));
              return [...list, ...extra.filter((h) => !have.has(h.peerId))];
            });
            setNextOffset(pageNext);
          }
        }
      } catch (err) {
        if (id !== seq.current) return;
        const parsedErr = parseTelegramError(err);
        if (!offset) {
          setHits([]);
          setNextOffset(null);
          setError(userMessage(parsedErr));
        } else {
          toast.error(userMessage(parsedErr));
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
      toast.error(userMessage(parsedErr));
    }
  }

  function openHit(hit: SearchHit) {
    stashSearchHit(hit);
    void navigate({ to: "/search/$peerId", params: { peerId: hit.peerId } });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3 md:px-6">
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
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {!query.trim() ? (
          <p className="text-sm text-muted text-pretty">
            Search public channels and groups, or paste an invite link. Tap a
            result to open it, then add it to Watchlist or Other.
          </p>
        ) : null}
        {busy && hits.length === 0 ? (
          <p className="text-sm text-muted">Searching…</p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {!busy && query.trim() && hits.length === 0 && !error ? (
          <p className="text-sm text-muted">No channels or groups found.</p>
        ) : null}
        <ul className="search-list flex flex-col gap-3">
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
                className="search-card flex items-center gap-3 rounded-2xl bg-surface p-3 md:gap-4 md:p-4"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-label={`Open ${hit.title}`}
                  onClick={() => openHit(hit)}
                >
                <span
                  className="search-avatar flex size-12 shrink-0 items-center justify-center rounded-xl text-xs font-semibold md:size-14"
                  style={{
                    background: `hsl(${hueFromId(hit.peerId)} 32% 24%)`,
                  }}
                >
                  {initials(hit.title)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold tracking-tight">
                    {hit.title}
                  </p>
                  {hit.username ? (
                    <p className="truncate text-xs text-subtle">@{hit.username}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="meta-chip capitalize">{hit.kind}</span>
                    {hit.memberCount != null ? (
                      <span className="meta-chip">
                        <Users className="size-3" aria-hidden />
                        <span className="tabular-nums">{formatCount(hit.memberCount)}</span>
                      </span>
                    ) : null}
                    <span className="meta-chip" aria-label={countLabel}>
                      <Video className="size-3" aria-hidden />
                      {!resolved ? (
                        <span className="inline-block h-3 w-6 animate-pulse rounded bg-surface" />
                      ) : count == null ? (
                        "—"
                      ) : (
                        <span className="tabular-nums">{formatCount(count)}</span>
                      )}
                    </span>
                  </div>
                  {isPending ? (
                    <p className="mt-1.5 text-xs text-muted">pending approval</p>
                  ) : null}
                </div>
                </button>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void join(hit)}
                    disabled={isPending || hit.membership === "joined"}
                  >
                    Join
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
