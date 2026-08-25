import { o as __toESM } from "../_runtime.mjs";
import "./ssr.mjs";
import { d as saveSessionString, f as AppError, l as clearSessionString, p as parseTelegramError, u as loadSessionString } from "./router-DflTDkwd.mjs";
import { t as require_BigInteger } from "../_libs/big-integer.mjs";
import { n as require_sessions, r as require_extensions, t as require_teleproto } from "../_libs/teleproto.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/teleprotoPort-COTba03j.js
var import_teleproto = require_teleproto();
var import_sessions = require_sessions();
var import_extensions = require_extensions();
var import_BigInteger = /* @__PURE__ */ __toESM(require_BigInteger());
function deferred() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
function wrap(fn) {
	return fn().catch((err) => {
		throw parseTelegramError(err);
	});
}
function mapMe(user) {
	return {
		id: String(user.id ?? ""),
		firstName: user.firstName ?? ""
	};
}
function kindOfChannel(chat) {
	if (chat.megagroup || chat.gigagroup) return "group";
	return "channel";
}
function mapChat(chat) {
	if (chat instanceof import_teleproto.Api.Channel && !chat.min) return {
		peerId: String(chat.id),
		accessHash: String(chat.accessHash ?? "0"),
		username: chat.username,
		title: chat.title,
		kind: kindOfChannel(chat),
		memberCount: chat.participantsCount
	};
	if (chat instanceof import_teleproto.Api.Chat) return {
		peerId: String(chat.id),
		accessHash: "0",
		title: chat.title,
		kind: "group",
		memberCount: chat.participantsCount
	};
	return null;
}
function toInputPeer(peer) {
	const id = (0, import_BigInteger.default)(peer.peerId);
	if (!peer.accessHash || peer.accessHash === "0") return new import_teleproto.Api.InputPeerChat({ chatId: id });
	return new import_teleproto.Api.InputPeerChannel({
		channelId: id,
		accessHash: (0, import_BigInteger.default)(peer.accessHash)
	});
}
function videoFromMessage(msg, peerId) {
	const media = msg.media;
	if (!(media instanceof import_teleproto.Api.MessageMediaDocument)) return null;
	const doc = media.document;
	if (!(doc instanceof import_teleproto.Api.Document)) return null;
	const attrs = doc.attributes ?? [];
	const isRound = attrs.some((a) => a instanceof import_teleproto.Api.DocumentAttributeVideo && a.roundMessage);
	const isGif = attrs.some((a) => a instanceof import_teleproto.Api.DocumentAttributeAnimated);
	if (isRound || isGif) return null;
	const videoAttr = attrs.find((a) => a instanceof import_teleproto.Api.DocumentAttributeVideo);
	return {
		msgId: msg.id,
		peerId,
		date: msg.date,
		durationSec: videoAttr?.duration,
		width: videoAttr?.w,
		height: videoAttr?.h,
		sizeBytes: Number(doc.size),
		document: doc
	};
}
function toBlob(data, type) {
	if (!data || typeof data === "string") throw new AppError("download_failed", "empty download");
	const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return new Blob([copy], { type });
}
function createTeleprotoPort(creds) {
	let client = null;
	let phone = "";
	let me = null;
	let codeGate = deferred();
	let passwordGate = deferred();
	let emailGate = deferred();
	let emailCodeGate = deferred();
	let captchaGate = deferred();
	let stepGate = deferred();
	function resetGates() {
		codeGate = deferred();
		passwordGate = deferred();
		emailGate = deferred();
		emailCodeGate = deferred();
		captchaGate = deferred();
		stepGate = deferred();
	}
	async function ensureClient(session = "") {
		if (client) return client;
		const c = new import_teleproto.TelegramClient(new import_sessions.StringSession(session), creds.apiId, creds.apiHash, {
			connectionRetries: 5,
			floodSleepThreshold: 0,
			networkSocket: import_extensions.PromisedWebSockets,
			deviceModel: "TG Videos",
			systemVersion: "Web",
			appVersion: "0.1.0",
			langCode: "en",
			systemLangCode: "en"
		});
		client = c;
		return c;
	}
	async function persistSession() {
		if (!client) return;
		const saved = client.session.save();
		if (saved) await saveSessionString(saved);
	}
	return {
		async restoreSession() {
			return wrap(async () => {
				const session = await loadSessionString();
				if (!session) return null;
				const c = await ensureClient(session);
				await c.connect();
				try {
					if (!await c.checkAuthorization()) {
						await clearSessionString();
						await c.disconnect();
						client = null;
						return null;
					}
					me = mapMe(await c.getMe());
					return me;
				} catch (err) {
					const parsed = parseTelegramError(err);
					if (parsed.code === "session_revoked") {
						await clearSessionString();
						try {
							await c.disconnect();
						} catch {}
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
				c.start({
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
						return {
							type: "code",
							code
						};
					},
					reCaptchaCallback: async (siteKey) => {
						stepGate.resolve({
							next: "captcha",
							siteKey
						});
						stepGate = deferred();
						const token = await captchaGate.promise;
						captchaGate = deferred();
						return token;
					},
					onError: async (err) => {
						stepGate.reject(parseTelegramError(err));
						stepGate = deferred();
						return false;
					}
				}).then(async () => {
					me = mapMe(await c.getMe());
					await persistSession();
					stepGate.resolve({ next: "done" });
				}).catch((err) => {
					stepGate.reject(parseTelegramError(err));
				}).finally(() => {});
				const first = await stepGate.promise;
				if (first.next === "captcha") return {
					next: "captcha",
					siteKey: first.siteKey
				};
				if (first.next === "email" || first.next === "email_code") return { next: "email" };
				return { next: "code" };
			});
		},
		async submitCode(code) {
			return wrap(async () => {
				codeGate.resolve(code);
				const next = await stepGate.promise;
				if (next.next === "email_code" || next.next === "email") return { next: "email" };
				if (next.next === "password") return { next: "password" };
				if (next.next === "captcha") return {
					next: "captcha",
					siteKey: next.siteKey
				};
				return { next: "done" };
			});
		},
		async submitPassword(password) {
			return wrap(async () => {
				passwordGate.resolve(password);
				if ((await stepGate.promise).next !== "done") throw new AppError("password_needed", "password not accepted");
				return { next: "done" };
			});
		},
		async submitEmail(email) {
			return wrap(async () => {
				emailGate.resolve(email);
				await stepGate.promise;
				return { next: "email_code" };
			});
		},
		async submitEmailCode(code) {
			return wrap(async () => {
				emailCodeGate.resolve(code);
				await stepGate.promise;
				return { next: "done" };
			});
		},
		async submitCaptcha(token) {
			return wrap(async () => {
				captchaGate.resolve(token);
				if ((await stepGate.promise).next === "done") return { next: "done" };
				return { next: "code" };
			});
		},
		async logout() {
			return wrap(async () => {
				if (client) try {
					await client.logOut();
				} catch {
					try {
						await client.disconnect();
					} catch {}
				}
				client = null;
				me = null;
				await clearSessionString();
			});
		},
		async getMe() {
			return wrap(async () => {
				me = mapMe(await (await ensureClient()).getMe());
				return me;
			});
		},
		async searchPublic(query) {
			return wrap(async () => {
				const chats = (await (await ensureClient()).api.contacts.search({
					q: query,
					limit: 20
				})).chats ?? [];
				const hits = [];
				for (const chat of chats) {
					const mapped = mapChat(chat);
					if (mapped) hits.push({
						...mapped,
						membership: "unknown"
					});
				}
				return hits;
			});
		},
		async previewInvite(hash) {
			return wrap(async () => {
				const invite = await (await ensureClient()).invoke(new import_teleproto.Api.messages.CheckChatInvite({ hash }));
				if (invite instanceof import_teleproto.Api.ChatInviteAlready) {
					const mapped = mapChat(invite.chat);
					if (!mapped) throw new AppError("invalid_invite", "invite is not a channel or group");
					return {
						...mapped,
						membership: "joined"
					};
				}
				if (invite instanceof import_teleproto.Api.ChatInvite) {
					const kind = invite.channel && !invite.megagroup ? "channel" : "group";
					return {
						peerId: hash,
						accessHash: "0",
						title: invite.title,
						kind,
						memberCount: invite.participantsCount,
						membership: invite.requestNeeded ? "pending" : "unknown"
					};
				}
				throw new AppError("invalid_invite", "unsupported invite");
			});
		},
		async joinInvite(hash) {
			return wrap(async () => {
				const c = await ensureClient();
				try {
					await c.invoke(new import_teleproto.Api.messages.ImportChatInvite({ hash }));
					return { pending: false };
				} catch (err) {
					const parsed = parseTelegramError(err);
					if (parsed.code === "join_pending" || /INVITE_REQUEST_SENT/i.test(parsed.message)) return { pending: true };
					throw parsed;
				}
			});
		},
		async joinByUsername(username) {
			return wrap(async () => {
				const c = await ensureClient();
				const chat = ((await c.api.contacts.resolveUsername({ username })).chats ?? []).find((ch) => ch instanceof import_teleproto.Api.Channel || ch instanceof import_teleproto.Api.Chat);
				if (chat instanceof import_teleproto.Api.Channel) try {
					await c.api.channels.joinChannel({ channel: username });
					return { pending: false };
				} catch (err) {
					const parsed = parseTelegramError(err);
					if (parsed.code === "join_pending" || /INVITE_REQUEST_SENT/i.test(parsed.message)) return { pending: true };
					throw parsed;
				}
				if (chat instanceof import_teleproto.Api.Chat) return { pending: false };
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
					await c.invoke(new import_teleproto.Api.messages.DeleteChatUser({
						chatId: (0, import_BigInteger.default)(peer.peerId),
						userId: new import_teleproto.Api.InputUserSelf()
					}));
					return;
				}
				await c.api.channels.leaveChannel({ channel: toInputPeer(peer) });
			});
		},
		async mute(peer) {
			return wrap(async () => {
				await (await ensureClient()).updateNotifySettings(toInputPeer(peer), { muteUntil: 2147483647 });
			});
		},
		async unmute(peer) {
			return wrap(async () => {
				await (await ensureClient()).updateNotifySettings(toInputPeer(peer), { muteUntil: 0 });
			});
		},
		async listJoinedChannelsAndGroups(offset) {
			return wrap(async () => {
				const c = await ensureClient();
				let parsed = {};
				if (offset) try {
					parsed = JSON.parse(offset);
				} catch {
					parsed = {};
				}
				const dialogs = await c.getDialogs({
					limit: 40,
					offsetDate: parsed.offsetDate,
					offsetId: parsed.offsetId,
					offsetPeer: parsed.offsetPeer,
					ignoreMigrated: true
				});
				const chats = [];
				for (const d of dialogs) {
					const entity = d.entity;
					if (entity instanceof import_teleproto.Api.Channel || entity instanceof import_teleproto.Api.Chat) {
						const mapped = mapChat(entity);
						if (mapped) chats.push(mapped);
					}
				}
				const last = dialogs[dialogs.length - 1];
				return {
					chats,
					nextOffset: dialogs.length < 40 || !last ? null : JSON.stringify({
						offsetDate: last.date ?? 0,
						offsetId: last.message?.id ?? 0
					})
				};
			});
		},
		async searchVideos(peer, offset) {
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
					hash: (0, import_BigInteger.default)(0)
				});
				const messages = "messages" in res && Array.isArray(res.messages) ? res.messages : [];
				const videos = [];
				for (const raw of messages) if (raw instanceof import_teleproto.Api.Message) {
					const v = videoFromMessage(raw, peer.peerId);
					if (v) videos.push(v);
				}
				const last = videos[videos.length - 1];
				return {
					videos,
					nextOffset: messages.length >= 30 && last ? String(last.msgId) : null
				};
			});
		},
		async getVideoThumb(document) {
			return wrap(async () => {
				if (!(document instanceof import_teleproto.Api.Document)) return null;
				if (!document.thumbs || document.thumbs.length === 0) return null;
				const data = await (await ensureClient()).downloadMedia(new import_teleproto.Api.MessageMediaDocument({ document }), { thumb: 1 });
				if (!data || typeof data === "string") return null;
				try {
					return toBlob(data, "image/jpeg");
				} catch {
					return null;
				}
			});
		},
		async downloadVideo(document, onProgress) {
			return wrap(async () => {
				if (!(document instanceof import_teleproto.Api.Document)) throw new AppError("download_failed", "missing document");
				const data = await (await ensureClient()).downloadMedia(new import_teleproto.Api.MessageMediaDocument({ document }), { progressCallback: (downloaded, total) => {
					const d = Number(downloaded);
					const t = Number(total);
					if (t > 0) onProgress?.(Math.min(1, d / t));
				} });
				onProgress?.(1);
				return toBlob(data, document.mimeType || "video/mp4");
			});
		}
	};
}
//#endregion
export { createTeleprotoPort };
