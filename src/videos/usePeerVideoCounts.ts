import { useCallback, useEffect, useRef, useState } from "react";
import { parseTelegramError } from "@/telegram/errors";
import type { TelegramPort } from "@/telegram/port";

export const VIDEO_COUNT_REFRESH_MS = 45_000;
const CACHE_KEY = "tg-video-browser:video-counts";

export type CountPeer = { peerId: string; accessHash: string };

function readCache(): Record<string, number | null> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number | null>;
  } catch {
    return {};
  }
}

function writeCache(counts: Record<string, number | null>) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(counts));
  } catch {
    // ignore quota
  }
}

export function usePeerVideoCounts(
  port: TelegramPort | null,
  peers: CountPeer[],
  opts?: { refreshMs?: number; refreshOnFocus?: boolean },
): Record<string, number | null> {
  const [counts, setCounts] = useState<Record<string, number | null>>(readCache);
  const inflight = useRef(new Set<string>());
  const queued = useRef(new Set<string>());
  const queue = useRef<CountPeer[]>([]);
  const active = useRef(0);
  const pauseUntil = useRef(0);
  const portRef = useRef(port);
  const countsRef = useRef(counts);
  const peersRef = useRef(peers);
  portRef.current = port;
  countsRef.current = counts;
  peersRef.current = peers;

  const pump = useCallback(() => {
    const p = portRef.current;
    if (!p) return;
    const resume = () => {
      const wait = pauseUntil.current - Date.now();
      if (wait > 0) {
        window.setTimeout(() => pump(), wait);
        return;
      }
      pump();
    };
    while (active.current < 2 && queue.current.length) {
      if (Date.now() < pauseUntil.current) {
        resume();
        return;
      }
      const peer = queue.current.shift()!;
      queued.current.delete(peer.peerId);
      if (inflight.current.has(peer.peerId)) continue;
      inflight.current.add(peer.peerId);
      active.current++;
      void p
        .countVideos(peer)
        .then((n) => {
          setCounts((c) => {
            if (c[peer.peerId] === n) return c;
            const next = { ...c, [peer.peerId]: n };
            writeCache(next);
            return next;
          });
        })
        .catch((err) => {
          const parsed = parseTelegramError(err);
          if (parsed.code === "flood_wait" && (parsed.waitSeconds ?? 0) > 0) {
            pauseUntil.current = Date.now() + parsed.waitSeconds! * 1000;
            inflight.current.delete(peer.peerId);
            queue.current.unshift(peer);
            queued.current.add(peer.peerId);
          } else {
            setCounts((c) => {
              if (c[peer.peerId] === null) return c;
              const next = { ...c, [peer.peerId]: null };
              writeCache(next);
              return next;
            });
          }
        })
        .finally(() => {
          active.current--;
          inflight.current.delete(peer.peerId);
          pump();
        });
    }
  }, []);

  const enqueue = useCallback(
    (list: CountPeer[], force: boolean) => {
      for (const peer of list) {
        if (!force && peer.peerId in countsRef.current) continue;
        if (inflight.current.has(peer.peerId) || queued.current.has(peer.peerId)) continue;
        queued.current.add(peer.peerId);
        queue.current.push(peer);
      }
      pump();
    },
    [pump],
  );

  const peerKey = peers.map((p) => p.peerId).join("\0");

  useEffect(() => {
    if (!port) return;
    const force = Boolean(opts?.refreshMs || opts?.refreshOnFocus);
    enqueue(peersRef.current, force);
  }, [peerKey, port, enqueue, opts?.refreshMs, opts?.refreshOnFocus]);

  useEffect(() => {
    if (!port) return;
    const refresh = () => enqueue(peersRef.current, true);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    let interval: number | undefined;
    if (opts?.refreshMs && opts.refreshMs > 0) {
      interval = window.setInterval(refresh, opts.refreshMs);
    }
    if (opts?.refreshOnFocus) {
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", refresh);
    }
    return () => {
      if (interval) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [port, enqueue, opts?.refreshMs, opts?.refreshOnFocus, peerKey]);

  return counts;
}
