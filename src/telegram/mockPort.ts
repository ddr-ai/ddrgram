import { AppError } from "./errors";
import type { TelegramPort } from "./port";
import type { JoinedChat, Me, SearchHit, VideoItem, WatchlistItem } from "./types";
import { saveSessionString, loadSessionString, clearSessionString } from "../stores/sessionStore";

const DEMO_ME: Me = { id: "1", firstName: "Test" };

function notImpl(name: string): never {
  throw new AppError("unknown", `${name} is not implemented on the mock port`);
}

export function createMockPort(overrides: Partial<TelegramPort> = {}): TelegramPort {
  let me: Me | null = null;
  const joined = new Set<string>();
  const muted = new Set<string>();

  const impl: TelegramPort = {
    async restoreSession() {
      const s = await loadSessionString();
      if (!s) return null;
      me = DEMO_ME;
      return me;
    },
    async startLogin() {
      return { next: "code" };
    },
    async submitCode(code: string) {
      if (code === "22222") return { next: "password" };
      if (code === "33333") return { next: "email" };
      if (code === "44444") return { next: "captcha", siteKey: "test-site" };
      if (code !== "12345") {
        throw new AppError("invalid_code", "PHONE_CODE_INVALID");
      }
      me = DEMO_ME;
      await saveSessionString("mock-session");
      return { next: "done" };
    },
    async submitPassword(password: string) {
      if (!password) throw new AppError("password_needed", "PASSWORD_HASH_INVALID");
      me = DEMO_ME;
      await saveSessionString("mock-session");
      return { next: "done" };
    },
    async submitEmail() {
      return { next: "email_code" };
    },
    async submitEmailCode() {
      me = DEMO_ME;
      await saveSessionString("mock-session");
      return { next: "done" };
    },
    async submitCaptcha() {
      return { next: "code" };
    },
    async logout() {
      me = null;
      await clearSessionString();
    },
    async getMe() {
      if (!me) throw new AppError("unknown", "not logged in");
      return me;
    },
    async searchPublic() {
      return [] as SearchHit[];
    },
    async previewInvite() {
      throw new AppError("invalid_invite", "INVITE_HASH_EXPIRED");
    },
    async joinInvite() {
      return { pending: false };
    },
    async joinByUsername(username: string) {
      joined.add(username);
      return { pending: false };
    },
    async joinChannel(peer) {
      joined.add(peer.peerId);
      return { pending: false };
    },
    async leave(peer) {
      joined.delete(peer.peerId);
    },
    async mute(peer) {
      muted.add(peer.peerId);
    },
    async unmute(peer) {
      muted.delete(peer.peerId);
    },
    async listJoinedChannelsAndGroups() {
      return { chats: [] as JoinedChat[], nextOffset: null };
    },
    async searchVideos() {
      return { videos: [] as VideoItem[], nextOffset: null };
    },
    async getVideoThumb() {
      return null;
    },
    async downloadVideo() {
      notImpl("downloadVideo");
    },
  };

  return { ...impl, ...overrides };
}

export type { WatchlistItem };
