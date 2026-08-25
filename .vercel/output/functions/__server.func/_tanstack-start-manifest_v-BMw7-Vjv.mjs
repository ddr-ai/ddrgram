import "./_runtime.mjs";
import "./_ssr/ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_tanstack-start-manifest_v-BMw7-Vjv.js
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/workspace/src/routes/__root.tsx",
		children: [
			"/",
			"/_app",
			"/login"
		],
		preloads: [
			"/assets/index-CS59zdP2.js",
			"/assets/dist-ypP48_Ax.js",
			"/assets/jsx-runtime-BLLMKrIZ.js"
		],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-CS59zdP2.js"
		} }]
	},
	"/": {
		filePath: "/workspace/src/routes/index.tsx",
		children: void 0,
		preloads: [
			"/assets/routes-B0u4hb5n.js",
			"/assets/Splash-D6E2Vnrp.js",
			"/assets/LoginScreen-DNkaxDAg.js"
		]
	},
	"/_app": {
		filePath: "/workspace/src/routes/_app.tsx",
		children: ["/_app/search", "/_app/watchlist"],
		preloads: [
			"/assets/_app-B5Y_65Gc.js",
			"/assets/button-CRzno-yA.js",
			"/assets/Splash-D6E2Vnrp.js"
		]
	},
	"/login": {
		filePath: "/workspace/src/routes/login.tsx",
		children: void 0,
		preloads: [
			"/assets/login-AGAk_pq1.js",
			"/assets/Splash-D6E2Vnrp.js",
			"/assets/LoginScreen-DNkaxDAg.js"
		]
	},
	"/_app/search": {
		filePath: "/workspace/src/routes/_app/search.tsx",
		children: void 0,
		preloads: [
			"/assets/search-BT2ZQXCE.js",
			"/assets/input-BXzTgH9Q.js",
			"/assets/format-CwQvFk2O.js"
		]
	},
	"/_app/watchlist": {
		filePath: "/workspace/src/routes/_app/watchlist.tsx",
		children: ["/_app/watchlist/$peerId", "/_app/watchlist/"],
		preloads: ["/assets/watchlist-DlaYEIOn.js"]
	},
	"/_app/watchlist/$peerId": {
		filePath: "/workspace/src/routes/_app/watchlist.$peerId.tsx",
		children: void 0,
		preloads: ["/assets/watchlist._peerId-BPpdmI-r.js", "/assets/format-CwQvFk2O.js"]
	},
	"/_app/watchlist/": {
		filePath: "/workspace/src/routes/_app/watchlist.index.tsx",
		children: void 0,
		preloads: [
			"/assets/watchlist.index-BFR3rVb_.js",
			"/assets/input-BXzTgH9Q.js",
			"/assets/format-CwQvFk2O.js"
		]
	}
} });
//#endregion
export { tsrStartManifest };
