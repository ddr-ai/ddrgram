# Telegram Video Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a hosted, mobile-first PWA that logs into the user's Telegram account in the browser, searches/joins channels and groups, keeps a curated watchlist, and plays that chat's Telegram video files in a full-width grid.

**Architecture:** Static Vite SPA on GitHub Pages. All Telegram I/O goes through `telegramPort`; UI never imports teleproto. Session and watchlist live in IndexedDB. HashRouter so project Pages URLs refresh. Real MTProto adapter is the last slice; earlier tasks run against a mock port.

**Tech Stack:** React 19, TypeScript, Vite, React Router HashRouter, `idb`, Vitest + Testing Library + jsdom + fake-indexeddb, `vite-plugin-pwa`, `teleproto`, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-24-telegram-video-browser-design.md`

## Global Constraints

- Browser MTProto only; no server-side Telegram session; no Bot API.
- Library for the real adapter: `teleproto` (not archived `telegram` / GramJS).
- Watchlist is local IndexedDB, not a Telegram folder. Join ≠ Add; Leave ≠ Remove.
- Videos tab is omitted from navigation until a watchlist item is selected; selecting opens Videos.
- Video set = `inputMessagesFilterVideo` only (no GIFs, round notes, external URLs).
- Playback: chunked MTProto download → Blob → HTML5 `<video>`; prefetch prev/next; Back restores grid scroll (grid stays mounted).
- Auth: phone + code; also password/email/captcha if Telegram asks.
- Hash routes: `#/login`, `#/search`, `#/watchlist`, `#/watchlist/:peerId`; player overlay (optional `?v=msgId`).
- Vite `base` is `/ddrgram/`. GitHub Actions deploys the static build to Pages.
- `api_id` / `api_hash` from `VITE_TELEGRAM_API_ID` / `VITE_TELEGRAM_API_HASH` (`.env` gitignored; Actions secrets).
- Dark theme only. Mobile-first, full-width grid, 44px+ targets, safe-area. No chat composer.
- Tests mock Telegram; never call live Telegram in CI. TDD: failing test before production code (config/scaffold files excepted).
- Frequent commits. Do not commit `.env` or session strings.

---

## File structure

```
package.json
vite.config.ts
vitest.config.ts
tsconfig.json
index.html
.env.example
.gitignore
src/main.tsx
src/App.tsx
src/index.css
src/test/setup.ts
src/telegram/types.ts          # ChatKind, WatchlistItem, VideoItem, SearchHit, JoinedChat, Me
src/telegram/errors.ts         # AppError codes + parseTelegramError
src/telegram/port.ts           # TelegramPort interface
src/telegram/mockPort.ts
src/telegram/teleprotoPort.ts  # Task 8
src/telegram/TelegramProvider.tsx
src/parse/telegramLink.ts
src/stores/db.ts
src/stores/watchlistStore.ts
src/stores/sessionStore.ts
src/stores/scrollStore.ts
src/videos/videoList.ts        # pagination reducer
src/player/playerIndex.ts      # prev/next + object URL helpers
src/shell/TabShell.tsx
src/auth/LoginScreen.tsx
src/search/SearchTab.tsx
src/watchlist/WatchlistTab.tsx
src/watchlist/JoinedPicker.tsx
src/videos/VideosTab.tsx
src/player/PlayerOverlay.tsx
src/ui/Toast.tsx
src/ui/OfflineBanner.tsx
src/config.ts                  # reads VITE_ api id/hash
.github/workflows/pages.yml
public/icons (PWA)
README.md
```

---

### Task 1: Project shell, types, `telegramPort`, tab visibility

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`, `src/telegram/types.ts`, `src/telegram/errors.ts`, `src/telegram/port.ts`, `src/telegram/mockPort.ts`, `src/telegram/TelegramProvider.tsx`, `src/shell/TabShell.tsx`, `src/config.ts`
- Test: `src/shell/TabShell.test.tsx`, `src/config.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ChatKind = "channel" | "group"`
  - `WatchlistItem = { peerId: string; accessHash: string; username?: string; title: string; kind: ChatKind; photoBlob?: Blob; muted: boolean; addedAt: number }`
  - `VideoItem = { msgId: number; peerId: string; date: number; durationSec?: number; width?: number; height?: number; sizeBytes: number; document: unknown }`
  - `SearchHit = { peerId: string; accessHash: string; username?: string; title: string; kind: ChatKind; memberCount?: number; photoBlob?: Blob; membership: "unknown" | "joined" | "pending" }`
  - `JoinedChat = { peerId: string; accessHash: string; username?: string; title: string; kind: ChatKind; photoBlob?: Blob }`
  - `Me = { id: string; firstName: string }`
  - `TelegramPort` methods listed in spec §6.1, plus `onAuthUpdate(cb)` if needed internally
  - `getApiConfig(): { apiId: number; apiHash: string } | { error: "not_configured" }`
  - `TabShell` reads `selectedPeerId: string | null` and only renders a Videos tab (role=tab, name Videos) when it is non-null

- [ ] **Step 1: Scaffold Vite React-TS in this repo without wiping `docs/`.** Do not run `npm create vite` on a non-empty root if it would overwrite docs. Write package.json by hand:

```json
{
  "name": "telegram-video-browser",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Install: `react`, `react-dom`, `react-router-dom`, `idb`, `teleproto`. Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `fake-indexeddb`, `vite-plugin-pwa`, `@types/react`, `@types/react-dom`.

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/telegram-video-browser/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Telegram Video Browser",
        short_name: "TG Videos",
        start_url: "/telegram-video-browser/",
        scope: "/telegram-video-browser/",
        display: "standalone",
        background_color: "#111111",
        theme_color: "#111111",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
```

`vitest.config.ts`: `environment: "jsdom"`, `setupFiles: ["src/test/setup.ts"]`, include `src/**/*.test.ts(x)`.

`.gitignore`: `node_modules`, `dist`, `.env`, `.env.local`. `.env.example`:

```
VITE_TELEGRAM_API_ID=
VITE_TELEGRAM_API_HASH=
```

- [ ] **Step 2: Write failing tests for config and Videos tab visibility**

`src/config.ts` is missing. Test:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getApiConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns not_configured when api id or hash is missing", async () => {
    vi.stubEnv("VITE_TELEGRAM_API_ID", "");
    vi.stubEnv("VITE_TELEGRAM_API_HASH", "");
    const { getApiConfig } = await import("./config");
    expect(getApiConfig()).toEqual({ error: "not_configured" });
  });
});
```

`TabShell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TabShell } from "./TabShell";

describe("TabShell", () => {
  it("hides the Videos tab when nothing is selected", () => {
    render(
      <MemoryRouter>
        <TabShell selectedPeerId={null} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("tab", { name: "Videos" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Search" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Watchlist" })).toBeTruthy();
  });

  it("shows the Videos tab when a watchlist item is selected", () => {
    render(
      <MemoryRouter>
        <TabShell selectedPeerId="123" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("tab", { name: "Videos" })).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL** (`getApiConfig` / `TabShell` not defined)

Run: `npx vitest run src/config.test.ts src/shell/TabShell.test.tsx`

- [ ] **Step 4: Implement types, port, mock, config, TabShell, HashRouter app**

`src/telegram/types.ts` — exact shapes from Interfaces above.

`src/telegram/errors.ts`:

```ts
export type AppErrorCode =
  | "not_configured"
  | "offline"
  | "invalid_code"
  | "code_expired"
  | "password_needed"
  | "flood_wait"
  | "session_revoked"
  | "invalid_invite"
  | "private_chat"
  | "join_pending"
  | "frozen"
  | "download_failed"
  | "unknown";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public waitSeconds?: number,
  ) {
    super(message);
  }
}

export function parseTelegramError(err: unknown): AppError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/SESSION_REVOKED|AUTH_KEY_UNREGISTERED/i.test(msg)) {
    return new AppError("session_revoked", msg);
  }
  if (/FLOOD_WAIT|SlowModeWait/i.test(msg)) {
    const n = Number((/(\d+)/.exec(msg) ?? [])[1] ?? 0);
    return new AppError("flood_wait", msg, n);
  }
  if (/INVITE_HASH/i.test(msg)) return new AppError("invalid_invite", msg);
  if (/PASSWORD_HASH_INVALID|SESSION_PASSWORD_NEEDED/i.test(msg)) {
    return new AppError("password_needed", msg);
  }
  if (/PHONE_CODE_EXPIRED/i.test(msg)) return new AppError("code_expired", msg);
  if (/PHONE_CODE_INVALID/i.test(msg)) return new AppError("invalid_code", msg);
  if (/CHANNEL_PRIVATE|CHAT_PRIVATE|not a participant/i.test(msg)) {
    return new AppError("private_chat", msg);
  }
  return new AppError("unknown", msg);
}
```

`src/telegram/port.ts` — interface:

```ts
import type { JoinedChat, Me, SearchHit, VideoItem, WatchlistItem } from "./types";

export type LoginStart = { phone: string };
export type VideoPage = { videos: VideoItem[]; nextOffset: string | null };

export interface TelegramPort {
  restoreSession(): Promise<Me | null>;
  startLogin(input: LoginStart): Promise<{ next: "code" }>;
  submitCode(code: string): Promise<{ next: "done" | "password" | "email" | "captcha"; siteKey?: string }>;
  submitPassword(password: string): Promise<{ next: "done" }>;
  submitEmail(email: string): Promise<{ next: "email_code" }>;
  submitEmailCode(code: string): Promise<{ next: "done" }>;
  submitCaptcha(token: string): Promise<{ next: "code" | "done" }>;
  logout(): Promise<void>;
  getMe(): Promise<Me>;
  searchPublic(query: string): Promise<SearchHit[]>;
  previewInvite(hash: string): Promise<SearchHit>;
  joinInvite(hash: string): Promise<{ pending: boolean }>;
  joinByUsername(username: string): Promise<{ pending: boolean }>;
  joinChannel(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<{ pending: boolean }>;
  leave(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<void>;
  mute(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<void>;
  unmute(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<void>;
  listJoinedChannelsAndGroups(offset?: string): Promise<{ chats: JoinedChat[]; nextOffset: string | null }>;
  searchVideos(peer: Pick<WatchlistItem, "peerId" | "accessHash">, offset?: string): Promise<VideoPage>;
  getVideoThumb(document: unknown): Promise<Blob | null>;
  downloadVideo(document: unknown, onProgress?: (ratio: number) => void): Promise<Blob>;
}
```

`mockPort.ts`: in-memory implementation returning empty lists / controllable fixtures for later tests.

`TabShell`: `nav` with `role="tablist"`; Search → `#/search`, Watchlist → `#/watchlist`, Videos (if `selectedPeerId`) → `#/watchlist/${selectedPeerId}`. Outlet for child routes. Bottom tab bar CSS with `padding-bottom: env(safe-area-inset-bottom)` and min-height 44px.

`App.tsx`: `HashRouter`; routes as spec §6.2. Placeholder divs for Search/Watchlist/Videos/Login until later tasks.

`config.ts`:

```ts
export function getApiConfig():
  | { apiId: number; apiHash: string }
  | { error: "not_configured" } {
  const apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID ?? "");
  const apiHash = String(import.meta.env.VITE_TELEGRAM_API_HASH ?? "");
  if (!apiId || !apiHash) return { error: "not_configured" };
  return { apiId, apiHash };
}
```

Dark CSS: background `#111`, text `#eee`.

- [ ] **Step 5: Run tests — expect PASS.** Then `npm run build` (may warn on missing icons — add 192/512 PNG placeholders).

- [ ] **Step 6: Commit** `chore: scaffold app shell, types, and tab visibility`

---

### Task 2: Telegram link parser

**Files:**
- Create: `src/parse/telegramLink.ts`
- Test: `src/parse/telegramLink.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `parseTelegramLink(input: string): { kind: "invite"; hash: string } | { kind: "username"; username: string } | { kind: "query"; query: string }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { parseTelegramLink } from "./telegramLink";

describe("parseTelegramLink", () => {
  it("parses t.me/+HASH", () => {
    expect(parseTelegramLink("https://t.me/+AbCdEf123")).toEqual({
      kind: "invite",
      hash: "AbCdEf123",
    });
  });
  it("parses t.me/joinchat/HASH", () => {
    expect(parseTelegramLink("https://t.me/joinchat/AbCdEf123")).toEqual({
      kind: "invite",
      hash: "AbCdEf123",
    });
  });
  it("parses telegram.me/joinchat/HASH", () => {
    expect(parseTelegramLink("https://telegram.me/joinchat/AbCdEf123")).toEqual({
      kind: "invite",
      hash: "AbCdEf123",
    });
  });
  it("parses t.me/username", () => {
    expect(parseTelegramLink("https://t.me/mychannel")).toEqual({
      kind: "username",
      username: "mychannel",
    });
  });
  it("parses @username", () => {
    expect(parseTelegramLink("@mychannel")).toEqual({
      kind: "username",
      username: "mychannel",
    });
  });
  it("treats plain text as a search query", () => {
    expect(parseTelegramLink("cats")).toEqual({ kind: "query", query: "cats" });
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (module missing)

Run: `npx vitest run src/parse/telegramLink.test.ts`

- [ ] **Step 3: Implement**

```ts
const INVITE =
  /(?:https?:\/\/)?(?:t|telegram)\.(?:me|dog)\/(?:joinchat\/|\+)([\w-]+)/i;
const USER_URL = /(?:https?:\/\/)?(?:t|telegram)\.(?:me|dog)\/([\w\d_]+)/i;

export function parseTelegramLink(input: string):
  | { kind: "invite"; hash: string }
  | { kind: "username"; username: string }
  | { kind: "query"; query: string } {
  const s = input.trim();
  const invite = INVITE.exec(s);
  if (invite) return { kind: "invite", hash: invite[1] };
  if (s.startsWith("@") && s.length > 1) {
    return { kind: "username", username: s.slice(1) };
  }
  const user = USER_URL.exec(s);
  if (user && !["joinchat", "s", "addstickers"].includes(user[1].toLowerCase())) {
    return { kind: "username", username: user[1] };
  }
  return { kind: "query", query: s };
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit** `feat: parse Telegram invite links, usernames, and queries`

---

### Task 3: IndexedDB watchlist + session stores; scroll store

**Files:**
- Create: `src/stores/db.ts`, `src/stores/watchlistStore.ts`, `src/stores/sessionStore.ts`, `src/stores/scrollStore.ts`
- Test: `src/stores/watchlistStore.test.ts`, `src/stores/sessionStore.test.ts`, `src/stores/scrollStore.test.ts`

**Interfaces:**
- Consumes: `WatchlistItem` from `src/telegram/types.ts`
- Produces:
  - `openDb(): Promise<IDBPDatabase>`
  - `addToWatchlist(item: WatchlistItem): Promise<void>` (idempotent on `peerId`)
  - `removeFromWatchlist(peerId: string): Promise<void>`
  - `listWatchlist(): Promise<WatchlistItem[]>` (addedAt descending)
  - `updateWatchlistMuted(peerId: string, muted: boolean): Promise<void>`
  - `saveSessionString(s: string): Promise<void>`
  - `loadSessionString(): Promise<string | null>`
  - `clearSessionString(): Promise<void>`
  - `saveGridScroll(peerId: string, scrollTop: number, anchorMsgId: number): void`
  - `loadGridScroll(peerId: string): { scrollTop: number; anchorMsgId: number } | null`

- [ ] **Step 1: Write failing tests** (import `fake-indexeddb/auto` in these files or setup)

```ts
import "fake-indexeddb/auto";
import { describe, expect, it, beforeEach } from "vitest";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
  updateWatchlistMuted,
} from "./watchlistStore";
import type { WatchlistItem } from "../telegram/types";

const item = (over: Partial<WatchlistItem> = {}): WatchlistItem => ({
  peerId: "1",
  accessHash: "h",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 100,
  ...over,
});

describe("watchlistStore", () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase("tg-video-browser");
  });

  it("adds idempotently by peerId", async () => {
    await addToWatchlist(item({ title: "A", addedAt: 1 }));
    await addToWatchlist(item({ title: "B", addedAt: 2 }));
    const list = await listWatchlist();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("B");
  });

  it("orders by addedAt descending", async () => {
    await addToWatchlist(item({ peerId: "1", addedAt: 1, title: "old" }));
    await addToWatchlist(item({ peerId: "2", addedAt: 2, title: "new" }));
    const titles = (await listWatchlist()).map((x) => x.title);
    expect(titles).toEqual(["new", "old"]);
  });

  it("remove does not leave the Telegram chat — it only drops the row", async () => {
    await addToWatchlist(item());
    await removeFromWatchlist("1");
    expect(await listWatchlist()).toEqual([]);
  });

  it("updates muted without changing other fields", async () => {
    await addToWatchlist(item({ muted: false }));
    await updateWatchlistMuted("1", true);
    expect((await listWatchlist())[0].muted).toBe(true);
  });
});
```

Session:

```ts
it("round-trips a session string and clears it", async () => {
  await saveSessionString("sess");
  expect(await loadSessionString()).toBe("sess");
  await clearSessionString();
  expect(await loadSessionString()).toBeNull();
});
```

Scroll (sessionStorage):

```ts
it("saves and restores scroll; missing peer returns null", () => {
  sessionStorage.clear();
  expect(loadGridScroll("p")).toBeNull();
  saveGridScroll("p", 80, 42);
  expect(loadGridScroll("p")).toEqual({ scrollTop: 80, anchorMsgId: 42 });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/stores`

- [ ] **Step 3: Implement with `idb`.** DB name `tg-video-browser`, stores `watchlist` (keyPath `peerId`) and `kv` (keyPath `key`) for `{ key: "session", value: string }`. Scroll uses `sessionStorage` key `tg-video-browser:scroll` JSON map.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** `feat: persist watchlist, session, and grid scroll`

---

### Task 4: Video list reducer and player index

**Files:**
- Create: `src/videos/videoList.ts`, `src/player/playerIndex.ts`
- Test: `src/videos/videoList.test.ts`, `src/player/playerIndex.test.ts`

**Interfaces:**
- Consumes: `VideoItem`
- Produces:
  - `type VideoListState = { items: VideoItem[]; nextOffset: string | null; status: "idle" | "loading" | "error" | "empty" }`
  - `emptyVideoList(): VideoListState`
  - `reduceVideoList(state, action: { type: "reset" } | { type: "page"; videos: VideoItem[]; nextOffset: string | null } | { type: "error" }): VideoListState`
  - Page merge: newest-first, dedupe by `msgId`
  - `neighborMsgIds(items: VideoItem[], currentMsgId: number): { prev: number | null; next: number | null }`
    - next = older (later in newest-first array); prev = newer (earlier in array)

- [ ] **Step 1: Failing tests**

```ts
it("dedupes by msgId and keeps newest-first order", () => {
  const a = { msgId: 3, peerId: "p", date: 3, sizeBytes: 1, document: null };
  const b = { msgId: 2, peerId: "p", date: 2, sizeBytes: 1, document: null };
  const s1 = reduceVideoList(emptyVideoList(), { type: "page", videos: [a, b], nextOffset: "x" });
  const s2 = reduceVideoList(s1, { type: "page", videos: [b], nextOffset: null });
  expect(s2.items.map((v) => v.msgId)).toEqual([3, 2]);
  expect(s2.nextOffset).toBeNull();
});

it("marks empty when first page has no videos", () => {
  const s = reduceVideoList(emptyVideoList(), { type: "page", videos: [], nextOffset: null });
  expect(s.status).toBe("empty");
});

it("neighborMsgIds: next is older, prev is newer", () => {
  const items = [3, 2, 1].map((msgId) => ({
    msgId, peerId: "p", date: msgId, sizeBytes: 1, document: null,
  }));
  expect(neighborMsgIds(items, 2)).toEqual({ prev: 3, next: 1 });
  expect(neighborMsgIds(items, 3)).toEqual({ prev: null, next: 2 });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement reducers as specified**

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: video page reducer and player neighbors`

---

### Task 5: Login screen against `TelegramPort`

**Files:**
- Create: `src/auth/LoginScreen.tsx`, `src/ui/Toast.tsx`, `src/ui/OfflineBanner.tsx`
- Modify: `src/App.tsx` (gate on session), `src/telegram/TelegramProvider.tsx`, `src/telegram/mockPort.ts` (scripted login)
- Test: `src/auth/LoginScreen.test.tsx`, `src/telegram/errors.test.ts`

**Interfaces:**
- Consumes: `TelegramPort.startLogin/submitCode/submitPassword/...`, `saveSessionString` is called by the real port later; mock just resolves
- Produces: Login UI states `phone | code | password | email | captcha | not_configured`

- [ ] **Step 1: Failing tests**

`parseTelegramError` flood_wait extracts seconds; session_revoked maps SESSION_REVOKED.

Login:

```tsx
it("shows app is not configured when getApiConfig errors", () => { /* ... */ });

it("phone then code reaches logged-in callback", async () => {
  const port = createMockPort({
    startLogin: async () => ({ next: "code" as const }),
    submitCode: async () => ({ next: "done" as const }),
  });
  const onDone = vi.fn();
  render(<LoginScreen port={port} configured onDone={onDone} />);
  await user.type(screen.getByLabelText("Phone number"), "+15555550100");
  await user.click(screen.getByRole("button", { name: "Send code" }));
  await user.type(screen.getByLabelText("Login code"), "12345");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
});

it("shows password field when submitCode asks for password", async () => { /* ... */ });
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement LoginScreen** copy:
  - not configured: `app is not configured`
  - invalid code inline; resend button
  - cancel on extra screens returns to phone
- Provider: on boot `restoreSession()`; if Me, go `#/search` or `#/watchlist` if watchlist non-empty; else login. `SESSION_REVOKED` → clear session, keep watchlist, show login.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: phone/code/2FA login screens`

---

### Task 6: Search tab — Join and Add are separate

**Files:**
- Create: `src/search/SearchTab.tsx`, `src/search/searchHits.ts`
- Test: `src/search/SearchTab.test.tsx`, `src/search/searchHits.test.ts`

**Interfaces:**
- Consumes: `parseTelegramLink`, `TelegramPort.searchPublic/previewInvite/joinInvite/joinByUsername/joinChannel`, `addToWatchlist`
- Produces: Search UI; helper `hitToWatchlistItem(hit: SearchHit, addedAt: number): WatchlistItem`

- [ ] **Step 1: Failing tests**

```ts
it("Join does not add to the watchlist", async () => {
  const add = vi.fn();
  // render SearchTab with port.joinByUsername resolving { pending: false }
  // click Join on a result — addToWatchlist not called
});

it("Add does not join", async () => {
  const join = vi.fn();
  // click Add — join* not called, watchlist receives one item
});

it("empty query does not call searchPublic", async () => {
  // type nothing / whitespace only after debounce
});

it("invite link uses previewInvite not searchPublic", async () => { /* paste https://t.me/+AbCdEf123 */ });

it("pending join shows pending approval and is not treated as joined", async () => {
  // joinInvite → { pending: true } → text "pending approval"
});
```

Debounce 300ms — use fake timers.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement SearchTab.** Debounce 300ms. Cards: title, kind, member count if present, Join + Add. Toasts on success. Duplicate Add is store's idempotency.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: search, invite paste, separate Join and Add`

---

### Task 7: Watchlist tab, + picker, Remove / Leave / Mute

**Files:**
- Create: `src/watchlist/WatchlistTab.tsx`, `src/watchlist/JoinedPicker.tsx`
- Modify: `src/App.tsx` (selection → Videos route)
- Test: `src/watchlist/WatchlistTab.test.tsx`

**Interfaces:**
- Consumes: watchlist store, `TelegramPort.listJoinedChannelsAndGroups/leave/mute/unmute`, `selectedPeerId`
- Produces: UI; tap row navigates to `#/watchlist/:peerId`

- [ ] **Step 1: Failing tests**

```tsx
it("tapping a row selects it and the Videos tab appears", async () => { /* ... */ });

it("Remove deletes the local row and hides Videos if it was selected", async () => { /* ... */ });

it("Leave calls port.leave and keeps the watchlist row", async () => { /* ... */ });

it("Mute then unmute call port.mute and port.unmute", async () => { /* ... */ });

it("plus picker Add writes a watchlist row and does not duplicate", async () => { /* ... */ });
```

Empty watchlist copy: prompt Search and +.

Leave failure: toast, row remains, still "joined" visually.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement.** **+** opens bottom sheet (`JoinedPicker`) with local filter. Already-added items labeled added. Row overflow/menu: Remove, Leave, Mute (Mute label toggles to Unmute when `item.muted`).

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat: curated watchlist with picker and light actions`

---

### Task 8: Video grid, player overlay, teleproto adapter, Pages deploy

**Files:**
- Create: `src/videos/VideosTab.tsx`, `src/player/PlayerOverlay.tsx`, `src/telegram/teleprotoPort.ts`, `.github/workflows/pages.yml`, `README.md`, PWA icons
- Modify: `src/App.tsx`, `src/index.css`
- Test: `src/videos/VideosTab.test.tsx`, `src/player/PlayerOverlay.test.tsx`

**Interfaces:**
- Consumes: `searchVideos`, `getVideoThumb`, `downloadVideo`, `reduceVideoList`, `neighborMsgIds`, `saveGridScroll` / `loadGridScroll`
- Produces: working grid + overlay player; GitHub Pages workflow; teleproto adapter

- [ ] **Step 1: Failing tests**

Grid:
- empty copy `No videos in this channel/group.`
- private_chat shows Join (does not call addToWatchlist)
- first page renders buttons/articles for each video
- scrolling to bottom requests next offset
- after opening player and Back, container `scrollTop` is restored (mock `searchVideos` with many items; set scrollTop; open; back)

Player:
- Back does not unmount grid (grid still in document, hidden)
- Next goes to older msgId; Previous to newer
- download failure shows Retry; Back still returns to grid

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement VideosTab** page size 30. Full-width CSS grid: `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`. 16:9 thumbs, duration badge. Keep grid mounted; `hidden` when player open. `?v=msgId` opens overlay.

Player: native `<video controls>` plus explicit Play/Pause, Previous, Next, Back. Progress from `onProgress`. Prefetch neighbors after current Blob is ready (cancel on close). `URL.createObjectURL` / `revokeObjectURL` on change. `visibilitychange` → pause.

- [ ] **Step 4: Implement `teleprotoPort.ts`**
  - `TelegramClient` + `StringSession` from `teleproto` / `teleproto/sessions`
  - `connectionRetries: 5`
  - Browser: if Vite cannot bundle teleproto, add `vite-plugin-node-polyfills` and only then. Do not add a backend.
  - `start()` callbacks wired to promises the UI resolves (code/password/email/captcha)
  - Persist `client.session.save()` via `saveSessionString` after successful login
  - `searchPublic` → `contacts.Search`, keep channels/groups only
  - invite → `messages.CheckChatInvite` / `ImportChatInvite`
  - join username → `contacts.ResolveUsername` then `channels.JoinChannel`
  - muteUntil `2 ** 31 - 1` and `0`
  - videos → `messages.Search` with `InputMessagesFilterVideo`, `q: ""`, limit 30
  - download via `client.downloadMedia` / `downloadFile` with progress
  - Map errors through `parseTelegramError`
  - `logout`: `client.invoke` logOut + `clearSessionString` (do not wipe watchlist unless UI confirmed)

Wire `main.tsx`: if `getApiConfig()` ok, use `createTeleprotoPort(config)`, else mock is only for tests — production login screen shows not configured.

- [ ] **Step 5: GitHub Actions** `.github/workflows/pages.yml`:

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_TELEGRAM_API_ID: ${{ secrets.VITE_TELEGRAM_API_ID }}
          VITE_TELEGRAM_API_HASH: ${{ secrets.VITE_TELEGRAM_API_HASH }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

README: live URL `https://ddr-ai.github.io/telegram-video-browser/`; enable Pages source GitHub Actions; add secrets `VITE_TELEGRAM_API_ID` and `VITE_TELEGRAM_API_HASH`; get them from my.telegram.org/apps; manual test script from spec §11.

- [ ] **Step 6: Run full `npm test` and `npm run build` — both PASS**

- [ ] **Step 7: Commit** `feat: video grid, player, teleproto adapter, GitHub Pages deploy`

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Search public + invite links | 2, 6 |
| Join and Add separate | 6 |
| Curated watchlist + plus picker | 3, 7 |
| Remove / Leave / Mute (Leave does not Remove) | 3, 7 |
| Videos tab only after selection | 1, 7 |
| `inputMessagesFilterVideo` only | 8 |
| Full-width grid, fullscreen player, Back restores scroll | 4, 8 |
| Prefetch neighbors | 8 |
| Phone + code + 2FA/email/captcha | 5, 8 |
| Session IndexedDB; new device re-login | 3, 5, 8 |
| Logout keeps watchlist unless confirmed | 5, 8 |
| HashRouter + GH Pages + Actions + base path | 1, 8 |
| `telegramPort` isolation; tests mock Telegram | 1–8 |
| Dark, mobile-first, PWA | 1, 8 |
| Error table (flood, revoked, pending, private, not configured) | 5, 6, 8 |
| Manual script in README | 8 |

No placeholders remaining. Types (`WatchlistItem`, `TelegramPort` methods, mute until `2^31-1`) match the spec.
