# Telegram Video Browser — Design

Date: 2026-08-24
Status: Draft for user review

## 1. Purpose

A hosted, mobile-first web app that logs into the user’s Telegram account and does three things:

1. Search public channels/groups (and invite links) and join them.
2. Keep a **curated watchlist** of channels/groups the user explicitly adds.
3. Show **only Telegram-hosted video files** from the selected chat in a full-width grid, and play them full screen.

It is not a general Telegram messenger. No composer, no DMs as a product surface, no stories, no calls.

Success for v1: on a phone, the user can log in, find a channel or group, add it to the watchlist, open its videos, play one, go to the next/previous, and return to the same place in the grid — without a full Telegram chat UI.

## 2. Non-goals (v1)

- Sending messages, comments, or reactions.
- Photos, GIFs, round video notes, voice, files, links (YouTube etc.).
- Multi-user product, accounts other than the signed-in Telegram user.
- Server-side Telegram session or any backend that can act as the user.
- Telegram folders, contacts, bots, stories, calls, status.
- Offline playback cache beyond the current player buffer.
- Live Telegram API calls in CI.

## 3. Users and constraints

- **Audience:** the app owner only. Hosted at a URL they can open from any browser, not a public multi-user product.
- **Auth:** Telegram user account via phone number + login code. If Telegram also asks for the two-step cloud password, email, or a captcha, the app must collect that rather than fail silently.
- **API credentials:** `api_id` and `api_hash` from [my.telegram.org/apps](https://my.telegram.org/apps), provided at **build time** as `VITE_TELEGRAM_API_ID` / `VITE_TELEGRAM_API_HASH`.
- **New browser / device:** must log in again. Session lives only in that browser’s IndexedDB (same model as Telegram Web).
- **Mobile first:** designed for a phone, including notch/safe-area. Larger screens use the same structure with a wider video grid.
- **Native feel:** installable PWA, standalone display, no browser chrome when installed, bottom tabs on small screens.

## 4. Key decisions

1. **Browser MTProto client, not a bot and not a server session.** Bot API cannot join arbitrary chats or pull a user-account video gallery. A Node backend that stores the session would make video HTTP streaming easier but would hold full account keys. Rejected for v1.
2. **Library: `teleproto`.** GramJS (`telegram` npm package) was archived 2026-07-14. `teleproto` is the maintained, API-compatible fork (including browser WebSocket transport, file downloads, and current auth challenges).
3. **Watchlist is local, not a Telegram folder.** Add/remove does not change Telegram membership by itself. Leave is a separate action.
4. **Join and Add are separate.** Search results show both. Add does not join; Join does not add. Videos for a chat the user has not joined will fail with a clear error if Telegram requires membership.
5. **Videos tab is omitted from navigation until a watchlist item is selected.** Selecting an item opens the Videos tab. Clearing selection (remove/leave of the selected item) hides the tab again.
6. **Video set = `inputMessagesFilterVideo` only.** Uploaded/channel videos Telegram classifies as videos. Not GIFs (`inputMessagesFilterGif`), not round video notes (`inputMessagesFilterRoundVideo`), not external URLs.
7. **Playback is chunked MTProto download into a blob URL** for an HTML5 `<video>` element. Telegram does not give a public HTTPS file URL. Prefetch the previous and next grid items after the current video is playable. Show download progress. Do not wait for 100% if the file is already a playable MP4 with a usable header; if it is not playable until complete, wait and show progress.
8. **Back from player restores grid scroll.** Player is a stack overlay, not a route that remounts the grid. Scroll position is stored per chat (`peerId → scrollTop` plus first visible video id as fallback).
9. **Static host: GitHub Pages.** The SPA is built by GitHub Actions and published to Pages. No serverless Telegram proxy in v1. Hash routing (`HashRouter`) so refreshes and deep links work on a project Pages URL (`https://<user>.github.io/<repo>/`) without server rewrites.
10. **Stack:** React + TypeScript + Vite, React Router (`HashRouter`), IndexedDB via `idb`, Vitest + Testing Library, `vite-plugin-pwa`.

## 5. Architecture

```
[Browser SPA]
  UI (tabs, search, watchlist, grid, player)
  App stores (watchlist, ui, scroll) → IndexedDB
  telegramPort (interface)
      └── teleproto TelegramClient + StringSession
              └── WebSocket to Telegram DCs
  Session string → IndexedDB (never uploaded)

[Static host]
  JS/CSS/HTML + PWA assets
  Build-time api_id / api_hash only
```

**Isolation:** every Telegram call goes through `telegramPort`. UI and watchlist tests never import `teleproto`. The real adapter is the only module that talks MTProto.

**Secrets:** the session string is the account. It stays in IndexedDB. `api_id`/`api_hash` identify the app to Telegram; they are not a substitute for the session but should still not be committed in git (local `.env`; GitHub Actions secrets at build time, which still end up in the public JS bundle — same as any static Telegram web client).

## 6. Components

Each unit has one job, a small interface, and listed dependencies.

| Unit | Does | Depends on |
|---|---|---|
| **Auth screens** | Phone, code, optional 2FA/email/captcha, logout | `telegramPort` |
| **Tab shell** | Bottom tabs (Search, Watchlist, Videos if selected); larger-screen layout of the same tabs | router, selection store |
| **Search tab** | Query input, results, Join + Add, invite-link paste | `telegramPort`, watchlist store |
| **Watchlist tab** | Curated list; **+** opens joined-chats picker; row actions Remove / Leave / Mute; tap selects | `telegramPort`, watchlist store |
| **Joined picker** | Bottom sheet of channels/groups from `getDialogs`, filter/search, Add | `telegramPort`, watchlist store |
| **Videos tab** | Full-width responsive grid of video thumbnails for the selected chat; infinite scroll | `telegramPort`, selection, scroll store |
| **Player overlay** | Fullscreen `<video>`, play/pause/prev/next, progress, back | `telegramPort` download, grid index |
| **telegramPort** | Typed methods below; maps TL objects to app models | teleproto |
| **Watchlist store** | Persist `{peerId, accessHash, title, photo, kind, muted, addedAt}` | IndexedDB |
| **Session store** | Persist/restore StringSession; clear on logout | IndexedDB |
| **Scroll store** | Per-chat grid scroll restoration | memory + sessionStorage |

### 6.1 `telegramPort` methods (v1)

- `startLogin({ phone })` / `submitCode(code)` / `submitPassword(password)` and the extra callbacks teleproto needs for email/captcha if Telegram demands them
- `restoreSession()` / `logout()` (logOut + wipe local session)
- `searchPublic(query)` → channels and groups only
- `previewInvite(hash)` / `joinInvite(hash)`
- `joinByUsername(username)` / `joinChannel(peer)`
- `leave(peer)`
- `mute(peer)` / `unmute(peer)` (v1 mute = muted until `2^31-1`; unmute = `muteUntil: 0`)
- `listJoinedChannelsAndGroups()` paginated dialogs, filtered to broadcast channels and groups/supergroups
- `searchVideos(peer, offset)` using `messages.search` with `q=""`, `filter=inputMessagesFilterVideo`
- `getVideoThumb(location)` small cached JPEG
- `downloadVideo(document, onProgress)` → `Blob`
- `getMe()` for header/debug

### 6.2 Navigation

Hash routes (GitHub Pages project site):

- `#/login` — unauthenticated
- `#/search` — tab 1
- `#/watchlist` — tab 2
- `#/watchlist/:peerId` — selection stored; Videos tab visible
- Player is **not** a standalone route that unmounts the grid. It is an overlay on `#/watchlist/:peerId` (optional query `?v=msgId` for refresh-safe resume).

On small screens: bottom tab bar, 44px+ targets, safe-area padding.
On larger screens: same tabs (top or side), grid grows more columns; player still fullscreen.

## 7. Data model

### 7.1 Watchlist item

```ts
type ChatKind = "channel" | "group";

type WatchlistItem = {
  peerId: string;       // stable string form of Telegram peer id
  accessHash: string;
  username?: string;
  title: string;
  kind: ChatKind;
  photoBlob?: Blob;     // small cached avatar
  muted: boolean;       // last known Telegram notify state
  addedAt: number;
};
```

### 7.2 Video item (not fully persisted; page cache in memory)

```ts
type VideoItem = {
  msgId: number;
  peerId: string;
  date: number;
  durationSec?: number;
  width?: number;
  height?: number;
  sizeBytes: number;
  document: unknown;    // opaque TL document for download
};
```

Grid cache: in-memory pages per `peerId`. Not required in IndexedDB for v1.

### 7.3 UI state

- `selectedPeerId: string | null`
- `gridScroll: Record<peerId, { scrollTop: number; anchorMsgId: number }>`
- session string, dc config: session store

## 8. Data flow

### 8.1 Login

1. If IndexedDB has a session, `connect` + `getMe`. On `SESSION_REVOKED` / `AUTH_KEY_UNREGISTERED`, wipe and show phone screen.
2. Else: phone → `auth.sendCode` → code → complete login. If Telegram returns password needed, show password field. Same for email/captcha via teleproto callbacks.
3. Save `session.save()` to IndexedDB. Route to Search (empty watchlist) or Watchlist if items exist.

Logout: `auth.logOut`, delete session + watchlist is **kept** (peer ids are useless without a session; keep them so a re-login on the same browser restores the list). Wipe watchlist only if the user confirms “also clear watchlist”.

### 8.2 Search

1. Debounce ~300ms. Empty query → empty state, no request.
2. Detect invite/public links with one parser:
   - `t.me/+HASH`, `t.me/joinchat/HASH`, `telegram.me/joinchat/HASH`
   - `t.me/username` / `@username`
3. Links: `messages.checkChatInvite` or `contacts.resolveUsername`. Show a single result card.
4. Keywords: `contacts.search`. Keep chats that are channels or groups; drop users/bots.
5. Each card: avatar, title, type (channel/group), member/sub count if present, **Join** and **Add**.
6. Join: `channels.joinChannel` or `messages.importChatInvite` as appropriate. Success toast. If Telegram requires admin approval, toast + “pending” on the card; do not pretend the user is in.
7. Add: write watchlist row (needs `accessHash` from the result). Allowed even if not joined. Duplicate add is idempotent.

### 8.3 Watchlist

- Ordered by `addedAt` descending.
- Tap row: set `selectedPeerId`, navigate to Videos tab.
- **+**: bottom sheet. Load dialogs (paginated). Filter to channels/groups. Local text filter. Add writes the same watchlist row. Already-added items show as added, not a second copy.
- **Remove:** delete local row. If it was selected, clear selection and hide Videos tab.
- **Leave:** `channels.leaveChannel` (or basic-group equivalent) only. The watchlist row stays (Join/Add are separate, so Leave/Remove are too). If this chat was selected, it stays selected; the Videos tab then shows the not-a-participant error with Join.
- **Mute:** `account.updateNotifySettings`. Update `muted` on the row. Toggling again unmutes. Failures stay on the previous state with an error toast.

### 8.4 Videos

1. On open: `messages.search` peer, `q=""`, `filter=inputMessagesFilterVideo`, newest first, page size 30.
2. Thumbnails via Telegram photo thumbs on the document; placeholder if missing.
3. Infinite scroll loads the next page. Deduplicate by `msgId`.
4. Empty: “No videos in this channel/group.”
5. If Telegram says private / not a participant: message + Join button (does not auto-add).

### 8.5 Player

1. Tap cell: overlay fullscreen player, grid stays mounted (hidden).
2. Controls: play/pause, previous, next (next = older video in newest-first grid; previous = newer). No unrelated Telegram chrome.
3. Download current document through `telegramPort.downloadVideo`. Progress on the player. Create/revoke object URLs on change.
4. When current is playable, prefetch adjacent documents in the background (one each side, cancel on close or navigate away).
5. Back: close overlay, restore `scrollTop`. If the list shifted, scroll the `anchorMsgId` cell into view.
6. App backgrounding: pause the element; do not tear down the blob until Back or switching video.

## 9. Error handling

| Situation | Behavior |
|---|---|
| Offline | Banner; queue nothing; retry on reconnect for the failed call only |
| Invalid/expired login code | Inline error, stay on code screen, allow resend with Telegram’s timeout |
| 2FA / email / captcha | Extra screen/field; cancel returns to phone |
| `FLOOD_WAIT` / `SlowModeWaitError` | Disable the action, show wait seconds, auto-reenable |
| `SESSION_REVOKED` | Wipe session, keep watchlist, force login |
| Invalid/expired invite | Inline error on search |
| Private chat / not participant | Videos tab error + Join |
| Join request sent | Card state “pending approval”, not treated as joined |
| Leave/mute failure | Toast, no optimistic membership change |
| Video download failure | Player error, Retry, grid still there on Back |
| Frozen / restricted account | Blocking explanation from Telegram’s error, logout optional |
| Missing api_id/hash at runtime | Login screen cannot start; show “app is not configured” |

Empty states: no search query; no search hits; empty watchlist (prompt Search and +); picker with no channels/groups; no videos.

## 10. UI notes (not a visual redesign)

- One-column phone layout; grid uses full width; column count from container width (2 on small phones, more as width grows).
- Thumbnails: 16:9 crop, duration badge if known.
- Dark theme first (native-feeling night UI). Light theme not in v1.
- System font stack. Large tap targets. No chat bubbles.
- Videos tab is absent, not disabled, until selection exists.

## 11. Testing

**Automated (Vitest + Testing Library), all Telegram calls mocked:**

- Invite/username parser (the cases in 8.2).
- Watchlist: add idempotent, remove clears selection, leave does not remove.
- Tab shell: Videos tab appears only when `selectedPeerId` is set.
- Grid scroll store: save and restore; fallback to `anchorMsgId`.
- Video list reducer: pagination, dedupe, newest-first.
- Search result actions: Join does not add; Add does not join.

**Manual (real account, not CI):**

1. Login with phone + code (and 2FA if the account has it).
2. Reload: still logged in.
3. Keyword search, join a public channel, add a different one without joining.
4. Paste an invite link and a `t.me/username` link.
5. + picker: add an already-joined group.
6. Open videos, scroll, play, next/prev, back — same grid position.
7. Mute, unmute, remove, leave.
8. Logout and login again: watchlist still there.
9. Phone width and a desktop width.

## 12. Deployment

- Repo: `telegram-video-browser` (working title), published as a **project GitHub Pages** site at `https://<github-user>.github.io/telegram-video-browser/` (same pattern as [ddr-anime](https://ddr-ai.github.io/ddr-anime/)).
- Vite `base` is `/telegram-video-browser/` so assets resolve under the repo path.
- **HashRouter** — GitHub Pages has no SPA rewrite; hash routes refresh correctly.
- **GitHub Actions** (push to `main`): `npm ci`, `npm run test`, `npm run build` with `VITE_TELEGRAM_API_ID` / `VITE_TELEGRAM_API_HASH` from repository secrets, then deploy `dist/` via `actions/deploy-pages`.
- Local `.env` is gitignored for `vite` dev. Those two values are app identifiers, not the user session; they will still be visible in the built JS, which is unavoidable for a static client.
- PWA: installable, standalone, own icon/name. Service worker `scope` and `start_url` must include the repo base path.
- Pages settings: **GitHub Actions** as the source (not “deploy from branch / root”), because this app has a Vite build step unlike ddr-anime’s plain HTML.

## 13. Implementation slices (for the later plan)

Not work to start until this spec is approved and an implementation plan is written.

1. Vite/React/PWA shell, tab navigation, mocked `telegramPort`.
2. IndexedDB session + watchlist stores + unit tests.
3. Real teleproto login (phone, code, password).
4. Search + invite parse + Join/Add.
5. Watchlist + joined picker + Remove/Leave/Mute.
6. Video grid pagination + thumbs.
7. Player overlay, chunked download, prefetch, scroll restore.
8. Error/empty states, PWA polish, GitHub Actions → GitHub Pages deploy, manual script.

## 14. Open questions

None that block v1. Resolved in the brainstorm:

- Purpose: search / watchlist / video grid, not a messenger.
- Videos: Telegram files only.
- Login: phone + code (plus 2FA if Telegram asks).
- Watchlist: curated; Join and Add separate; + picker of already-joined chats.
- Player: fullscreen controls; back restores grid.
- Hosting: GitHub Pages URL, single user, browser session.
- Light actions: Remove, Leave, Mute.
- Approach: in-browser teleproto.
- Architecture, components, data flow, errors, and testing as in this document.
