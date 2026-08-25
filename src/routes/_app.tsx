import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppFrame } from "@/shell/AppFrame";
import { Splash } from "@/shell/Splash";
import { useTelegram } from "@/telegram/TelegramProvider";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { status } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anon" || status === "needs_config") {
      void navigate({ to: "/login", replace: true });
    }
  }, [status, navigate]);

  if (status === "booting") return <Splash />;
  if (status !== "ready") return <Splash label="Redirecting" />;

  return (
    <AppFrame>
      <Outlet />
    </AppFrame>
  );
}
