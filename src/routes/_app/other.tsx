import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/other")({
  ssr: false,
  component: () => <Outlet />,
});
