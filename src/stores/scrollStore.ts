const KEY = "tg-video-browser:scroll";

type ScrollMap = Record<string, { scrollTop: number; anchorMsgId: number }>;

function readMap(): ScrollMap {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ScrollMap;
  } catch {
    return {};
  }
}

function writeMap(map: ScrollMap): void {
  sessionStorage.setItem(KEY, JSON.stringify(map));
}

export function saveGridScroll(
  peerId: string,
  scrollTop: number,
  anchorMsgId: number,
): void {
  const map = readMap();
  map[peerId] = { scrollTop, anchorMsgId };
  writeMap(map);
}

export function loadGridScroll(
  peerId: string,
): { scrollTop: number; anchorMsgId: number } | null {
  return readMap()[peerId] ?? null;
}
