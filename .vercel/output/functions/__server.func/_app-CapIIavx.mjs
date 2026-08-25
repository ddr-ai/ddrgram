import { o as __toESM } from "./_runtime.mjs";
import { d as useRouterState, m as Outlet, v as Link, y as useNavigate } from "./_libs/@tanstack/react-router+[...].mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "./_libs/@radix-ui/react-collection+[...].mjs";
import "./_ssr/ssr.mjs";
import { c as LogOut, d as Clapperboard, i as Search, l as ListVideo } from "./_libs/lucide-react.mjs";
import { i as useTelegram } from "./_ssr/router-DflTDkwd.mjs";
import { n as cn, t as Button } from "./_ssr/button-OVMT_Z7l.mjs";
import { t as Splash } from "./_ssr/Splash-C6417DBn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app-CapIIavx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function OfflineBanner() {
	const [offline, setOffline] = (0, import_react.useState)(typeof navigator !== "undefined" ? !navigator.onLine : false);
	(0, import_react.useEffect)(() => {
		const on = () => setOffline(false);
		const off = () => setOffline(true);
		window.addEventListener("online", on);
		window.addEventListener("offline", off);
		return () => {
			window.removeEventListener("online", on);
			window.removeEventListener("offline", off);
		};
	}, []);
	if (!offline) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "status",
		className: "bg-danger/20 px-4 py-2 text-center text-sm text-fg",
		children: "You are offline. Retry when you reconnect."
	});
}
function TabShell({ selectedPeerId, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-hidden",
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			role: "tablist",
			"aria-label": "Main",
			className: "tab-bar grid border-t border-border bg-surface",
			style: { gridTemplateColumns: selectedPeerId ? "1fr 1fr 1fr" : "1fr 1fr" },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLink, {
					to: "/search",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-5" }),
					children: "Search"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLink, {
					to: "/watchlist",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListVideo, { className: "size-5" }),
					children: "Watchlist"
				}),
				selectedPeerId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLink, {
					to: "/watchlist/$peerId",
					params: { peerId: selectedPeerId },
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clapperboard, { className: "size-5" }),
					children: "Videos"
				}) : null
			]
		})]
	});
}
function TabLink({ to, params, icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		role: "tab",
		"aria-label": children,
		to,
		params,
		className: cn("flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-muted", "[&.active]:text-fg"),
		children: [icon, children]
	});
}
function selectedPeerFromPath(pathname) {
	const match = pathname.match(/^\/watchlist\/([^/]+)/);
	return match ? decodeURIComponent(match[1]) : null;
}
function AppFrame({ children }) {
	const { me, logout } = useTelegram();
	const navigate = useNavigate();
	const selectedPeerId = selectedPeerFromPath(useRouterState({ select: (s) => s.location.pathname }));
	const [confirm, setConfirm] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OfflineBanner, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-3 border-b border-border px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-base font-semibold tracking-tight",
						children: "TG Videos"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-auto truncate text-sm text-muted",
						children: me?.firstName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						"aria-label": "Log out",
						onClick: () => setConfirm(true),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabShell, {
				selectedPeerId,
				children
			}),
			confirm ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-4 sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-lg font-semibold",
							children: "Log out?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted text-pretty",
							children: "Your watchlist stays on this device unless you clear it."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									onClick: async () => {
										await logout(false);
										setConfirm(false);
										await navigate({ to: "/login" });
									},
									children: "Log out"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									onClick: async () => {
										await logout(true);
										setConfirm(false);
										await navigate({ to: "/login" });
									},
									children: "Log out and clear watchlist"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									onClick: () => setConfirm(false),
									children: "Cancel"
								})
							]
						})
					]
				})
			}) : null
		]
	});
}
function AppLayout() {
	const { status } = useTelegram();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (status === "anon" || status === "needs_config") navigate({
			to: "/login",
			replace: true
		});
	}, [status, navigate]);
	if (status === "booting") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, {});
	if (status !== "ready") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, { label: "Redirecting" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppFrame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) });
}
//#endregion
export { AppLayout as component };
