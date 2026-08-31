export function formatDuration(sec?: number): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatBytes(n?: number): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "";
  if (n < 1000) return `${Math.round(n)} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} KB`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} MB`;
  return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} GB`;
}

export function formatCount(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "";
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
}

export function initials(title: string | null | undefined): string {
  const parts = String(title ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function formatClock(unixSec: number): string {
  if (!Number.isFinite(unixSec)) return "";
  return new Date(unixSec * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDayHeading(unixSec: number): string {
  if (!Number.isFinite(unixSec)) return "";
  const day = new Date(unixSec * 1000);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((todayStart - start) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return day.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: day.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function dayKey(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function hueFromId(id: string | null | undefined): number {
  const raw = String(id ?? "");
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return 198 + (h % 28);
}
