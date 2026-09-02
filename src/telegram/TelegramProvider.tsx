import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getApiConfig } from "../config";
import { parseTelegramError } from "./errors";
import type { TelegramPort } from "./port";
import type { Me } from "./types";
import {
  clearApiCredentials,
  clearSessionString,
  loadApiCredentials,
  saveApiCredentials,
} from "../stores/sessionStore";
import { clearOtherlist } from "../stores/otherStore";
import { clearWatchlist } from "../stores/watchlistStore";
import { flushOfflineQueue, hydrateWatchlist } from "../watchlist/syncClient";

type Status = "booting" | "needs_config" | "anon" | "ready";

type Ctx = {
  port: TelegramPort | null;
  me: Me | null;
  status: Status;
  configured: boolean;
  saveCredentials: (apiId: number, apiHash: string) => Promise<void>;
  resetCredentials: () => Promise<void>;
  markReady: (me: Me) => void;
  logout: (alsoClearWatchlist?: boolean) => Promise<void>;
};

const TelegramContext = createContext<Ctx | null>(null);

export function useTelegram(): Ctx {
  const ctx = useContext(TelegramContext);
  if (!ctx) throw new Error("useTelegram must be used within TelegramProvider");
  return ctx;
}

async function loadPort(creds: { apiId: number; apiHash: string }): Promise<TelegramPort> {
  const { createTeleprotoPort } = await import("./teleprotoPort");
  return createTeleprotoPort(creds);
}

export function TelegramProvider({
  children,
  port: portProp,
  configured: configuredProp,
}: {
  children: ReactNode;
  port?: TelegramPort;
  configured?: boolean;
}) {
  const [port, setPort] = useState<TelegramPort | null>(portProp ?? null);
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<Status>(() => {
    if (portProp) return "anon";
    return "error" in getApiConfig() ? "needs_config" : "booting";
  });
  const [configured, setConfigured] = useState(Boolean(configuredProp ?? portProp));

  useEffect(() => {
    let cancelled = false;

    if (portProp) {
      setPort(portProp);
      setConfigured(configuredProp ?? true);
      void portProp.restoreSession().then((restored) => {
        if (cancelled) return;
        if (restored) {
          setMe(restored);
          setStatus("ready");
        } else {
          setStatus("anon");
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const env = getApiConfig();
        const saved = await loadApiCredentials();
        const creds = "error" in env ? saved : env;
        if (!creds) {
          if (!cancelled) setStatus("needs_config");
          return;
        }
        if (!cancelled) {
          setConfigured(true);
          setStatus("booting");
        }
        const p = await loadPort(creds);
        if (cancelled) return;
        setPort(p);
        setConfigured(true);
        try {
          const restored = await p.restoreSession();
          if (cancelled) return;
          if (restored) {
            setMe(restored);
            setStatus("ready");
          } else {
            setStatus("anon");
          }
        } catch (err) {
          const parsed = parseTelegramError(err);
          if (parsed.code === "session_revoked") {
            await clearSessionString();
          }
          if (!cancelled) setStatus("anon");
        }
      } catch {
        if (!cancelled) setStatus("needs_config");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [portProp, configuredProp]);

  useEffect(() => {
    if (status !== "ready" || !me) return;
    let cancelled = false;
    void (async () => {
      await hydrateWatchlist(me.id);
    })();
    const onOnline = () => {
      void (async () => {
        await flushOfflineQueue(me.id);
        if (cancelled) return;
        await hydrateWatchlist(me.id);
      })();
    };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [status, me]);

  const saveCredentials = useCallback(async (apiId: number, apiHash: string) => {
    await saveApiCredentials({ apiId, apiHash });
    const p = await loadPort({ apiId, apiHash });
    setPort(p);
    setConfigured(true);
    setStatus("anon");
  }, []);

  const resetCredentials = useCallback(async () => {
    await clearApiCredentials();
    await clearSessionString();
    setPort(null);
    setMe(null);
    setConfigured(false);
    setStatus("needs_config");
  }, []);

  const markReady = useCallback((next: Me) => {
    setMe(next);
    setStatus("ready");
  }, []);

  const logout = useCallback(
    async (alsoClearWatchlist = false) => {
      if (port) {
        try {
          await port.logout();
        } catch {
          await clearSessionString();
        }
      } else {
        await clearSessionString();
      }
      if (alsoClearWatchlist) {
        await clearWatchlist();
        await clearOtherlist();
      }
      setMe(null);
      setStatus(configured ? "anon" : "needs_config");
    },
    [port, configured],
  );

  const value = useMemo<Ctx>(
    () => ({
      port,
      me,
      status,
      configured,
      saveCredentials,
      resetCredentials,
      markReady,
      logout,
    }),
    [port, me, status, configured, saveCredentials, resetCredentials, markReady, logout],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}
