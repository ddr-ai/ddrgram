import { o as __toESM } from "../_runtime.mjs";
import { _ as createRootRoute, g as createFileRoute, h as lazyRouteComponent, l as Scripts, m as Outlet, p as createRouter, u as HeadContent, x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as __exportAll } from "./ssr.mjs";
import { t as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as string, i as object, n as literal, o as union, r as number, t as number$1 } from "../_libs/zod.mjs";
import { t as openDB } from "../_libs/idb.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DflTDkwd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: error.message || "An unexpected error occurred. Try reloading the page."
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
function getApiConfig() {
	return { error: "not_configured" };
}
var AppError = class extends Error {
	code;
	waitSeconds;
	constructor(code, message, waitSeconds) {
		super(message);
		this.code = code;
		this.waitSeconds = waitSeconds;
		this.name = "AppError";
	}
};
function parseTelegramError(err) {
	if (err instanceof AppError) return err;
	const rec = err;
	const name = rec?.constructor?.name ?? "";
	const msg = String(rec?.errorMessage || rec?.message || err);
	if (typeof rec?.seconds === "number" && /FLOOD_WAIT|FloodWait|SlowModeWait/i.test(name + msg)) return new AppError("flood_wait", msg, rec.seconds);
	if (/SESSION_REVOKED|AUTH_KEY_UNREGISTERED/i.test(msg + name)) return new AppError("session_revoked", msg);
	if (/FLOOD_WAIT|SlowModeWait/i.test(msg + name)) return new AppError("flood_wait", msg, Number((/(\d+)/.exec(msg) ?? [])[1] ?? rec?.seconds ?? 0));
	if (/INVITE_HASH|INVITE_INVALID/i.test(msg)) return new AppError("invalid_invite", msg);
	if (/PASSWORD_HASH_INVALID|SESSION_PASSWORD_NEEDED/i.test(msg + name)) return new AppError("password_needed", msg);
	if (/PHONE_CODE_EXPIRED/i.test(msg)) return new AppError("code_expired", msg);
	if (/PHONE_CODE_INVALID/i.test(msg)) return new AppError("invalid_code", msg);
	if (/CHANNEL_PRIVATE|CHAT_PRIVATE|not a participant/i.test(msg)) return new AppError("private_chat", msg);
	if (/INVITE_REQUEST_SENT/i.test(msg)) return new AppError("join_pending", msg);
	if (/FROZEN|FROZEN_METHOD/i.test(msg + name)) return new AppError("frozen", msg);
	if (typeof navigator !== "undefined" && navigator.onLine === false) return new AppError("offline", msg);
	return new AppError("unknown", msg);
}
var DB_NAME = "tg-video-browser";
var dbPromise = null;
function openDb() {
	if (typeof indexedDB === "undefined") return Promise.reject(/* @__PURE__ */ new Error("IndexedDB is not available"));
	if (!dbPromise) dbPromise = openDB(DB_NAME, 1, { upgrade(db) {
		if (!db.objectStoreNames.contains("watchlist")) db.createObjectStore("watchlist", { keyPath: "peerId" });
		if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "key" });
	} });
	return dbPromise;
}
var SESSION_KEY = "session";
var API_KEY = "api";
async function saveSessionString(s) {
	await (await openDb()).put("kv", {
		key: SESSION_KEY,
		value: s
	});
}
async function loadSessionString() {
	return (await (await openDb()).get("kv", SESSION_KEY))?.value ?? null;
}
async function clearSessionString() {
	await (await openDb()).delete("kv", SESSION_KEY);
}
async function saveApiCredentials(c) {
	await (await openDb()).put("kv", {
		key: API_KEY,
		value: c
	});
}
async function loadApiCredentials() {
	const value = (await (await openDb()).get("kv", API_KEY))?.value;
	if (!value?.apiId || !value?.apiHash) return null;
	return value;
}
async function clearApiCredentials() {
	await (await openDb()).delete("kv", API_KEY);
}
async function addToWatchlist(item) {
	await (await openDb()).put("watchlist", item);
}
async function removeFromWatchlist(peerId) {
	await (await openDb()).delete("watchlist", peerId);
}
async function listWatchlist() {
	return (await (await openDb()).getAll("watchlist")).sort((a, b) => b.addedAt - a.addedAt);
}
async function updateWatchlistMuted(peerId, muted) {
	const db = await openDb();
	const item = await db.get("watchlist", peerId);
	if (!item) return;
	await db.put("watchlist", {
		...item,
		muted
	});
}
async function clearWatchlist() {
	await (await openDb()).clear("watchlist");
}
var TelegramContext = (0, import_react.createContext)(null);
function useTelegram() {
	const ctx = (0, import_react.useContext)(TelegramContext);
	if (!ctx) throw new Error("useTelegram must be used within TelegramProvider");
	return ctx;
}
async function loadPort(creds) {
	const { createTeleprotoPort } = await import("./teleprotoPort-COTba03j.mjs");
	return createTeleprotoPort(creds);
}
function TelegramProvider({ children, port: portProp, configured: configuredProp }) {
	const [port, setPort] = (0, import_react.useState)(portProp ?? null);
	const [me, setMe] = (0, import_react.useState)(null);
	const [status, setStatus] = (0, import_react.useState)(() => {
		if (portProp) return "anon";
		return "error" in getApiConfig() ? "needs_config" : "booting";
	});
	const [configured, setConfigured] = (0, import_react.useState)(Boolean(configuredProp ?? portProp));
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		if (portProp) {
			setPort(portProp);
			setConfigured(configuredProp ?? true);
			portProp.restoreSession().then((restored) => {
				if (cancelled) return;
				if (restored) {
					setMe(restored);
					setStatus("ready");
				} else setStatus("anon");
			});
			return () => {
				cancelled = true;
			};
		}
		(async () => {
			try {
				const env = getApiConfig();
				const saved = await loadApiCredentials();
				const creds = "error" in env ? saved : env;
				if (!creds) {
					if (!cancelled) setStatus("needs_config");
					return;
				}
				if (!cancelled) {
					setConfigured(true);
					setStatus("booting");
				}
				const p = await loadPort(creds);
				if (cancelled) return;
				setPort(p);
				setConfigured(true);
				try {
					const restored = await p.restoreSession();
					if (cancelled) return;
					if (restored) {
						setMe(restored);
						setStatus("ready");
					} else setStatus("anon");
				} catch (err) {
					if (parseTelegramError(err).code === "session_revoked") await clearSessionString();
					if (!cancelled) setStatus("anon");
				}
			} catch {
				if (!cancelled) setStatus("needs_config");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [portProp, configuredProp]);
	const saveCredentials = (0, import_react.useCallback)(async (apiId, apiHash) => {
		await saveApiCredentials({
			apiId,
			apiHash
		});
		const p = await loadPort({
			apiId,
			apiHash
		});
		setPort(p);
		setConfigured(true);
		setStatus("anon");
	}, []);
	const resetCredentials = (0, import_react.useCallback)(async () => {
		await clearApiCredentials();
		await clearSessionString();
		setPort(null);
		setMe(null);
		setConfigured(false);
		setStatus("needs_config");
	}, []);
	const markReady = (0, import_react.useCallback)((next) => {
		setMe(next);
		setStatus("ready");
	}, []);
	const logout = (0, import_react.useCallback)(async (alsoClearWatchlist = false) => {
		if (port) try {
			await port.logout();
		} catch {
			await clearSessionString();
		}
		else await clearSessionString();
		if (alsoClearWatchlist) await clearWatchlist();
		setMe(null);
		setStatus(configured ? "anon" : "needs_config");
	}, [port, configured]);
	const value = (0, import_react.useMemo)(() => ({
		port,
		me,
		status,
		configured,
		saveCredentials,
		resetCredentials,
		markReady,
		logout
	}), [
		port,
		me,
		status,
		configured,
		saveCredentials,
		resetCredentials,
		markReady,
		logout
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TelegramContext.Provider, {
		value,
		children
	});
}
function AppToaster() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		theme: "dark",
		position: "top-center",
		toastOptions: { className: "bg-surface text-fg border-border" }
	});
}
var styles_default = "/assets/styles-BXr6kPRk.css";
var APP_NAME = "Telegram Video Browser";
var Route$7 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title: APP_NAME },
			{
				name: "theme-color",
				content: "#0b0c0e"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "dark antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-bg text-fg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TelegramProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppToaster, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})] }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	})
});
var $$splitComponentImporter$6 = () => import("./routes-CHW5LjJq.mjs");
var Route$6 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("../_app-CapIIavx.mjs");
var Route$5 = createFileRoute("/_app")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./login-BETkVMX3.mjs");
var Route$4 = createFileRoute("/login")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./search-C6WPL7ID.mjs");
var Route$3 = createFileRoute("/_app/search")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./watchlist-DMWLPIKv.mjs");
var Route$2 = createFileRoute("/_app/watchlist")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./watchlist.index-C5o0dAC2.mjs");
var Route$1 = createFileRoute("/_app/watchlist/")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./watchlist._peerId-yq7aEueX.mjs");
var Route = createFileRoute("/_app/watchlist/$peerId")({
	ssr: false,
	validateSearch: object({ v: number$1().optional() }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$6.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$7
});
var AppRoute = Route$5.update({
	id: "/_app",
	getParentRoute: () => Route$7
});
var LoginRoute = Route$4.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$7
});
var AppSearchRoute = Route$3.update({
	id: "/search",
	path: "/search",
	getParentRoute: () => AppRoute
});
var AppWatchlistRoute = Route$2.update({
	id: "/watchlist",
	path: "/watchlist",
	getParentRoute: () => AppRoute
});
var AppWatchlistIndexRoute = Route$1.update({
	id: "/",
	path: "/",
	getParentRoute: () => AppWatchlistRoute
});
var AppWatchlistRouteChildren = {
	AppWatchlistPeerIdRoute: Route.update({
		id: "/$peerId",
		path: "/$peerId",
		getParentRoute: () => AppWatchlistRoute
	}),
	AppWatchlistIndexRoute
};
var AppRouteChildren = {
	AppSearchRoute,
	AppWatchlistRoute: AppWatchlistRoute._addFileChildren(AppWatchlistRouteChildren)
};
var rootRouteChildren = {
	IndexRoute,
	AppRoute: AppRoute._addFileChildren(AppRouteChildren),
	LoginRoute
};
var routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { addToWatchlist as a, updateWatchlistMuted as c, saveSessionString as d, AppError as f, useTelegram as i, clearSessionString as l, Route as n, listWatchlist as o, parseTelegramError as p, removeFromWatchlist as s, router_exports as t, loadSessionString as u };
