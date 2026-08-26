# Watchlist Sync + Video Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the watchlist through Neon after Telegram login, and cache/prefetch videos in IndexedDB so playback on this device feels smooth.

**Architecture:** Metadata-only `watchlist_items` in Neon via `createServerFn`. UI still reads IndexedDB. After login, merge local ↔ cloud by `peerId`. A prefetch worker downloads the newest 50 videos per chat into an IndexedDB `videoCache` store. The player prefers cache, otherwise downloads and starts when playable.

**Tech Stack:** existing ddrgram (TanStack Start, `getSql` / Neon+PGLite, IndexedDB `idb`, Vitest). No Better Auth. No new npm packages.

**Spec:** `docs/superpowers/specs/2026-08-25-watchlist-sync-and-video-cache-design.md`

## Global Constraints

- Videos never go to the server. Telegram session never goes to the server.
- Identity is Telegram `getMe().id` (`userId: string`). Empty `userId` → skip cloud (list returns `[]`, mutations no-op).
- Do **not** use `authMiddleware`.
- Watchlist cloud rows: metadata only — `peerId`, `accessHash`, `username`, `title`, `kind`, `muted`, `addedAt`. No `photoBlob`.
- Prefetch cap **50** newest videos per chat, concurrency **2**.
- Remove from watchlist does **not** delete cached videos.
- `QuotaExceededError` → evict oldest `videoCache` rows by `cachedAt`, retry once, then stop prefetch for the session; toast `storage full, dropped old cache`.
- Prefetch pauses if `document.visibilityState === hidden` for 5+ minutes; resumes on visible. Tab close stops work; cursor in `kv` resumes later.
- `FLOOD_WAIT` → pause that peer for `waitSeconds`.
- Local write is source of UI; cloud failure toasts `watchlist will sync when online` and does not roll back.
- TDD: failing test before production code (migration SQL and `.grok/app-env.json` excepted).
- Tests mock Telegram and use in-memory maps / IndexedDB; no live Neon/Telegram in CI.
- Set `deploy.database` to `true`. Live host is Vercel.

---

## File structure

```
migrations/0002_watchlist.sql
src/watchlist/types.ts              # CloudWatchlistItem
src/watchlist/syncLogic.ts          # SQL helpers + mergeWatchlists (pure)
src/watchlist/sync.server.ts        # createServerFn wrappers
src/watchlist/syncClient.ts         # merge after login + push helpers
src/watchlist/offlineQueue.ts       # kv queue for failed cloud writes
src/stores/db.ts                    # bump to v2, videoCache store
src/stores/videoCacheStore.ts
src/videos/prefetch.ts
src/telegram/TelegramProvider.tsx   # call sync after ready
src/search/SearchTab.tsx            # add → cloud + prefetch
src/watchlist/WatchlistTab.tsx      # remove/mute → cloud
src/watchlist/JoinedPicker.tsx      # add → cloud + prefetch
src/player/PlayerOverlay.tsx        # cache hit / persist
.grok/app-env.json
README.md
```

---

### Task 1: Cloud watchlist types, merge, SQL helpers

**Files:**
- Create: `migrations/0002_watchlist.sql`, `src/watchlist/types.ts`, `src/watchlist/syncLogic.ts`
- Test: `src/watchlist/syncLogic.test.ts`

**Interfaces:**
- Consumes: `WatchlistItem`, `ChatKind` from `src/telegram/types.ts`
- Produces:
  - `CloudWatchlistItem = { peerId: string; accessHash: string; username?: string; title: string; kind: "channel" | "group"; muted: boolean; addedAt: number }`
  - `toCloudItem(item: WatchlistItem): CloudWatchlistItem` (drops `photoBlob`)
  - `mergeWatchlists(local: WatchlistItem[], cloud: CloudWatchlistItem[]): { localWrites: WatchlistItem[]; cloudUpserts: CloudWatchlistItem[] }`
  - `listWatchlistRows(sql, userId)` / `upsertWatchlistRow` / `deleteWatchlistRow` / `setMutedRow` — used by Task 2

Merge rules (verbatim from spec):
- In cloud, not local → `localWrites` (no photoBlob)
- In local, not cloud → `cloudUpserts` via `toCloudItem`
- In both → keep later `addedAt`; if `addedAt` equal and muted differs, take **cloud** `muted`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { mergeWatchlists, toCloudItem } from "./syncLogic";
import type { WatchlistItem } from "@/telegram/types";

const local = (over: Partial<WatchlistItem> = {}): WatchlistItem => ({
  peerId: "1",
  accessHash: "h",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 100,
  ...over,
});

describe("toCloudItem", () => {
  it("drops photoBlob", () => {
    const item = local({ photoBlob: new Blob(["x"]) });
    expect(toCloudItem(item)).toEqual({
      peerId: "1",
      accessHash: "h",
      title: "Cats",
      kind: "channel",
      muted: false,
      addedAt: 100,
    });
  });
});

describe("mergeWatchlists", () => {
  it("upserts local-only rows to cloud", () => {
    const { cloudUpserts, localWrites } = mergeWatchlists([local()], []);
    expect(cloudUpserts).toHaveLength(1);
    expect(localWrites).toEqual([]);
  });
  it("writes cloud-only rows locally without doubling", () => {
    const { localWrites, cloudUpserts } = mergeWatchlists([], [toCloudItem(local())]);
    expect(localWrites).toHaveLength(1);
    expect(cloudUpserts).toEqual([]);
  });
  it("keeps later addedAt when both exist", () => {
    const { localWrites, cloudUpserts } = mergeWatchlists(
      [local({ addedAt: 1, title: "old" })],
      [toCloudItem(local({ addedAt: 2, title: "new" }))],
    );
    expect(localWrites[0]?.title).toBe("new");
    expect(cloudUpserts).toEqual([]);
  });
  it("when addedAt equal, cloud muted wins", () => {
    const { localWrites } = mergeWatchlists(
      [local({ addedAt: 5, muted: false })],
      [toCloudItem(local({ addedAt: 5, muted: true }))],
    );
    expect(localWrites[0]?.muted).toBe(true);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/watchlist/syncLogic.test.ts` — expect FAIL (module missing)

- [ ] **Step 3: Implement** `types.ts`, `syncLogic.ts` merge + `toCloudItem`. Add SQL helpers taking `Sql` from `@/lib/db`:

```ts
export async function listWatchlistRows(sql: Sql, userId: string): Promise<CloudWatchlistItem[]> {
  if (!userId) return [];
  const rows = await sql<{
    peer_id: string; access_hash: string; username: string | null;
    title: string; kind: "channel" | "group"; muted: boolean; added_at: string | Date;
  }>`select peer_id, access_hash, username, title, kind, muted, added_at
     from watchlist_items where user_id = ${userId} order by added_at desc`;
  return rows.map((r) => ({
    peerId: r.peer_id,
    accessHash: r.access_hash,
    username: r.username ?? undefined,
    title: r.title,
    kind: r.kind,
    muted: r.muted,
    addedAt: new Date(r.added_at).getTime(),
  }));
}
```

Upsert:

```sql
insert into watchlist_items (user_id, peer_id, access_hash, username, title, kind, muted, added_at)
values (${userId}, ${item.peerId}, ${item.accessHash}, ${item.username ?? null}, ${item.title}, ${item.kind}, ${item.muted}, ${new Date(item.addedAt).toISOString()})
on conflict (user_id, peer_id) do update set
  access_hash = excluded.access_hash,
  username = excluded.username,
  title = excluded.title,
  kind = excluded.kind,
  muted = excluded.muted,
  added_at = excluded.added_at
```

Empty `userId` on upsert/delete/mute: return immediately.

Write `migrations/0002_watchlist.sql` exactly as the spec.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit** `feat: watchlist merge logic and SQL helpers`

---

### Task 2: createServerFn wrappers + in-memory fake for client tests

**Files:**
- Create: `src/watchlist/sync.server.ts`, `src/watchlist/cloudApi.ts` (interface + default impl calling server fns)
- Test: `src/watchlist/sync.server.test.ts` (SQL helpers against a fake `Sql` map)

**Interfaces:**
- Consumes: `listWatchlistRows`, `upsertWatchlistRow`, `deleteWatchlistRow`, `setMutedRow`, `CloudWatchlistItem`
- Produces:
  - `CloudWatchlistApi` with `list(userId)`, `upsert(userId, item)`, `remove(userId, peerId)`, `setMuted(userId, peerId, muted)`
  - `createMemoryCloudApi(): CloudWatchlistApi` for tests
  - Server fns `listCloudWatchlist` / `upsertCloudWatchlistItem` / `removeCloudWatchlistItem` / `setCloudWatchlistMuted`

- [ ] **Step 1: Failing test** — fake Sql or memory api: empty userId lists `[]`; upsert then list returns the row; remove then list empty.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement memory api + server fns:**

```ts
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { z } from "zod";

const userIdSchema = z.object({ userId: z.string() });

export const listCloudWatchlist = createServerFn({ method: "GET" })
  .inputValidator(userIdSchema)
  .handler(async ({ data }) => {
    const sql = await getSql();
    return listWatchlistRows(sql, data.userId);
  });
```

If `inputValidator` is not on this Start version, parse with zod inside the handler from `data`. Check existing Start API in `node_modules/@tanstack/react-start` — prefer `.validator(zod)` if that is the name.

`cloudApi.ts` default:

```ts
export const defaultCloudApi: CloudWatchlistApi = {
  list: (userId) => listCloudWatchlist({ data: { userId } }),
  upsert: (userId, item) => upsertCloudWatchlistItem({ data: { userId, item } }),
  remove: (userId, peerId) => removeCloudWatchlistItem({ data: { userId, peerId } }),
  setMuted: (userId, peerId, muted) =>
    setCloudWatchlistMuted({ data: { userId, peerId, muted } }),
};
```

Adjust call shape to whatever `createServerFn` actually expects (`.data` vs positional). Match the version in the repo.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: cloud watchlist server functions`

---

### Task 3: Client merge after login + wire Add/Remove/Mute

**Files:**
- Create: `src/watchlist/syncClient.ts`, `src/watchlist/offlineQueue.ts`
- Modify: `src/telegram/TelegramProvider.tsx` (after `status === "ready"`, `syncWatchlist(me.id)`), `src/search/SearchTab.tsx`, `src/watchlist/WatchlistTab.tsx`, `src/watchlist/JoinedPicker.tsx`
- Test: `src/watchlist/syncClient.test.ts`

**Interfaces:**
- Consumes: `CloudWatchlistApi`, `mergeWatchlists`, `addToWatchlist`, `listWatchlist`, `removeFromWatchlist`, `updateWatchlistMuted`
- Produces:
  - `syncWatchlist(userId, api = defaultCloudApi): Promise<WatchlistItem[]>`
  - `pushUpsert(userId, item, api)` / `pushRemove` / `pushMuted` — local already written; on throw, enqueue and toast
  - `flushOfflineQueue(userId, api)` on `online` event

- [ ] **Step 1: Failing tests**

```ts
it("local-only row is upserted to cloud", async () => { /* add local, memory api empty, sync, api.list has it */ });
it("cloud-only row appears locally", async () => { /* api has row, local empty, sync, listWatchlist has it */ });
it("duplicate peerId does not double", async () => { /* both have peer 1, listWatchlist length 1 */ });
it("remove calls cloud remove; local empty; does not touch video cache", async () => {
  // put a dummy cache row if Task 4 exists; otherwise skip cache assert until Task 4
});
```

For Task 3, the remove+cache test can wait until Task 4; include the merge tests now.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement syncClient.** TelegramProvider: `useEffect` when `status === "ready" && me` → `syncWatchlist(me.id)` then `flushOfflineQueue`. Window `online` listener too.

Search/JoinedPicker add: after `addToWatchlist`, `void pushUpsert(me?.id ?? "", item)` and `void startPrefetchForPeer(item)` — prefetch function can be a no-op stub `export async function startPrefetchForPeer(_item: WatchlistItem) {}` in `src/videos/prefetch.ts` until Task 5.

WatchlistTab remove/mute: after local write, push cloud.

Toast on push failure: `watchlist will sync when online`.

- [ ] **Step 4: PASS** existing Search/Watchlist tests still pass (`npm run test:app`)

- [ ] **Step 5: Commit** `feat: sync watchlist with Neon after Telegram login`

---

### Task 4: IndexedDB videoCache + eviction

**Files:**
- Modify: `src/stores/db.ts` (version 2)
- Create: `src/stores/videoCacheStore.ts`
- Test: `src/stores/videoCacheStore.test.ts`

**Interfaces:**
- Consumes: `openDb`
- Produces:
  - `cacheId(peerId, msgId) => `${peerId}:${msgId}``
  - `CachedVideo = { id: string; peerId: string; msgId: number; blob: Blob; sizeBytes: number; cachedAt: number }`
  - `getCachedVideo(peerId, msgId): Promise<CachedVideo | undefined>`
  - `putCachedVideo(entry: Omit<CachedVideo, "id">): Promise<void>`
  - `evictOldestCachedVideos(): Promise<number>` (deletes oldest 5 or 1 if fewer; returns deleted count)
  - `putCachedVideoWithEviction(entry): Promise<"ok" | "evicted" | "full">`

`openDb` currently version 1. Bump to 2:

```ts
dbPromise = openDB(DB_NAME, 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) { /* existing watchlist + kv */ }
    if (oldVersion < 2 && !db.objectStoreNames.contains("videoCache")) {
      const store = db.createObjectStore("videoCache", { keyPath: "id" });
      store.createIndex("cachedAt", "cachedAt");
    }
  },
});
```

If oldVersion is 0, both branches run.

- [ ] **Step 1: Failing tests** — put/get; QuotaExceeded mock: `putCachedVideo` throws, `putCachedVideoWithEviction` evicts oldest (cachedAt 1) and saves newest.

Simulate quota by injecting a db that throws once — or unit-test `evictOldest` + a helper `async function saveWithRetry` with a fake put.

```ts
it("QuotaExceeded on put → oldest evicted, newest saved", async () => {
  await putCachedVideo({ peerId: "p", msgId: 1, blob: new Blob(["a"]), sizeBytes: 1, cachedAt: 1 });
  await putCachedVideo({ peerId: "p", msgId: 2, blob: new Blob(["b"]), sizeBytes: 1, cachedAt: 2 });
  const result = await putCachedVideoWithEviction({
    peerId: "p", msgId: 3, blob: new Blob(["c"]), sizeBytes: 1, cachedAt: 3,
  }, {
    put: async () => {
      throw Object.assign(new Error("QuotaExceededError"), { name: "QuotaExceededError" });
    },
  });
  // Simpler: call evictOldest after two puts, expect msgId 1 gone
  await evictOldestCachedVideos();
  expect(await getCachedVideo("p", 1)).toBeUndefined();
  expect(await getCachedVideo("p", 2)).toBeTruthy();
});
```

Also test `putCachedVideoWithEviction` with a wrapper that fails first put then succeeds.

- [ ] **Step 2–4: implement, PASS, existing store tests still PASS** (deleteDatabase in setup uses current openDb)

Watch existing `deleteDatabase` / tests — version bump must not break watchlist tests.

- [ ] **Step 5: Commit** `feat: IndexedDB video cache with LRU eviction`

---

### Task 5: Prefetch worker + player cache

**Files:**
- Create: `src/videos/prefetch.ts` (replace stub)
- Modify: `src/player/PlayerOverlay.tsx`, `src/watchlist/syncClient.ts` (after sync, prefetch each peer)
- Test: `src/videos/prefetch.test.ts`, `src/player/PlayerOverlay.test.tsx` (add cache-hit case)

**Interfaces:**
- Consumes: `TelegramPort.searchVideos`, `downloadVideo`, `videoCacheStore`, `WatchlistItem`
- Produces:
  - `PREFETCH_CAP = 50`
  - `startPrefetchForPeer(peer, port): Promise<void>`
  - `startPrefetchForWatchlist(items, port): Promise<void>`
  - kv cursor key `prefetch:${peerId}` = `{ nextOffset: string | null; completedMsgIds: number[] }`

- [ ] **Step 1: Failing tests**

```ts
it("downloads each of 3 videos once and skips already-cached", async () => {
  const download = vi.fn(async (doc: { id: number }) => new Blob([String(doc.id)]));
  const port = createMockPort({
    searchVideos: async () => ({
      videos: [1, 2, 3].map((msgId) => ({
        msgId, peerId: "p", date: msgId, sizeBytes: 1, document: { id: msgId },
      })),
      nextOffset: null,
    }),
    downloadVideo: download,
  });
  await putCachedVideo({ peerId: "p", msgId: 2, blob: new Blob(["x"]), sizeBytes: 1, cachedAt: 0 });
  await startPrefetchForPeer({ peerId: "p", accessHash: "h", title: "t", kind: "channel", muted: false, addedAt: 1 }, port);
  expect(download).toHaveBeenCalledTimes(2); // 1 and 3
});
```

Player:

```ts
it("cache hit does not call downloadVideo", async () => {
  const download = vi.fn(async () => new Blob(["from-port"]));
  await putCachedVideo({ peerId: "p", msgId: 3, blob: new Blob(["cached"]), sizeBytes: 6, cachedAt: Date.now() });
  const port = createMockPort({ downloadVideo: download });
  render(/* PlayerOverlay currentMsgId 3 */);
  await waitFor(() => expect(document.querySelector("video")).toBeTruthy());
  expect(download).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement prefetch:** page `searchVideos` until 50 collected or `nextOffset` null. Skip cached. Concurrency 2 via a tiny pool. On `parseTelegramError(err).code === "flood_wait"`, `await sleep(waitSeconds * 1000)`. On `private_chat`, return. Persist cursor. Visibility: if hidden, `await waitUntilVisibleOrTimeout(5 * 60_000)` skipping wait if tests set `document.visibilityState` (in tests, document is visible).

Player: before `port.downloadVideo`, `getCachedVideo(peer.peerId, current.msgId)`. After successful download, `putCachedVideoWithEviction`. Neighbor prefetch also writes cache.

Progressive start: after download of a Blob, `URL.createObjectURL` immediately (full blob). True mid-download MSE is out of scope if `downloadVideo` only yields a complete Blob today. If `downloadVideo` already calls `onProgress` and returns at the end, “start as soon as playable” = play as soon as the blob is returned; do not wait on extra work. Keep progress UI until blob exists.

- [ ] **Step 4: `npm run test:app` PASS**

- [ ] **Step 5: Commit** `feat: background prefetch and player video cache`

---

### Task 6: Enable Neon on deploy + README

**Files:**
- Modify: `.grok/app-env.json` (`"database": true`), `README.md`
- Modify `package.json` only if Vercel build must run migrations: keep current `vite build && pages-spa-fallback` for GH Pages; add `"build:vercel": "node scripts/with-app-env.mjs vite build && npm run db:migrate"`. Do **not** break the working Pages workflow. Document that Vercel uses `build:vercel` or set Vercel install/build command in README. If `.vercel/project.json` exists, put the build command there.

- [ ] **Step 1: No unit test.** Update README:

```
## Watchlist sync

After Telegram login the watchlist is stored in Neon (Vercel). Videos stay in this browser’s IndexedDB (newest 50 prefetched).

Live (Vercel): set the project build command to `npm run build:vercel` and enable the database so `DATABASE_URL` is injected.
```

- [ ] **Step 2: `npm run test:app` still PASS**

- [ ] **Step 3: Commit** `chore: enable Neon watchlist database for Vercel`

---

## Spec coverage

| Spec | Task |
|---|---|
| Neon schema | 1 |
| Server fns | 2 |
| Merge + Add/Remove/Mute push | 3 |
| videoCache IDB v2 | 4 |
| Prefetch 50 / concurrency 2 / flood wait / private skip | 5 |
| Player cache hit | 5 |
| Quota eviction | 4 |
| Remove does not wipe cache | 3+4 test after both exist |
| deploy.database true, Vercel | 6 |
| Empty userId skip | 1–2 |
