import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { PromisedWebSockets } from "teleproto/extensions";
import bigInt from "big-integer";
import { AppError, parseTelegramError } from "./errors";
import type { TelegramPort, VideoPage } from "./port";
import type { ChatKind, JoinedChat, Me, SearchHit, VideoItem, WatchlistItem } from "./types";
import {
  clearSessionString,
  loadSessionString,
  saveSessionString,
} from "../stores/sessionStore";

type Creds = { apiId: number; apiHash: string };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    throw parseTelegramError(err);
  });
}

function mapMe(user: { id?: unknown; firstName?: string | null }): Me {
  return { id: String(user.id ?? ""), firstName: user.firstName ?? "" };
}

function kindOfChannel(chat: Api.Channel): ChatKind {
  if (chat.megagroup || chat.gigagroup) return "group";
  return "channel";
}

function mapChat(chat: Api.TypeChat): Omit<SearchHit, "membership"> | null {
  if (chat instanceof Api.Channel && !chat.min) {
    return {
      peerId: String(chat.id),
      accessHash: String(chat.accessHash ?? "0"),
      username: chat.username,
      title: chat.title,
      kind: kindOfChannel(chat),
      memberCount: chat.participantsCount,
    };
  }
  if (chat instanceof Api.Chat) {
    return {
      peerId: String(chat.id),
      accessHash: "0",
      title: chat.title,
      kind: "group",
      memberCount: chat.participantsCount,
    };
  }
  return null;
}

function toInputPeer(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Api.TypeInputPeer {
  const id = bigInt(peer.peerId);
  if (!peer.accessHash || peer.accessHash === "0") {
    return new Api.InputPeerChat({ chatId: id });
  }
  return new Api.InputPeerChannel({
    channelId: id,
    accessHash: bigInt(peer.accessHash),
  });
}

function videoFromMessage(msg: Api.Message, peerId: string): VideoItem | null {
  const media = msg.media;
  if (!(media instanceof Api.MessageMediaDocument)) return null;
  const doc = media.document;
  if (!(doc instanceof Api.Document)) return null;
  const attrs = doc.attributes ?? [];
  const isRound = attrs.some(
    (a) => a instanceof Api.DocumentAttributeVideo && a.roundMessage,
  );
  const isGif = attrs.some((a) => a instanceof Api.DocumentAttributeAnimated);
  if (isRound || isGif) return null;
  const videoAttr = attrs.find(
    (a): a is Api.DocumentAttributeVideo => a instanceof Api.DocumentAttributeVideo,
  );
  return {
    msgId: msg.id,
    peerId,
    date: msg.date,
    durationSec: videoAttr?.duration,
    width: videoAttr?.w,
    height: videoAttr?.h,
    sizeBytes: Number(doc.size),
    document: doc,
  };
}

function toBlob(data: Buffer | Uint8Array | string | undefined, type: string): Blob {
  if (!data || typeof data === "string") {
    throw new AppError("download_failed", "empty download");
  }
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
}

export function createTeleprotoPort(creds: Creds): TelegramPort {
  let client: TelegramClient | null = null;
  let phone = "";
  let me: Me | null = null;

  let codeGate = deferred<string>();
  let passwordGate = deferred<string>();
  let emailGate = deferred<string>();
  let emailCodeGate = deferred<string>();
  let captchaGate = deferred<string>();
  let stepGate = deferred<{
    next: "code" | "password" | "email" | "email_code" | "captcha" | "done";
    siteKey?: string;
  }>();
  let loginRunning = false;

  function resetGates() {
    codeGate = deferred();
    passwordGate = deferred();
    emailGate = deferred();
    emailCodeGate = deferred();
    captchaGate = deferred();
    stepGate = deferred();
  }

  async function ensureClient(session = ""): Promise<TelegramClient> {
    if (client) return client;
    const c = new TelegramClient(new StringSession(session), creds.apiId, creds.apiHash, {
      connectionRetries: 5,
      floodSleepThreshold: 0,
      networkSocket: PromisedWebSockets,
      deviceModel: "TG Videos",
      systemVersion: "Web",
      appVersion: "0.1.0",
      langCode: "en",
      systemLangCode: "en",
    });
    client = c;
    return c;
  }

  async function persistSession() {
    if (!client) return;
    const saved = client.session.save() as unknown as string;
    if (saved) await saveSessionString(saved);
  }

  const port: TelegramPort = {
    async restoreSession() {
      return wrap(async () => {
        const session = await loadSessionString();
        if (!session) return null;
        const c = await ensureClient(session);
        await c.connect();
        try {
          const ok = await c.checkAuthorization();
          if (!ok) {
            await clearSessionString();
            await c.disconnect();
            client = null;
            return null;
          }
          const user = await c.getMe();
          me = mapMe(user);
          return me;
        } catch (err) {
          const parsed = parseTelegramError(err);
          if (parsed.code === "session_revoked") {
            await clearSessionString();
            try {
              await c.disconnect();
            } catch {
              // ignore
            }
            client = null;
          }
          throw parsed;
        }
      });
    },

    async startLogin(input) {
      return wrap(async () => {
        phone = input.phone;
        resetGates();
        const c = await ensureClient();
        if (!c.connected) await c.connect();

        loginRunning = true;
        void c
          .start({
            phoneNumber: async () => phone,
            phoneCode: async () => {
              stepGate.resolve({ next: "code" });
              stepGate = deferred();
              const code = await codeGate.promise;
              codeGate = deferred();
              return code;
            },
            password: async () => {
              stepGate.resolve({ next: "password" });
              stepGate = deferred();
              const pw = await passwordGate.promise;
              passwordGate = deferred();
              return pw;
            },
            emailAddress: async () => {
              stepGate.resolve({ next: "email" });
              stepGate = deferred();
              const email = await emailGate.promise;
              emailGate = deferred();
              return email;
            },
            emailVerification: async () => {
              stepGate.resolve({ next: "email_code" });
              stepGate = deferred();
              const code = await emailCodeGate.promise;
              emailCodeGate = deferred();
              return { type: "code", code };
            },
            reCaptchaCallback: async (siteKey: string) => {
              stepGate.resolve({ next: "captcha", siteKey });
              stepGate = deferred();
              const token = await captchaGate.promise;
              captchaGate = deferred();
              return token;
            },
            onError: async (err) => {
              stepGate.reject(parseTelegramError(err));
              stepGate = deferred();
              return false;
            },
          })
          .then(async () => {
            const user = await c.getMe();
            me = mapMe(user);
            await persistSession();
            stepGate.resolve({ next: "done" });
          })
          .catch((err) => {
            stepGate.reject(parseTelegramError(err));
          })
          .finally(() => {
            loginRunning = false;
          });

        const first = await stepGate.promise;
        if (first.next === "captcha") return { next: "captcha" as const, siteKey: first.siteKey };
        if (first.next === "email" || first.next === "email_code") {
          return { next: "email" as const };
        }
        return { next: "code" as const };
      });
    },

    async submitCode(code: string) {
      return wrap(async () => {
        codeGate.resolve(code);
        const next = await stepGate.promise;
        if (next.next === "email_code" || next.next === "email") {
          return { next: "email" as const };
        }
        if (next.next === "password") return { next: "password" as const };
        if (next.next === "captcha") {
          return { next: "captcha" as const, siteKey: next.siteKey };
        }
        return { next: "done" as const };
      });
    },

    async submitPassword(password: string) {
      return wrap(async () => {
        passwordGate.resolve(password);
        const next = await stepGate.promise;
        if (next.next !== "done") {
          throw new AppError("password_needed", "password not accepted");
        }
        return { next: "done" as const };
      });
    },

    async submitEmail(email: string) {
      return wrap(async () => {
        emailGate.resolve(email);
        await stepGate.promise;
        return { next: "email_code" as const };
      });
    },

    async submitEmailCode(code: string) {
      return wrap(async () => {
        emailCodeGate.resolve(code);
        await stepGate.promise;
        return { next: "done" as const };
      });
    },

    async submitCaptcha(token: string) {
      return wrap(async () => {
        captchaGate.resolve(token);
        const next = await stepGate.promise;
        if (next.next === "done") return { next: "done" as const };
        return { next: "code" as const };
      });
    },

    async logout() {
      return wrap(async () => {
        if (client) {
          try {
            await client.logOut();
          } catch {
            try {
              await client.disconnect();
            } catch {
              // ignore
            }
          }
        }
        client = null;
        me = null;
        loginRunning = false;
        await clearSessionString();
      });
    },

    async getMe() {
      return wrap(async () => {
        const c = await ensureClient();
        const user = await c.getMe();
        me = mapMe(user);
        return me;
      });
    },

    async searchPublic(query: string) {
      return wrap(async () => {
        const c = await ensureClient();
        const res = await c.api.contacts.search({ q: query, limit: 20 });
        const chats = res.chats ?? [];
        const hits: SearchHit[] = [];
        for (const chat of chats) {
          const mapped = mapChat(chat);
          if (mapped) hits.push({ ...mapped, membership: "unknown" });
        }
        return hits;
      });
    },

    async previewInvite(hash: string) {
      return wrap(async () => {
        const c = await ensureClient();
        const invite = await c.invoke(new Api.messages.CheckChatInvite({ hash }));
        if (invite instanceof Api.ChatInviteAlready) {
          const mapped = mapChat(invite.chat);
          if (!mapped) throw new AppError("invalid_invite", "invite is not a channel or group");
          return { ...mapped, membership: "joined" as const };
        }
        if (invite instanceof Api.ChatInvite) {
          const kind: ChatKind = invite.channel && !invite.megagroup ? "channel" : "group";
          return {
            peerId: hash,
            accessHash: "0",
            title: invite.title,
            kind,
            memberCount: invite.participantsCount,
            membership: invite.requestNeeded ? "pending" : "unknown",
          };
        }
        throw new AppError("invalid_invite", "unsupported invite");
      });
    },

    async joinInvite(hash: string) {
      return wrap(async () => {
        const c = await ensureClient();
        try {
          await c.invoke(new Api.messages.ImportChatInvite({ hash }));
          return { pending: false };
        } catch (err) {
          const parsed = parseTelegramError(err);
          if (parsed.code === "join_pending" || /INVITE_REQUEST_SENT/i.test(parsed.message)) {
            return { pending: true };
          }
          throw parsed;
        }
      });
    },

    async joinByUsername(username: string) {
      return wrap(async () => {
        const c = await ensureClient();
        const resolved = await c.api.contacts.resolveUsername({ username });
        const chat = (resolved.chats ?? []).find(
          (ch) => ch instanceof Api.Channel || ch instanceof Api.Chat,
        );
        if (chat instanceof Api.Channel) {
          try {
            await c.api.channels.joinChannel({ channel: username });
            return { pending: false };
          } catch (err) {
            const parsed = parseTelegramError(err);
            if (parsed.code === "join_pending" || /INVITE_REQUEST_SENT/i.test(parsed.message)) {
              return { pending: true };
            }
            throw parsed;
          }
        }
        if (chat instanceof Api.Chat) {
          return { pending: false };
        }
        throw new AppError("private_chat", "not a channel or group");
      });
    },

    async joinChannel(peer) {
      return wrap(async () => {
        const c = await ensureClient();
        try {
          await c.api.channels.joinChannel({ channel: toInputPeer(peer) });
          return { pending: false };
        } catch (err) {
          const parsed = parseTelegramError(err);
          if (parsed.code === "join_pending") return { pending: true };
          throw parsed;
        }
      });
    },

    async leave(peer) {
      return wrap(async () => {
        const c = await ensureClient();
        if (!peer.accessHash || peer.accessHash === "0") {
          await c.invoke(
            new Api.messages.DeleteChatUser({
              chatId: bigInt(peer.peerId),
              userId: new Api.InputUserSelf(),
            }),
          );
          return;
        }
        await c.api.channels.leaveChannel({ channel: toInputPeer(peer) });
      });
    },

    async mute(peer) {
      return wrap(async () => {
        const c = await ensureClient();
        await c.updateNotifySettings(toInputPeer(peer), { muteUntil: 2147483647 });
      });
    },

    async unmute(peer) {
      return wrap(async () => {
        const c = await ensureClient();
        await c.updateNotifySettings(toInputPeer(peer), { muteUntil: 0 });
      });
    },

    async listJoinedChannelsAndGroups(offset?: string) {
      return wrap(async () => {
        const c = await ensureClient();
        let parsed: { offsetDate?: number; offsetId?: number; offsetPeer?: string } = {};
        if (offset) {
          try {
            parsed = JSON.parse(offset) as typeof parsed;
          } catch {
            parsed = {};
          }
        }
        const dialogs = await c.getDialogs({
          limit: 40,
          offsetDate: parsed.offsetDate,
          offsetId: parsed.offsetId,
          offsetPeer: parsed.offsetPeer,
          ignoreMigrated: true,
        });
        const chats: JoinedChat[] = [];
        for (const d of dialogs) {
          const entity = d.entity;
          if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
            const mapped = mapChat(entity);
            if (mapped) chats.push(mapped);
          }
        }
        const last = dialogs[dialogs.length - 1];
        const nextOffset =
          dialogs.length < 40 || !last
            ? null
            : JSON.stringify({
                offsetDate: last.date ?? 0,
                offsetId: last.message?.id ?? 0,
              });
        return { chats, nextOffset };
      });
    },

    async searchVideos(peer, offset?: string) {
      return wrap(async () => {
        const c = await ensureClient();
        const offsetId = offset ? Number(offset) : 0;
        const res = await c.api.messages.search({
          peer: toInputPeer(peer),
          q: "",
          filter: { _: "inputMessagesFilterVideo" },
          minDate: 0,
          maxDate: 0,
          offsetId: Number.isFinite(offsetId) ? offsetId : 0,
          addOffset: 0,
          limit: 30,
          maxId: 0,
          minId: 0,
          hash: bigInt(0),
        });
        const messages =
          "messages" in res && Array.isArray(res.messages) ? res.messages : [];
        const videos: VideoItem[] = [];
        for (const raw of messages) {
          if (raw instanceof Api.Message) {
            const v = videoFromMessage(raw, peer.peerId);
            if (v) videos.push(v);
          }
        }
        const last = videos[videos.length - 1];
        const nextOffset =
          messages.length >= 30 && last ? String(last.msgId) : null;
        return { videos, nextOffset } satisfies VideoPage;
      });
    },

    async getVideoThumb(document: unknown) {
      return wrap(async () => {
        if (!(document instanceof Api.Document)) return null;
        if (!document.thumbs || document.thumbs.length === 0) return null;
        const c = await ensureClient();
        const data = await c.downloadMedia(
          new Api.MessageMediaDocument({ document }),
          { thumb: 1 },
        );
        if (!data || typeof data === "string") return null;
        try {
          return toBlob(data, "image/jpeg");
        } catch {
          return null;
        }
      });
    },

    async downloadVideo(document: unknown, onProgress?: (ratio: number) => void) {
      return wrap(async () => {
        if (!(document instanceof Api.Document)) {
          throw new AppError("download_failed", "missing document");
        }
        const c = await ensureClient();
        const data = await c.downloadMedia(
          new Api.MessageMediaDocument({ document }),
          {
            progressCallback: (downloaded, total) => {
              const d = Number(downloaded);
              const t = Number(total);
              if (t > 0) onProgress?.(Math.min(1, d / t));
            },
          },
        );
        onProgress?.(1);
        return toBlob(data, document.mimeType || "video/mp4");
      });
    },
  };

  void loginRunning;
  return port;
}
