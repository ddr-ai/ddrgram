import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoginScreen } from "@/auth/LoginScreen";
import { Splash } from "@/shell/Splash";
import { listWatchlist } from "@/stores/watchlistStore";
import { useTelegram } from "@/telegram/TelegramProvider";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { port, status, configured, saveCredentials, resetCredentials, markReady } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "ready") {
      void listWatchlist().then((list) => {
        void navigate({
          to: list.length > 0 ? "/watchlist" : "/search",
          replace: true,
        });
      });
    }
  }, [status, navigate]);

  if (status === "booting") return <Splash />;

  return (
    <LoginScreen
      port={port ?? undefined}
      configured={configured && status !== "needs_config"}
      onSaveCredentials={saveCredentials}
      onResetCredentials={resetCredentials}
      onDone={async () => {
        if (!port) return;
        const me = await port.getMe();
        markReady(me);
      }}
    />
  );
}
