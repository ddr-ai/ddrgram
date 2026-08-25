import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/watchlist")({
  ssr: false,
  component: () => <Outlet />,
});
