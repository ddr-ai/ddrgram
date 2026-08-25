import { createFileRoute } from "@tanstack/react-router";
import { WatchlistTab } from "@/watchlist/WatchlistTab";

export const Route = createFileRoute("/_app/watchlist/")({
  ssr: false,
  component: WatchlistTab,
});
