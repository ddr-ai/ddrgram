export type SearchSource =
  | { type: "contacts"; q: string }
  | { type: "global"; q: string; broadcastsOnly?: boolean; groupsOnly?: boolean };

/** Closest query first, then progressively broader / less likely variants. */
export function searchExpansions(query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, " ");
    if (t.length < 1) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  add(q);
  const words = q.split(" ").filter(Boolean);
  if (words.length > 1) {
    for (let i = words.length - 1; i >= 1; i--) {
      add(words.slice(0, i).join(" "));
    }
    [...words]
      .filter((w) => w.length >= 2)
      .sort((a, b) => b.length - a.length)
      .forEach(add);
  } else if (q.length > 3) {
    for (let n = q.length - 1; n >= 3; n--) add(q.slice(0, n));
  }
  return out;
}

export function buildSearchSources(query: string): SearchSource[] {
  const expansions = searchExpansions(query);
  const primary = expansions[0];
  if (!primary) return [];
  const rest = expansions.slice(1);
  return [
    { type: "contacts", q: primary },
    { type: "global", q: primary, broadcastsOnly: true },
    { type: "global", q: primary, groupsOnly: true },
    ...rest.map((q) => ({ type: "contacts" as const, q })),
  ];
}

export function scoreSearchHit(
  query: string,
  hit: { title: string; username?: string },
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = hit.title.toLowerCase();
  const username = (hit.username ?? "").toLowerCase();
  if (username === q) return 1000;
  if (title === q) return 950;
  if (username.startsWith(q)) return 850;
  if (title.startsWith(q)) return 800;
  if (username.includes(q)) return 700;
  if (title.includes(q)) return 650;
  const qWords = q.split(/\s+/).filter(Boolean);
  if (qWords.length > 1) {
    const titleWords = title.split(/\s+/);
    let overlap = 0;
    for (const w of qWords) {
      if (titleWords.some((t) => t === w || t.startsWith(w) || w.startsWith(t))) {
        overlap++;
      }
    }
    if (overlap) return 400 + Math.round((300 * overlap) / qWords.length);
  }
  for (let n = q.length - 1; n >= 3; n--) {
    const p = q.slice(0, n);
    if (username.startsWith(p) || title.startsWith(p)) return 200 + n;
  }
  return 0;
}

export function rankHits<T extends { title: string; username?: string }>(
  query: string,
  hits: T[],
): T[] {
  return [...hits].sort((a, b) => {
    const d = scoreSearchHit(query, b) - scoreSearchHit(query, a);
    if (d !== 0) return d;
    return a.title.localeCompare(b.title);
  });
}
