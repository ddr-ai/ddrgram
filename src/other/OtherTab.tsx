import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { hueFromId, initials } from "@/lib/format";
import {
  addToOtherlist,
  listOtherlist,
  removeFromOtherlist,
} from "@/stores/otherStore";
import { parseTelegramError } from "@/telegram/errors";
import { useTelegram } from "@/telegram/TelegramProvider";
import type { WatchlistItem } from "@/telegram/types";
import { toast } from "@/ui/Toast";
import { JoinedPicker } from "@/watchlist/JoinedPicker";

export function OtherTab() {
  const { port } = useTelegram();
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [picker, setPicker] = useState(false);

  const reload = useCallback(async () => {
    setItems(await listOtherlist());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function remove(item: WatchlistItem) {
    await removeFromOtherlist(item.peerId);
    await reload();
    toast("Removed from Other");
  }

  async function leave(item: WatchlistItem) {
    if (!port) return;
    try {
      await port.leave(item);
      toast("Left chat");
    } catch (err) {
      toast.error(parseTelegramError(err).message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <h1 className="font-display text-lg font-semibold tracking-tight">Other</h1>
        <Button
          size="icon"
          variant="secondary"
          aria-label="Add from joined chats"
          onClick={() => setPicker(true)}
        >
          <Plus className="size-5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6">
        {items.length === 0 ? (
          <p className="text-sm text-muted text-pretty">
            No channels yet. From Search, choose Add to → Other, or tap + to add a
            chat you have already joined. Files like images, PDFs, and archives
            download to this device’s Downloads folder.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.peerId}
                className="raised-card flex items-center gap-2 rounded-2xl bg-surface p-2 md:p-3"
              >
                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left"
                  onClick={() =>
                    void navigate({
                      to: "/other/$peerId",
                      params: { peerId: item.peerId },
                    })
                  }
                >
                  <span
                    className="search-avatar flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-semibold md:size-12"
                    style={{
                      background: `hsl(${hueFromId(item.peerId)} 32% 24%)`,
                    }}
                  >
                    {initials(item.title)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display font-semibold tracking-tight">
                      {item.title}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="meta-chip capitalize">{item.kind}</span>
                      <span className="meta-chip">files</span>
                    </span>
                  </span>
                </button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Chat actions">
                      <MoreHorizontal className="size-5" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-50 min-w-40 rounded-xl bg-surface-2 p-1 shadow-[var(--shadow-raised)]"
                      sideOffset={6}
                    >
                      <DropdownMenu.Item
                        className="flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-surface"
                        onSelect={() => void remove(item)}
                      >
                        Remove
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-surface"
                        onSelect={() => void leave(item)}
                      >
                        Leave
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </li>
            ))}
          </ul>
        )}
      </div>
      <JoinedPicker
        open={picker}
        onOpenChange={setPicker}
        onAdded={() => void reload()}
        destination="other"
        addItem={addToOtherlist}
      />
    </div>
  );
}
