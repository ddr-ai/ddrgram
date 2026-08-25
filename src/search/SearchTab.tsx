import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCount, hueFromId, initials } from "@/lib/format";
import { parseTelegramLink } from "@/parse/telegramLink";
import { hitToWatchlistItem } from "./searchHits";
import { addToWatchlist } from "@/stores/watchlistStore";
import { AppError, parseTelegramError } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { SearchHit, WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";

export function SearchTab({
  addItem = addToWatchlist,
}: {
  addItem?: (item: WatchlistItem) => Promise<void>;
}) {
  const { port } = useTelegram();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const seq = useRef(0);

  useEffect(() => {
    if (!port) return;
    const q = query.trim();
    if (!q) {
      setHits([]);
      setError(null);
      return;
    }
    const t = window.setTimeout(() => {
      void run(q);
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, port]);

  async function run(raw: string) {
    if (!port) return;
    const parsed = parseTelegramLink(raw);
    const id = ++seq.current;
    setBusy(true);
    setError(null);
    try {
      let next: SearchHit[] = [];
      if (parsed.kind === "invite") {
        next = [await port.previewInvite(parsed.hash)];
      } else if (parsed.kind === "username") {
        const found = await port.searchPublic(parsed.username);
        next =
          found.length > 0
            ? found
            : [
                {
                  peerId: parsed.username,
                  accessHash: "0",
                  username: parsed.username,
                  title: parsed.username,
                  kind: "channel",
                  membership: "unknown",
                },
              ];
      } else {
        next = await port.searchPublic(parsed.query);
      }
      if (id === seq.current) setHits(next);
    } catch (err) {
      if (id !== seq.current) return;
      const parsedErr = parseTelegramError(err);
      setHits([]);
      setError(parsedErr.message);
    } finally {
      if (id === seq.current) setBusy(false);
    }
  }

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
      await addItem(hitToWatchlistItem(hit, Date.now()));
      toast.success("Added to watchlist");
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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {!query.trim() ? (
          <p className="text-sm text-muted text-pretty">
            Search public channels and groups, or paste an invite link. Join and Add
            are separate — adding does not join.
          </p>
        ) : null}
        {busy ? <p className="text-sm text-muted">Searching…</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <ul className="flex flex-col gap-3">
          {hits.map((hit) => {
            const isPending = pending[hit.peerId] || hit.membership === "pending";
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
                  <p className="text-xs text-muted">
                    {hit.kind}
                    {hit.memberCount != null ? ` · ${formatCount(hit.memberCount)}` : ""}
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
      </div>
    </div>
  );
}
