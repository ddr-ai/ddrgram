import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Splash-C6417DBn.js
var import_jsx_runtime = require_jsx_runtime();
function Splash({ label = "Loading" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-6 text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex size-14 items-center justify-center rounded-2xl bg-surface-2 shadow-[var(--shadow-border)]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 32 32",
				className: "size-8",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "4",
					y: "7",
					width: "24",
					height: "18",
					rx: "3",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.6",
					className: "text-primary"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M14 12.5v7l7-3.5-7-3.5z",
					fill: "currentColor",
					className: "text-primary"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-xl font-semibold tracking-tight",
				children: "TG Videos"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: label
			})]
		})]
	});
}
//#endregion
export { Splash as t };
