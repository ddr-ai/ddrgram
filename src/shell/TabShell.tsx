import { Link } from "@tanstack/react-router";
import { Clapperboard, ListVideo, Search } from "lucide-react";
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
          gridTemplateColumns: selectedPeerId ? "1fr 1fr 1fr" : "1fr 1fr",
        }}
      >
        <TabLink to="/search" icon={<Search className="size-5" />}>
          Search
        </TabLink>
        <TabLink to="/watchlist" icon={<ListVideo className="size-5" />}>
          Watchlist
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
  to: "/search" | "/watchlist" | "/watchlist/$peerId";
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
        "flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-muted",
        "[&.active]:text-fg",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
