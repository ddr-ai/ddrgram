import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";
import { PromisedWebSockets } from "teleproto/extensions";
import bigInt from "big-integer";
import { AppError, parseTelegramError } from "./errors";
import type { FilePage, SearchPage, TelegramPort, VideoPage } from "./port";
import type { ChatKind, FileItem, JoinedChat, Me, SearchHit, VideoItem, WatchlistItem } from "./types";
import { classifyFile, extensionOf } from "../files/fileTypes";
import {
  clearSessionString,
  loadSessionString,
  saveSessionString,
} from "../stores/sessionStore";
import {
  buildSearchSources,
  rankHits,
  type SearchSource,
} from "../search/queryPlan";

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
  if (chat instanceof Api.Channel) {
    const accessHash = String(chat.accessHash ?? "0");
    if (chat.min && !chat.username && accessHash === "0") return null;
    return {
      peerId: String(chat.id),
      accessHash,
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

function peerKey(peer: Api.TypePeer): string | null {
  if (peer instanceof Api.PeerChannel) return String(peer.channelId);
  if (peer instanceof Api.PeerChat) return String(peer.chatId);
  return null;
}

function hitsFromChats(chats: Api.TypeChat[] | undefined, seen: Set<string>): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const chat of chats ?? []) {
    const mapped = mapChat(chat);
    if (!mapped || seen.has(mapped.peerId)) continue;
    seen.add(mapped.peerId);
    hits.push({ ...mapped, membership: "unknown" });
  }
  return hits;
}

function hitsFromFound(
  res: { myResults?: Api.TypePeer[]; results?: Api.TypePeer[]; chats?: Api.TypeChat[] },
  seen: Set<string>,
): SearchHit[] {
  const byId = new Map<string, Api.TypeChat>();
  for (const chat of res.chats ?? []) {
    if (chat instanceof Api.Channel || chat instanceof Api.Chat) {
      byId.set(String(chat.id), chat);
    }
  }
  const hits: SearchHit[] = [];
  for (const peer of [...(res.myResults ?? []), ...(res.results ?? [])]) {
    const id = peerKey(peer);
    if (!id || seen.has(id)) continue;
    const chat = byId.get(id);
    if (!chat) continue;
    const mapped = mapChat(chat);
    if (!mapped) continue;
    seen.add(id);
    hits.push({ ...mapped, membership: "unknown" });
  }
  hits.push(...hitsFromChats(res.chats, seen));
  return hits;
}

function inputPeerFromMessagePeer(
  peer: Api.TypePeer,
  chats: Api.TypeChat[],
): Api.TypeInputPeer {
  if (peer instanceof Api.PeerChannel) {
    const ch = chats.find(
      (c) => c instanceof Api.Channel && String(c.id) === String(peer.channelId),
    );
    if (ch instanceof Api.Channel && ch.accessHash) {
      return new Api.InputPeerChannel({
        channelId: ch.id,
        accessHash: ch.accessHash,
      });
    }
  }
  if (peer instanceof Api.PeerChat) {
    return new Api.InputPeerChat({ chatId: peer.chatId });
  }
  return new Api.InputPeerEmpty();
}

type GlobalCursor = {
  offsetRate: number;
  offsetPeer: Api.TypeInputPeer;
  offsetId: number;
};

type PublicSearchSession = {
  query: string;
  sources: SearchSource[];
  sourceIndex: number;
  seen: Set<string>;
  global: GlobalCursor;
  firstPage: boolean;
};

const SEARCH_PAGE_TARGET = 16;
const SEARCH_MAX_STEPS = 10;

function freshGlobalCursor(): GlobalCursor {
  return {
    offsetRate: 0,
    offsetPeer: new Api.InputPeerEmpty(),
    offsetId: 0,
  };
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

function fileFromMessage(msg: Api.Message, peerId: string): FileItem | null {
  const media = msg.media;
  const groupedId = msg.groupedId != null ? String(msg.groupedId) : undefined;
  if (media instanceof Api.MessageMediaPhoto && media.photo) {
    const name = `photo-${msg.id}.jpg`;
    return {
      msgId: msg.id,
      peerId,
      date: msg.date,
      name,
      ext: "jpg",
      mime: "image/jpeg",
      sizeBytes: 0,
      kind: "image",
      media,
      groupedId,
    };
  }
  if (!(media instanceof Api.MessageMediaDocument)) return null;
  const doc = media.document;
  if (!(doc instanceof Api.Document)) return null;
  const attrs = doc.attributes ?? [];
  const isVideo = attrs.some((a) => a instanceof Api.DocumentAttributeVideo);
  const isVoice = attrs.some(
    (a) => a instanceof Api.DocumentAttributeAudio && "voice" in a && a.voice,
  );
  const isSticker = attrs.some((a) => a instanceof Api.DocumentAttributeSticker);
  if (isVideo || isVoice || isSticker) return null;
  const filenameAttr = attrs.find(
    (a): a is Api.DocumentAttributeFilename => a instanceof Api.DocumentAttributeFilename,
  );
  const name = filenameAttr?.fileName || `file-${msg.id}`;
  const mime = doc.mimeType || "";
  const kind = classifyFile(name, mime);
  if (!kind || kind === "folder") return null;
  return {
    msgId: msg.id,
    peerId,
    date: msg.date,
    name,
    ext: extensionOf(name),
    mime,
    sizeBytes: Number(doc.size) || 0,
    kind,
    media,
    groupedId,
  };
}

function groupAlbumFolders(files: FileItem[]): FileItem[] {
  const groups = new Map<string, FileItem[]>();
  const singles: FileItem[] = [];
  for (const file of files) {
    if (!file.groupedId) {
      singles.push(file);
      continue;
    }
    const list = groups.get(file.groupedId) ?? [];
    list.push(file);
    groups.set(file.groupedId, list);
  }
  const out: FileItem[] = [...singles];
  for (const [groupedId, children] of groups) {
    if (children.length < 2) {
      out.push(...children);
      continue;
    }
    const first = children[0]!;
    out.push({
      msgId: first.msgId,
      peerId: first.peerId,
      date: first.date,
      name: `Album (${children.length} files)`,
      ext: "",
      mime: "application/x-directory",
      sizeBytes: children.reduce((sum, f) => sum + f.sizeBytes, 0),
      kind: "folder",
      media: first.media,
      groupedId,
      children,
    });
  }
  return out.sort((a, b) => b.date - a.date);
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
  let publicSearch: PublicSearchSession | null = null;
  let countActive = 0;
  const countWaiters: Array<() => void> = [];

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
    const sessionText = typeof session === "string" ? session : "";
    const c = new TelegramClient(
      new StringSession(sessionText),
      Number(creds.apiId),
      String(creds.apiHash),
      {
        connectionRetries: 5,
        floodSleepThreshold: 0,
        networkSocket: PromisedWebSockets,
        deviceModel: "TG Videos",
        systemVersion: "Web",
        appVersion: "0.1.0",
        langCode: "en",
        systemLangCode: "en",
      },
    );
    client = c;
    return c;
  }

  async function persistSession() {
    if (!client) return;
    const saved = client.session.save();
    if (typeof saved === "string" && saved.length > 0) await saveSessionString(saved);
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

    async searchPublic(query: string, offset?: string) {
      return wrap(async () => {
        const q = query.trim();
        if (!q) return { hits: [], nextOffset: null } satisfies SearchPage;
        const c = await ensureClient();
        const continuing = Boolean(offset) && publicSearch?.query === q;
        if (!continuing) {
          publicSearch = {
            query: q,
            sources: buildSearchSources(q),
            sourceIndex: 0,
            seen: new Set<string>(),
            global: freshGlobalCursor(),
            firstPage: true,
          };
        }
        const session = publicSearch;
        if (!session) return { hits: [], nextOffset: null } satisfies SearchPage;

        const batch: SearchHit[] = [];
        let steps = 0;
        const first = session.firstPage;
        session.firstPage = false;

        while (steps < SEARCH_MAX_STEPS && session.sourceIndex < session.sources.length) {
          const source = session.sources[session.sourceIndex];
          if (!source) break;
          steps++;

          if (source.type === "contacts") {
            try {
              const res = await c.api.contacts.search({ q: source.q, limit: 50 });
              const found = hitsFromFound(res, session.seen);
              batch.push(...found);
            } catch (err) {
              const parsed = parseTelegramError(err);
              if (parsed.code !== "unknown" && parsed.code !== "flood_wait") throw parsed;
              if (parsed.code === "flood_wait") throw parsed;
            }
            session.sourceIndex++;
            if (first && batch.length > 0) break;
            if (batch.length >= SEARCH_PAGE_TARGET) break;
            continue;
          }

          try {
            const res = await c.api.messages.searchGlobal({
              q: source.q,
              filter: { _: "inputMessagesFilterEmpty" },
              minDate: 0,
              maxDate: 0,
              offsetRate: session.global.offsetRate,
              offsetPeer: session.global.offsetPeer,
              offsetId: session.global.offsetId,
              limit: 30,
              broadcastsOnly: source.broadcastsOnly,
              groupsOnly: source.groupsOnly,
            });
            const chats = "chats" in res ? res.chats : [];
            const messages = "messages" in res && Array.isArray(res.messages) ? res.messages : [];
            batch.push(...hitsFromChats(chats, session.seen));
            const lastMsg = [...messages]
              .reverse()
              .find((m): m is Api.Message => m instanceof Api.Message);
            const exhausted = messages.length < 30 || !lastMsg;
            if (exhausted) {
              session.sourceIndex++;
              session.global = freshGlobalCursor();
            } else {
              const nextRate =
                "nextRate" in res && typeof res.nextRate === "number"
                  ? res.nextRate
                  : lastMsg.date;
              session.global = {
                offsetRate: nextRate ?? lastMsg.date,
                offsetPeer: inputPeerFromMessagePeer(lastMsg.peerId, chats),
                offsetId: lastMsg.id,
              };
            }
          } catch (err) {
            const parsed = parseTelegramError(err);
            if (parsed.code === "flood_wait") throw parsed;
            session.sourceIndex++;
            session.global = freshGlobalCursor();
          }
          if (batch.length >= SEARCH_PAGE_TARGET) break;
        }

        const hits = first ? batch : rankHits(q, batch);
        const nextOffset =
          session.sourceIndex < session.sources.length ? String(session.sourceIndex) : null;
        return { hits, nextOffset } satisfies SearchPage;
      });
    },

    async countVideos(peer) {
      if (!/^-?\d+$/.test(peer.peerId)) return null;
      const run = async (): Promise<number | null> => {
        const c = await ensureClient();
        const fetchCount = async () => {
          const res = await c.api.messages.search({
            peer: toInputPeer(peer),
            q: "",
            filter: { _: "inputMessagesFilterVideo" },
            minDate: 0,
            maxDate: 0,
            offsetId: 0,
            addOffset: 0,
            limit: 1,
            maxId: 0,
            minId: 0,
            hash: bigInt(0),
          });
          if ("count" in res && typeof res.count === "number") return res.count;
          if ("messages" in res && Array.isArray(res.messages)) return res.messages.length;
          return 0;
        };
        try {
          return await fetchCount();
        } catch (err) {
          const parsed = parseTelegramError(err);
          if (parsed.code === "flood_wait" && parsed.waitSeconds && parsed.waitSeconds <= 5) {
            await new Promise((r) => setTimeout(r, parsed.waitSeconds! * 1000));
            try {
              return await fetchCount();
            } catch {
              return null;
            }
          }
          return null;
        }
      };
      if (countActive >= 2) {
        await new Promise<void>((resolve) => {
          countWaiters.push(resolve);
        });
      }
      countActive++;
      try {
        return await run();
      } finally {
        countActive--;
        countWaiters.shift()?.();
      }
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

    async searchFiles(peer, offset?: string) {
      return wrap(async () => {
        const c = await ensureClient();
        let offsetId = offset ? Number(offset) : 0;
        if (!Number.isFinite(offsetId)) offsetId = 0;
        const collected: FileItem[] = [];
        let lastId = offsetId;
        let exhausted = false;
        let steps = 0;
        while (collected.length < 24 && steps < 5) {
          steps += 1;
          const res = await c.api.messages.getHistory({
            peer: toInputPeer(peer),
            offsetId: lastId,
            offsetDate: 0,
            addOffset: 0,
            limit: 40,
            maxId: 0,
            minId: 0,
            hash: bigInt(0),
          });
          const messages =
            "messages" in res && Array.isArray(res.messages) ? res.messages : [];
          if (messages.length === 0) {
            exhausted = true;
            break;
          }
          for (const raw of messages) {
            if (!(raw instanceof Api.Message)) continue;
            lastId = raw.id;
            const file = fileFromMessage(raw, peer.peerId);
            if (file) collected.push(file);
          }
          if (messages.length < 40) {
            exhausted = true;
            break;
          }
        }
        const files = groupAlbumFolders(collected);
        const nextOffset = exhausted || lastId === 0 ? null : String(lastId);
        return { files, nextOffset } satisfies FilePage;
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

    async getFileThumb(media: unknown) {
      return wrap(async () => {
        const c = await ensureClient();
        if (media instanceof Api.MessageMediaDocument && media.document instanceof Api.Document) {
          if (!media.document.thumbs || media.document.thumbs.length === 0) return null;
          const data = await c.downloadMedia(media, { thumb: 1 });
          if (!data || typeof data === "string") return null;
          try {
            return toBlob(data, "image/jpeg");
          } catch {
            return null;
          }
        }
        if (media instanceof Api.MessageMediaPhoto) {
          const data = await c.downloadMedia(media, { thumb: 1 });
          if (!data || typeof data === "string") return null;
          try {
            return toBlob(data, "image/jpeg");
          } catch {
            return null;
          }
        }
        return null;
      });
    },

    async downloadFile(media: unknown, onProgress?: (ratio: number) => void) {
      return wrap(async () => {
        const c = await ensureClient();
        if (
          !(media instanceof Api.MessageMediaDocument) &&
          !(media instanceof Api.MessageMediaPhoto)
        ) {
          throw new AppError("download_failed", "missing file");
        }
        const data = await c.downloadMedia(media, {
          progressCallback: (downloaded, total) => {
            const d = Number(downloaded);
            const t = Number(total);
            if (t > 0) onProgress?.(Math.min(1, d / t));
          },
        });
        onProgress?.(1);
        const mime =
          media instanceof Api.MessageMediaDocument && media.document instanceof Api.Document
            ? media.document.mimeType || "application/octet-stream"
            : "image/jpeg";
        return toBlob(data, mime);
      });
    },
  };

  void loginRunning;
  return port;
}
