# Watchlist sync + on-device video cache — Design

Date: 2026-08-25
Status: Draft for user review
Parent: `docs/superpowers/specs/2026-08-24-telegram-video-browser-design.md`

## 1. Purpose

Two changes on top of v1:

1. **Watchlist follows the user across devices.** After Telegram login, Add/Remove/Mute persist in Neon Postgres keyed by that Telegram user id.
2. **Playback feels smooth on this device.** After Add, the newest videos download in the background into IndexedDB. Tapping a video plays from cache, or starts as soon as enough of the file is here.

Videos never go to the cloud. `localStorage` is not used for media (≈5MB cap). IndexedDB holds blobs.

Success: log in on a second browser, see the same watchlist. On a device that has been open on a chat, tapping a recent video starts without waiting for a full Telegram download.

## 2. Non-goals

- Storing video files, Telegram sessions, or api_hash on the server.
- Better Auth / email-password accounts (identity is the existing Telegram login).
- Downloading an entire channel with no cap.
- True HTTP range streaming (Telegram has no public video URL).
- Keeping GitHub Pages as the live site (Vercel becomes the live deploy).
- Syncing cached videos between devices.

## 3. Key decisions

1. **Live host: Vercel + Neon.** GitHub Pages cannot run Postgres. `deploy.database: true` in `.grok/app-env.json`. `DATABASE_URL` is injected on Vercel; preview uses PGLite.
2. **Identity: Telegram `getMe().id`.** Server functions take `userId` from the already-logged-in client. No Better Auth. This is a personal app: the id is not a cryptographic proof, but the payload is only public channel metadata (peer ids, titles), not the Telegram session.
3. **Watchlist rows on Neon are metadata only.** No `photoBlob`. Avatars stay in IndexedDB and refresh from Telegram when missing.
4. **Video cache is IndexedDB store `videoCache`.** Key: `${peerId}:${msgId}`. Value: `{ peerId, msgId, blob, sizeBytes, cachedAt }`.
5. **Prefetch cap: 50 newest videos per watchlist chat.** Concurrency 2. Older than 50 are not background-fetched. Player still downloads on demand and then caches.
6. **Play path:** cache hit → object URL immediately. Miss → download; if the file is a playable MP4 once headers exist, start `<video>` before 100%; always persist the completed blob.
7. **Storage pressure:** on `QuotaExceededError`, delete the oldest `videoCache` rows (by `cachedAt`) until the write succeeds or the store is empty. Surface a quiet “storage full, dropped old cache” toast.
8. **Remove from watchlist does not delete cached videos** (unless the user later clears site data). Stale cache is harmless and LRU eviction will drop it.
9. **Background work requires the tab/PWA to be open.** Closing the tab pauses prefetch; reopen resumes.

## 4. Architecture

```
[Browser]
  Telegram MTProto (teleproto) — session in IndexedDB
  watchlistStore (IndexedDB, source of UI)
  videoCacheStore (IndexedDB blobs)
  prefetchQueue (in-memory + persisted job cursor per peer)
       │
       │ createServerFn (watchlist CRUD)
       ▼
[Vercel server]
  getSql() → Neon (prod) / PGLite (preview)
  table watchlist_items
```

The GitHub Pages workflow can stay as a static fallback but is **not** the live product URL after this ships. Live URL is the Vercel deploy.

## 5. Schema

`migrations/0002_watchlist.sql`:

```sql
create table if not exists watchlist_items (
  user_id     text not null,
  peer_id     text not null,
  access_hash text not null,
  username    text,
  title       text not null,
  kind        text not null check (kind in ('channel', 'group')),
  muted       boolean not null default false,
  added_at    timestamptz not null default now(),
  primary key (user_id, peer_id)
);
create index if not exists watchlist_items_user_added_idx
  on watchlist_items (user_id, added_at desc);
```

Never send `photoBlob` through server functions.

## 6. Server functions (`src/watchlist/sync.server.ts`)

All via `createServerFn`. Input `userId: string` plus payload. Empty `userId` → `[]` / no-op.

- `listCloudWatchlist({ userId })` → metadata rows, `added_at` desc
- `upsertCloudWatchlistItem({ userId, item })` — insert or update all metadata fields
- `removeCloudWatchlistItem({ userId, peerId })`
- `setCloudWatchlistMuted({ userId, peerId, muted })`

Replace-all is **not** exposed (avoids wiping another session with a partial local list). Sync is row-wise merge on the client.

## 7. Client sync (`src/watchlist/syncClient.ts`)

After `status === "ready"` and `me.id` is known:

1. `cloud = listCloudWatchlist(me.id)`
2. `local = listWatchlist()`
3. Union by `peerId`:
   - In cloud, not local → `addToWatchlist` (no photo until Telegram provides one)
   - In local, not cloud → `upsertCloudWatchlistItem`
   - In both → keep the row with the later `addedAt`; if muted differs, last mute write wins (apply the cloud `muted` if `addedAt` is equal)
4. UI reads only IndexedDB after merge.

Every local Add/Remove/Mute also calls the matching cloud function (fire-and-forget with retry once; on failure keep local and toast “watchlist will sync when online”).

## 8. Video cache + prefetch

**IndexedDB upgrade** `tg-video-browser` v1 → v2: add store `videoCache` keyPath `id` (`${peerId}:${msgId}`), index `cachedAt`.

**Prefetch worker** (`src/videos/prefetch.ts`):

- Trigger: successful Add, and again after login sync for each watchlist peer.
- For each peer: `searchVideos` pages until 50 items or no `nextOffset`.
- For each of those 50, if not cached, `downloadVideo` and `putCache`.
- Global concurrency 2. Pause when `document.visibilityState === hidden` for 5+ minutes (resume on visible). Honor `flood_wait` with the server’s seconds.
- Persist `{ peerId, nextOffset, completedMsgIds[] }` in the `kv` store so a reload continues.

**Player** (`PlayerOverlay`):

- `getCached(peerId, msgId)` → if blob, play.
- Else download with `onProgress`; attach `src` when `video.readyState` can play or on complete; `putCache` on complete.
- Prefetch neighbors as in v1, writing them into cache too.

**Grid:** optional small “cached” checkmark is **out of scope**. Smooth play is the signal.

## 9. Error handling

| Situation | Behavior |
|---|---|
| Offline sync | Local watchlist is source of UI; queue last failed upsert/remove in `kv` and flush on online |
| Neon/server error | Toast; do not roll back the local write |
| Empty/missing `userId` | Skip cloud calls |
| `FLOOD_WAIT` during prefetch | Pause that peer for `waitSeconds` |
| `QuotaExceededError` | Evict oldest cache rows, retry once, then stop prefetch for this session |
| Private chat / not a participant | Skip prefetch for that peer; Videos tab still shows Join |
| Tab closed | Prefetch stops; cursor kept; resumes next open |

## 10. Testing

Mock `telegramPort` and replace server fns with in-memory maps.

- Merge: local-only row is upserted; cloud-only row appears locally; duplicate peerId does not double.
- Remove calls cloud remove; local list empty; cache for that peer **still present**.
- Prefetch of 3 videos with cap 50 downloads each once; already-cached skipped.
- QuotaExceeded on put → oldest evicted, newest saved.
- Player cache hit does not call `downloadVideo`.

No live Telegram or live Neon in CI. Preview PGLite covers the migration on `npm run build` / dev.

## 11. Deploy

- Set `.grok/app-env.json` `deploy.database` to `true`.
- Restore `npm run build` to `vite build && npm run db:migrate` for Vercel (keep the Pages fallback script unused for the live Vercel URL).
- Vercel is the live URL. Document it in README. GitHub Pages workflow may remain but is not required for this feature.

## 12. Implementation slices

1. Migration + server fns + unit tests (in-memory sql fake or PGLite).
2. Client merge + wire Add/Remove/Mute.
3. IndexedDB v2 videoCache + eviction.
4. Prefetch worker + login trigger.
5. Player cache hit / progressive start.
6. Vercel database flag, README, manual script (two browsers).

## 13. Open questions

None that block. Resolved:

- Cloud watchlist only; videos on-device IndexedDB.
- Host: Vercel + Neon (leave GitHub Pages).
- Smooth: background newest ~50 + play-as-soon-as-ready.
- Remove does not wipe cache.
- Prefetch starts on Add, not only when opening Videos.
