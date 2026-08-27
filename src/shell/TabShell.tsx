import { Link } from "@tanstack/react-router";
import { Clapperboard, FolderOpen, ListVideo, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TabShell({
  selectedPeerId,
  children,
}: {
  selectedPeerId: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <nav
        role="tablist"
        aria-label="Main"
        className="tab-bar grid border-t border-border bg-surface"
        style={{
          gridTemplateColumns: selectedPeerId ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
        }}
      >
        <TabLink to="/search" icon={<Search className="size-5" />}>
          Search
        </TabLink>
        <TabLink to="/watchlist" icon={<ListVideo className="size-5" />}>
          Watchlist
        </TabLink>
        <TabLink to="/other" icon={<FolderOpen className="size-5" />}>
          Other
        </TabLink>
        {selectedPeerId ? (
          <TabLink
            to="/watchlist/$peerId"
            params={{ peerId: selectedPeerId }}
            icon={<Clapperboard className="size-5" />}
          >
            Videos
          </TabLink>
        ) : null}
      </nav>
    </div>
  );
}

function TabLink({
  to,
  params,
  icon,
  children,
}: {
  to: "/search" | "/watchlist" | "/watchlist/$peerId" | "/other" | "/other/$peerId";
  params?: { peerId: string };
  icon: ReactNode;
  children: string;
}) {
  return (
    <Link
      role="tab"
      aria-label={children}
      to={to}
      params={params}
      className={cn(
        "mx-1 flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-xs font-medium text-muted",
        "transition-[transform,box-shadow,background-color,color] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
        "[&.active]:bg-surface-2 [&.active]:text-fg [&.active]:shadow-[var(--shadow-raised)]",
        "active:scale-[0.98]",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
