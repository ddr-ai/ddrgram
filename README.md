# Telegram Video Browser

**Live:** [https://ddr-ai.github.io/ddrgram/](https://ddr-ai.github.io/ddrgram/)

A mobile-first web app that signs in with your Telegram account, lets you search and join public channels and groups, keeps a curated watchlist, and plays Telegram-hosted video files in a full-width grid.

This is not a messenger. There is no composer, DMs, GIFs, or round video notes.

## Sign in

1. Create an application at [my.telegram.org/apps](https://my.telegram.org/apps) and copy the **API ID** and **API hash**.
2. Open the app. If credentials were not baked in at build time, paste them on the first screen. They stay in this browser only.
3. Enter your phone number. Telegram sends a login code. If your account uses two-step verification, email, or a captcha, the app will ask.

The Telegram session lives in IndexedDB on this device. A new browser must sign in again. The watchlist syncs after login. Logging out keeps the watchlist unless you choose to clear it.

## Use

- **Search** public channels/groups or paste `t.me` / invite links. **Join** and **Add** are separate: Join changes Telegram membership; Add writes the watchlist (local + synced).
- **Watchlist** is curated. Tap a row to open its videos. **+** adds from chats you already joined. Row menu: Remove (local), Leave (Telegram), Mute / Unmute.
- **Videos** appears only after a watchlist item is selected. Grid is `inputMessagesFilterVideo` only. Tap a cell to play; Back restores scroll.

## Manual checks (real account)

1. Login with phone + code (and 2FA if the account has it).
2. Reload: still logged in.
3. Keyword search, join a public channel, add a different one without joining.
4. Paste an invite link and a `t.me/username` link.
5. + picker: add an already-joined group.
6. Open videos, scroll, play, next/prev, back — same grid position.
7. Mute, unmute, remove, leave.
8. Logout and login again: watchlist still there.
9. Phone width and a desktop width.

## Config

Build-time (optional, ends up in the public JS bundle):

```
VITE_TELEGRAM_API_ID
VITE_TELEGRAM_API_HASH
```

If those are missing, the login screen collects them and stores them locally.

Tests never call live Telegram or live Neon. They run against a mock port and in-memory maps.

## Watchlist sync

After Telegram login the watchlist is stored in Neon (Vercel). Videos stay in this browser’s IndexedDB (newest 50 prefetched).

Live (Vercel): set the project build command to `npm run build:vercel` and enable the database so `DATABASE_URL` is injected. Preview uses PGLite automatically. GitHub Pages remains a static fallback and does not sync the watchlist.

Identity is the Telegram user id from `getMe()`. Video files and the Telegram session never leave the device.

## GitHub Pages

Repo **Settings → Pages → Build and deployment**

- Source: **GitHub Actions** (workflow `.github/workflows/pages.yml`)

The site is a static SPA (`base` `/ddrgram/`, hash routes) so refresh works without server rewrites. Optional repo secrets `VITE_TELEGRAM_API_ID` and `VITE_TELEGRAM_API_HASH` bake credentials into the build; otherwise paste them on first launch.
