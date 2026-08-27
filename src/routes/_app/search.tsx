import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/search")({
  ssr: false,
  component: () => <Outlet />,
});

