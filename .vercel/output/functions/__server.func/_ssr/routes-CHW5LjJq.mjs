import { o as __toESM } from "../_runtime.mjs";
import { y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import "./ssr.mjs";
import { i as useTelegram, o as listWatchlist } from "./router-DflTDkwd.mjs";
import { t as Splash } from "./Splash-C6417DBn.mjs";
import { t as LoginScreen } from "./LoginScreen-Dz1OLi7e.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CHW5LjJq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const { port, status, configured, saveCredentials, resetCredentials, markReady } = useTelegram();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (status === "ready") listWatchlist().then((list) => {
			navigate({
				to: list.length > 0 ? "/watchlist" : "/search",
				replace: true
			});
		});
	}, [status, navigate]);
	if (status === "ready") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, { label: "Opening TG Videos" });
	if (status === "booting") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginScreen, {
		port: port ?? void 0,
		configured: configured && status !== "needs_config",
		onSaveCredentials: saveCredentials,
		onResetCredentials: resetCredentials,
		onDone: async () => {
			if (!port) return;
			const me = await port.getMe();
			markReady(me);
		}
	});
}
//#endregion
export { Home as component };
