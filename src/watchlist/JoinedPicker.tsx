import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hueFromId, initials } from "@/lib/format";
import { addToOtherlist, listOtherlist } from "@/stores/otherStore";
import { addToWatchlist, listWatchlist } from "@/stores/watchlistStore";
import { parseTelegramError } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { JoinedChat, WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { startPrefetchForPeer } from "@/videos/prefetch";
import { pushUpsert } from "./syncClient";

export function JoinedPicker({
  open,
  onOpenChange,
  onAdded,
  destination = "watchlist",
  addItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  destination?: "watchlist" | "other";
  addItem?: (item: WatchlistItem) => Promise<void>;
}) {
  const { port, me } = useTelegram();
  const [chats, setChats] = useState<JoinedChat[]>([]);
  const [filter, setFilter] = useState("");
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !port) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        const [page, list] = await Promise.all([
          port.listJoinedChannelsAndGroups(),
          destination === "other" ? listOtherlist() : listWatchlist(),
        ]);
        if (cancelled) return;
        setChats(page.chats);
        setAdded(new Set(list.map((x) => x.peerId)));
      } catch (err) {
        toast.error(parseTelegramError(err).message);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, port, destination]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q),
    );
  }, [chats, filter]);

  async function add(chat: JoinedChat) {
    const item: WatchlistItem = {
      peerId: chat.peerId,
      accessHash: chat.accessHash,
      username: chat.username,
      title: chat.title,
      kind: chat.kind,
      photoBlob: chat.photoBlob,
      muted: false,
      addedAt: Date.now(),
    };
    const put = addItem ?? (destination === "other" ? addToOtherlist : addToWatchlist);
    await put(item);
    setAdded((s) => new Set(s).add(chat.peerId));
    onAdded();
    toast.success(destination === "other" ? "Added to Other" : "Added to watchlist");
    if (destination === "watchlist") {
      void pushUpsert(me?.id ?? "", item);
      if (port) void startPrefetchForPeer(item, port);
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          <Drawer.Title className="font-display text-lg font-semibold">
            Add from joined chats
          </Drawer.Title>
          <Input
            className="mt-3"
            placeholder="Filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {busy ? <p className="text-sm text-muted">Loading…</p> : null}
            {!busy && visible.length === 0 ? (
              <p className="text-sm text-muted">No channels or groups found.</p>
            ) : null}
            <ul className="flex flex-col gap-2">
              {visible.map((chat) => {
                const isAdded = added.has(chat.peerId);
                return (
                  <li key={chat.peerId} className="flex items-center gap-3 py-2">
                    <span
                      className="flex size-10 items-center justify-center rounded-lg text-xs font-semibold"
                      style={{
                        background: `hsl(${hueFromId(chat.peerId)} 28% 22%)`,
                      }}
                    >
                      {initials(chat.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{chat.title}</p>
                      <p className="text-xs text-muted">{chat.kind}</p>
                    </div>
                    {isAdded ? (
                      <span className="text-xs text-muted">Added</span>
                    ) : (
                      <Button size="sm" onClick={() => void add(chat)}>
                        Add
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
