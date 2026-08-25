import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import "./ssr.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as addToWatchlist, f as AppError, i as useTelegram, p as parseTelegramError } from "./router-DflTDkwd.mjs";
import { t as Button } from "./button-OVMT_Z7l.mjs";
import { t as Input } from "./input-DepRqlo_.mjs";
import { i as initials, r as hueFromId, t as formatCount } from "./format-DGlZpr5_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/search-C6WPL7ID.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var INVITE = /(?:https?:\/\/)?(?:t|telegram)\.(?:me|dog)\/(?:joinchat\/|\+)([\w-]+)/i;
var USER_URL = /(?:https?:\/\/)?(?:t|telegram)\.(?:me|dog)\/([\w\d_]+)/i;
function parseTelegramLink(input) {
	const s = input.trim();
	const invite = INVITE.exec(s);
	if (invite) return {
		kind: "invite",
		hash: invite[1]
	};
	if (s.startsWith("@") && s.length > 1) return {
		kind: "username",
		username: s.slice(1)
	};
	const user = USER_URL.exec(s);
	if (user && ![
		"joinchat",
		"s",
		"addstickers"
	].includes(user[1].toLowerCase())) return {
		kind: "username",
		username: user[1]
	};
	return {
		kind: "query",
		query: s
	};
}
function hitToWatchlistItem(hit, addedAt) {
	return {
		peerId: hit.peerId,
		accessHash: hit.accessHash,
		username: hit.username,
		title: hit.title,
		kind: hit.kind,
		photoBlob: hit.photoBlob,
		muted: false,
		addedAt
	};
}
function SearchTab({ addItem = addToWatchlist }) {
	const { port } = useTelegram();
	const [query, setQuery] = (0, import_react.useState)("");
	const [hits, setHits] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [pending, setPending] = (0, import_react.useState)({});
	const seq = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		if (!port) return;
		const q = query.trim();
		if (!q) {
			setHits([]);
			setError(null);
			return;
		}
		const t = window.setTimeout(() => {
			run(q);
		}, 300);
		return () => window.clearTimeout(t);
	}, [query, port]);
	async function run(raw) {
		if (!port) return;
		const parsed = parseTelegramLink(raw);
		const id = ++seq.current;
		setBusy(true);
		setError(null);
		try {
			let next = [];
			if (parsed.kind === "invite") next = [await port.previewInvite(parsed.hash)];
			else if (parsed.kind === "username") {
				const found = await port.searchPublic(parsed.username);
				next = found.length > 0 ? found : [{
					peerId: parsed.username,
					accessHash: "0",
					username: parsed.username,
					title: parsed.username,
					kind: "channel",
					membership: "unknown"
				}];
			} else next = await port.searchPublic(parsed.query);
			if (id === seq.current) setHits(next);
		} catch (err) {
			if (id !== seq.current) return;
			const parsedErr = parseTelegramError(err);
			setHits([]);
			setError(parsedErr.message);
		} finally {
			if (id === seq.current) setBusy(false);
		}
	}
	async function join(hit) {
		if (!port) return;
		try {
			let result = { pending: false };
			const parsed = parseTelegramLink(query);
			if (parsed.kind === "invite") result = await port.joinInvite(parsed.hash);
			else if (hit.username) result = await port.joinByUsername(hit.username);
			else result = await port.joinChannel(hit);
			if (result.pending) {
				setPending((p) => ({
					...p,
					[hit.peerId]: true
				}));
				toast("Join request sent — pending approval");
			} else {
				toast.success("Joined");
				setHits((list) => list.map((h) => h.peerId === hit.peerId ? {
					...h,
					membership: "joined"
				} : h));
			}
		} catch (err) {
			const parsedErr = parseTelegramError(err);
			if (parsedErr.code === "join_pending") {
				setPending((p) => ({
					...p,
					[hit.peerId]: true
				}));
				toast("Join request sent — pending approval");
				return;
			}
			toast.error(parsedErr.message);
		}
	}
	async function add(hit) {
		try {
			await addItem(hitToWatchlistItem(hit, Date.now()));
			toast.success("Added to watchlist");
		} catch (err) {
			toast.error(err instanceof AppError ? err.message : "Could not add");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-b border-border px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "sr-only",
				htmlFor: "search-q",
				children: "Search"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "search-q",
				placeholder: "Search, @username, or t.me link",
				value: query,
				onChange: (e) => setQuery(e.target.value)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
			children: [
				!query.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted text-pretty",
					children: "Search public channels and groups, or paste an invite link. Join and Add are separate — adding does not join."
				}) : null,
				busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Searching…"
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-3",
					children: hits.map((hit) => {
						const isPending = pending[hit.peerId] || hit.membership === "pending";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
									style: { background: `hsl(${hueFromId(hit.peerId)} 28% 22%)` },
									children: initials(hit.title)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate font-medium",
											children: hit.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-muted",
											children: [hit.kind, hit.memberCount != null ? ` · ${formatCount(hit.memberCount)}` : ""]
										}),
										isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted",
											children: "pending approval"
										}) : null
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex shrink-0 flex-col gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => void join(hit),
										disabled: isPending || hit.membership === "joined",
										children: "Join"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										onClick: () => void add(hit),
										children: "Add"
									})]
								})
							]
						}, hit.peerId);
					})
				})
			]
		})]
	});
}
var SplitComponent = SearchTab;
//#endregion
export { SplitComponent as component };
