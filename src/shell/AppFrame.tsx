import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTelegram } from "@/telegram/TelegramProvider";
import { OfflineBanner } from "@/ui/OfflineBanner";
import { DeviceShell } from "./DeviceShell";
import { TabShell } from "./TabShell";

function selectedPeerFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/watchlist\/([^/]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const { me, logout } = useTelegram();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedPeerId = selectedPeerFromPath(pathname);
  const [confirm, setConfirm] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirm) return;
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirm(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);

  return (
    <DeviceShell>
      <div className="flex h-full min-h-0 flex-col">
      <OfflineBanner />
      <header className="app-header flex items-center gap-3 border-b border-border px-4 py-3 shadow-[var(--shadow-raised)] md:px-6">
        <p className="font-display text-base font-semibold tracking-tight">TG Videos</p>
        <span className="ml-auto truncate text-sm text-muted">{me?.firstName}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Log out"
          onClick={() => setConfirm(true)}
        >
          <LogOut className="size-4" />
        </Button>
      </header>
      <TabShell selectedPeerId={selectedPeerId}>{children}</TabShell>
      {confirm ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-4 sm:items-center"
          role="presentation"
          onClick={() => setConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-[var(--shadow-device)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="logout-title" className="font-display text-lg font-semibold">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-muted text-pretty">
              Your watchlist stays unless you clear it.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={async () => {
                  await logout(false);
                  setConfirm(false);
                  await navigate({ to: "/login" });
                }}
              >
                Log out
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await logout(true);
                  setConfirm(false);
                  await navigate({ to: "/login" });
                }}
              >
                Log out and clear watchlist
              </Button>
              <Button ref={cancelRef} variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </DeviceShell>
  );
}
