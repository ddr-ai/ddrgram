import { o as __toESM } from "../_runtime.mjs";
import { y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import "./ssr.mjs";
import { a as Plus, u as Ellipsis } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as addToWatchlist, c as updateWatchlistMuted, i as useTelegram, o as listWatchlist, p as parseTelegramError, s as removeFromWatchlist } from "./router-DflTDkwd.mjs";
import { t as Button } from "./button-OVMT_Z7l.mjs";
import { t as Input } from "./input-DepRqlo_.mjs";
import { i as initials, r as hueFromId } from "./format-DGlZpr5_.mjs";
import { a as Trigger, i as Root2, n as Item2, r as Portal2, t as Content2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { t as Drawer } from "../_libs/vaul.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/watchlist.index-C5o0dAC2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function JoinedPicker({ open, onOpenChange, onAdded }) {
	const { port } = useTelegram();
	const [chats, setChats] = (0, import_react.useState)([]);
	const [filter, setFilter] = (0, import_react.useState)("");
	const [added, setAdded] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!open || !port) return;
		let cancelled = false;
		(async () => {
			setBusy(true);
			try {
				const [page, list] = await Promise.all([port.listJoinedChannelsAndGroups(), listWatchlist()]);
				if (cancelled) return;
				setChats(page.chats);
				setAdded(new Set(list.map((x) => x.peerId)));
			} catch (err) {
				toast.error(parseTelegramError(err).message);
			} finally {
				if (!cancelled) setBusy(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, port]);
	const visible = (0, import_react.useMemo)(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return chats;
		return chats.filter((c) => c.title.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q));
	}, [chats, filter]);
	async function add(chat) {
		const item = {
			peerId: chat.peerId,
			accessHash: chat.accessHash,
			username: chat.username,
			title: chat.title,
			kind: chat.kind,
			photoBlob: chat.photoBlob,
			muted: false,
			addedAt: Date.now()
		};
		await addToWatchlist(item);
		setAdded((s) => new Set(s).add(chat.peerId));
		onAdded();
		toast.success("Added to watchlist");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Root, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Portal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Overlay, { className: "fixed inset-0 z-40 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Content, {
			className: "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-3 h-1 w-10 rounded-full bg-border" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Title, {
					className: "font-display text-lg font-semibold",
					children: "Add from joined chats"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					className: "mt-3",
					placeholder: "Filter",
					value: filter,
					onChange: (e) => setFilter(e.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 min-h-0 flex-1 overflow-y-auto",
					children: [
						busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Loading…"
						}) : null,
						!busy && visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "No channels or groups found."
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex flex-col gap-2",
							children: visible.map((chat) => {
								const isAdded = added.has(chat.peerId);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center gap-3 py-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "flex size-10 items-center justify-center rounded-lg text-xs font-semibold",
											style: { background: `hsl(${hueFromId(chat.peerId)} 28% 22%)` },
											children: initials(chat.title)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "truncate text-sm font-medium",
												children: chat.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-muted",
												children: chat.kind
											})]
										}),
										isAdded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-muted",
											children: "Added"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											onClick: () => void add(chat),
											children: "Add"
										})
									]
								}, chat.peerId);
							})
						})
					]
				})
			]
		})] })
	});
}
function WatchlistTab() {
	const { port } = useTelegram();
	const navigate = useNavigate();
	const [items, setItems] = (0, import_react.useState)([]);
	const [picker, setPicker] = (0, import_react.useState)(false);
	const reload = (0, import_react.useCallback)(async () => {
		setItems(await listWatchlist());
	}, []);
	(0, import_react.useEffect)(() => {
		reload();
	}, [reload]);
	async function remove(item) {
		await removeFromWatchlist(item.peerId);
		await reload();
		toast("Removed from watchlist");
	}
	async function leave(item) {
		if (!port) return;
		try {
			await port.leave(item);
			toast("Left chat");
		} catch (err) {
			toast.error(parseTelegramError(err).message);
		}
	}
	async function toggleMute(item) {
		if (!port) return;
		const nextMuted = !item.muted;
		setItems((list) => list.map((row) => row.peerId === item.peerId ? {
			...row,
			muted: nextMuted
		} : row));
		try {
			if (item.muted) await port.unmute(item);
			else await port.mute(item);
			await updateWatchlistMuted(item.peerId, nextMuted);
		} catch (err) {
			await reload();
			toast.error(parseTelegramError(err).message);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-lg font-semibold",
					children: "Watchlist"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "secondary",
					"aria-label": "Add from joined chats",
					onClick: () => setPicker(true),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto px-4 pb-4",
				children: items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted text-pretty",
					children: "No channels yet. Search public chats or tap + to add from chats you have already joined."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-2",
					children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2 rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left",
							onClick: () => void navigate({
								to: "/watchlist/$peerId",
								params: { peerId: item.peerId }
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
								style: { background: `hsl(${hueFromId(item.peerId)} 28% 22%)` },
								children: initials(item.title)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block truncate font-medium",
									children: item.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "block text-xs text-muted",
									children: [item.kind, item.muted ? " · muted" : ""]
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root2, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								"aria-label": "Chat actions",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "size-5" })
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Content2, {
							className: "z-50 min-w-40 rounded-xl bg-surface-2 p-1 shadow-[var(--shadow-border)]",
							sideOffset: 6,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
									className: "flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-surface",
									onSelect: () => void remove(item),
									children: "Remove"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
									className: "flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-surface",
									onSelect: () => void leave(item),
									children: "Leave"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
									className: "flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-surface",
									onSelect: () => void toggleMute(item),
									children: item.muted ? "Unmute" : "Mute"
								})
							]
						}) })] })]
					}, item.peerId))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JoinedPicker, {
				open: picker,
				onOpenChange: setPicker,
				onAdded: () => void reload()
			})
		]
	});
}
var SplitComponent = WatchlistTab;
//#endregion
export { SplitComponent as component };
