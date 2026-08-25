import { o as __toESM } from "../_runtime.mjs";
import { b as useSearch, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import "./ssr.mjs";
import { f as ChevronLeft, n as SkipForward, o as Play, r as SkipBack, s as Pause } from "../_libs/lucide-react.mjs";
import { i as useTelegram, n as Route, o as listWatchlist, p as parseTelegramError } from "./router-DflTDkwd.mjs";
import { t as Button } from "./button-OVMT_Z7l.mjs";
import { n as formatDuration } from "./format-DGlZpr5_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/watchlist._peerId-yq7aEueX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function neighborMsgIds(items, currentMsgId) {
	const i = items.findIndex((v) => v.msgId === currentMsgId);
	if (i < 0) return {
		prev: null,
		next: null
	};
	return {
		prev: i > 0 ? items[i - 1].msgId : null,
		next: i < items.length - 1 ? items[i + 1].msgId : null
	};
}
function revokeObjectUrl(url) {
	if (url) URL.revokeObjectURL(url);
}
function PlayerOverlay({ items, currentMsgId, peer, onClose, onChangeMsgId }) {
	const { port } = useTelegram();
	const videoRef = (0, import_react.useRef)(null);
	const cache = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const [objectUrl, setObjectUrl] = (0, import_react.useState)(null);
	const [progress, setProgress] = (0, import_react.useState)(0);
	const [error, setError] = (0, import_react.useState)(null);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const current = items.find((v) => v.msgId === currentMsgId) ?? null;
	const neighbors = neighborMsgIds(items, currentMsgId);
	(0, import_react.useEffect)(() => {
		const el = videoRef.current;
		if (!el) return;
		const onVis = () => {
			if (document.hidden) el.pause();
		};
		document.addEventListener("visibilitychange", onVis);
		return () => document.removeEventListener("visibilitychange", onVis);
	}, []);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		async function load() {
			if (!port || !current) return;
			setError(null);
			setProgress(0);
			setBusy(true);
			try {
				let blob = cache.current.get(current.msgId);
				if (!blob) {
					blob = await port.downloadVideo(current.document, (ratio) => {
						if (!cancelled) setProgress(ratio);
					});
					cache.current.set(current.msgId, blob);
				}
				if (cancelled) return;
				const url = URL.createObjectURL(blob);
				setObjectUrl((prev) => {
					revokeObjectUrl(prev);
					return url;
				});
				setProgress(1);
				const { prev, next } = neighborMsgIds(items, current.msgId);
				prefetch(prev);
				prefetch(next);
			} catch (err) {
				if (!cancelled) setError(parseTelegramError(err).message || "Download failed");
			} finally {
				if (!cancelled) setBusy(false);
			}
		}
		async function prefetch(msgId) {
			if (!port || msgId == null || cache.current.has(msgId)) return;
			const item = items.find((v) => v.msgId === msgId);
			if (!item) return;
			try {
				const blob = await port.downloadVideo(item.document);
				if (!cancelled) cache.current.set(msgId, blob);
			} catch {}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [
		current,
		items,
		port,
		peer.peerId
	]);
	(0, import_react.useEffect)(() => {
		return () => {
			setObjectUrl((prev) => {
				revokeObjectUrl(prev);
				return null;
			});
		};
	}, []);
	function togglePlay() {
		const el = videoRef.current;
		if (!el) return;
		if (el.paused) el.play();
		else el.pause();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-20 flex flex-col bg-bg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 px-2 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					"aria-label": "Back",
					onClick: onClose,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-5" }), "Back"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate text-sm text-muted",
					children: current ? (/* @__PURE__ */ new Date(current.date * 1e3)).toLocaleString() : ""
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative min-h-0 flex-1 bg-bg",
				children: objectUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
					ref: videoRef,
					className: "size-full object-contain",
					src: objectUrl,
					controls: true,
					playsInline: true,
					autoPlay: true,
					onPlay: () => setPlaying(true),
					onPause: () => setPlaying(false)
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex size-full flex-col items-center justify-center gap-3 px-6 text-center",
					children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => {
							cache.current.delete(currentMsgId);
							setError(null);
							setObjectUrl((u) => {
								revokeObjectUrl(u);
								return null;
							});
							onChangeMsgId(currentMsgId);
						},
						children: "Retry"
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted tabular-nums",
						children: busy ? `Downloading ${Math.round(progress * 100)}%` : "Preparing…"
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						disabled: neighbors.prev == null,
						onClick: () => neighbors.prev != null && onChangeMsgId(neighbors.prev),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipBack, { className: "size-4" }), "Previous"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: togglePlay,
						disabled: !objectUrl,
						children: [playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4 ml-0.5" }), playing ? "Pause" : "Play"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						disabled: neighbors.next == null,
						onClick: () => neighbors.next != null && onChangeMsgId(neighbors.next),
						children: ["Next", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, { className: "size-4" })]
					})
				]
			})
		]
	});
}
var KEY = "tg-video-browser:scroll";
function readMap() {
	if (typeof sessionStorage === "undefined") return {};
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return {};
		return JSON.parse(raw);
	} catch {
		return {};
	}
}
function writeMap(map) {
	sessionStorage.setItem(KEY, JSON.stringify(map));
}
function saveGridScroll(peerId, scrollTop, anchorMsgId) {
	const map = readMap();
	map[peerId] = {
		scrollTop,
		anchorMsgId
	};
	writeMap(map);
}
function loadGridScroll(peerId) {
	return readMap()[peerId] ?? null;
}
function emptyVideoList() {
	return {
		items: [],
		nextOffset: null,
		status: "idle"
	};
}
function reduceVideoList(state, action) {
	switch (action.type) {
		case "reset": return {
			items: [],
			nextOffset: null,
			status: "loading"
		};
		case "error": return {
			...state,
			status: "error"
		};
		case "page": {
			const seen = new Set(state.items.map((v) => v.msgId));
			const merged = [...state.items];
			for (const v of action.videos) if (!seen.has(v.msgId)) {
				seen.add(v.msgId);
				merged.push(v);
			}
			merged.sort((a, b) => b.date - a.date || b.msgId - a.msgId);
			const status = merged.length === 0 && !action.nextOffset ? "empty" : "idle";
			return {
				items: merged,
				nextOffset: action.nextOffset,
				status
			};
		}
		default: return state;
	}
}
function VideosTab({ peerId }) {
	const { port } = useTelegram();
	const navigate = useNavigate();
	const currentMsgId = useSearch({ strict: false }).v;
	const [peer, setPeer] = (0, import_react.useState)(null);
	const [state, dispatch] = (0, import_react.useReducer)(reduceVideoList, void 0, emptyVideoList);
	const [error, setError] = (0, import_react.useState)(null);
	const [thumbs, setThumbs] = (0, import_react.useState)({});
	const [loadingMore, setLoadingMore] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	const sentinel = (0, import_react.useRef)(null);
	const playerOpen = currentMsgId != null;
	(0, import_react.useEffect)(() => {
		listWatchlist().then((list) => {
			setPeer(list.find((x) => x.peerId === peerId) ?? null);
		});
	}, [peerId]);
	const loadPage = (0, import_react.useCallback)(async (offset) => {
		if (!port || !peer) return;
		if (!offset) {
			dispatch({ type: "reset" });
			setError(null);
		} else setLoadingMore(true);
		try {
			const page = await port.searchVideos(peer, offset);
			dispatch({
				type: "page",
				videos: page.videos,
				nextOffset: page.nextOffset
			});
		} catch (err) {
			const parsed = parseTelegramError(err);
			setError(parsed);
			dispatch({ type: "error" });
		} finally {
			setLoadingMore(false);
		}
	}, [port, peer]);
	(0, import_react.useEffect)(() => {
		if (peer) loadPage();
	}, [peer, loadPage]);
	(0, import_react.useEffect)(() => {
		if (!port) return;
		let cancelled = false;
		const urls = [];
		for (const v of state.items) {
			if (thumbs[v.msgId]) continue;
			port.getVideoThumb(v.document).then((blob) => {
				if (cancelled || !blob) return;
				const url = URL.createObjectURL(blob);
				urls.push(url);
				setThumbs((t) => ({
					...t,
					[v.msgId]: url
				}));
			});
		}
		return () => {
			cancelled = true;
		};
	}, [state.items, port]);
	(0, import_react.useEffect)(() => {
		const root = scroller.current;
		const el = sentinel.current;
		if (!root || !el) return;
		const io = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting) && state.nextOffset && !loadingMore) loadPage(state.nextOffset);
		}, {
			root,
			threshold: .1
		});
		io.observe(el);
		return () => io.disconnect();
	}, [
		state.nextOffset,
		loadingMore,
		loadPage
	]);
	(0, import_react.useEffect)(() => {
		if (playerOpen) return;
		const el = scroller.current;
		if (!el) return;
		const saved = loadGridScroll(peerId);
		if (!saved) return;
		el.scrollTop = saved.scrollTop;
		const cell = el.querySelector(`[data-msgid="${saved.anchorMsgId}"]`);
		if (cell) cell.scrollIntoView({ block: "nearest" });
	}, [
		playerOpen,
		peerId,
		state.items.length
	]);
	function openPlayer(msgId) {
		const el = scroller.current;
		saveGridScroll(peerId, el?.scrollTop ?? 0, msgId);
		navigate({
			to: "/watchlist/$peerId",
			params: { peerId },
			search: { v: msgId }
		});
	}
	function closePlayer() {
		navigate({
			to: "/watchlist/$peerId",
			params: { peerId },
			search: {}
		});
	}
	async function join() {
		if (!port || !peer) return;
		try {
			if (peer.username) await port.joinByUsername(peer.username);
			else await port.joinChannel(peer);
			await loadPage();
		} catch (err) {
			setError(parseTelegramError(err));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: scroller,
			hidden: playerOpen,
			className: "min-h-0 flex-1 overflow-y-auto px-3 py-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mb-3 px-1 font-display text-lg font-semibold",
					children: peer?.title ?? "Videos"
				}),
				error?.code === "private_chat" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted text-pretty",
						children: "This chat is private or you are not a participant."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-3",
						onClick: () => void join(),
						children: "Join"
					})]
				}) : null,
				state.status === "empty" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-1 text-sm text-muted",
					children: "No videos in this channel/group."
				}) : null,
				state.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-1 text-sm text-muted",
					children: "Loading videos…"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "video-grid",
					children: state.items.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"data-msgid": v.msgId,
						className: "group relative aspect-video overflow-hidden rounded-lg bg-surface-2",
						onClick: () => openPlayer(v.msgId),
						children: [thumbs[v.msgId] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: thumbs[v.msgId],
							alt: "",
							className: "size-full object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 bg-surface-2" }), v.durationSec != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute right-1.5 bottom-1.5 rounded bg-bg/80 px-1.5 py-0.5 text-xs tabular-nums",
							children: formatDuration(v.durationSec)
						}) : null]
					}, v.msgId))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: sentinel,
					className: "h-8"
				}),
				loadingMore ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-2 text-center text-xs text-muted",
					children: "Loading more…"
				}) : null
			]
		}), playerOpen && peer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerOverlay, {
			items: state.items,
			currentMsgId,
			peer,
			onClose: closePlayer,
			onChangeMsgId: (id) => void navigate({
				to: "/watchlist/$peerId",
				params: { peerId },
				search: { v: id }
			})
		}) : null]
	});
}
function VideosRoute() {
	const { peerId } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideosTab, { peerId });
}
//#endregion
export { VideosRoute as component };
