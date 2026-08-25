import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { f as AppError, p as parseTelegramError } from "./router-DflTDkwd.mjs";
import { t as Button } from "./button-OVMT_Z7l.mjs";
import { t as Input } from "./input-DepRqlo_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/LoginScreen-Dz1OLi7e.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginScreen({ port, configured, onDone, onSaveCredentials, onResetCredentials }) {
	const [step, setStep] = (0, import_react.useState)("phone");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [code, setCode] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [captcha, setCaptcha] = (0, import_react.useState)("");
	const [siteKey, setSiteKey] = (0, import_react.useState)();
	const [apiId, setApiId] = (0, import_react.useState)("");
	const [apiHash, setApiHash] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [waitSeconds, setWaitSeconds] = (0, import_react.useState)(null);
	function showErr(err) {
		const parsed = parseTelegramError(err);
		if (parsed.code === "flood_wait") {
			setWaitSeconds(parsed.waitSeconds ?? 0);
			setError(`Wait ${parsed.waitSeconds ?? 0}s before trying again.`);
			return;
		}
		if (parsed.code === "invalid_code" || parsed.code === "code_expired") {
			setError(parsed.code === "code_expired" ? "Code expired." : "Invalid code.");
			return;
		}
		setError(parsed.message || "Something went wrong.");
	}
	async function sendCode() {
		if (!port) return;
		setBusy(true);
		setError(null);
		try {
			const res = await port.startLogin({ phone: phone.trim() });
			if (res.next === "captcha") {
				setSiteKey(res.siteKey);
				setStep("captcha");
			} else if (res.next === "email") setStep("email");
			else setStep("code");
		} catch (err) {
			showErr(err);
		} finally {
			setBusy(false);
		}
	}
	async function signIn() {
		if (!port) return;
		setBusy(true);
		setError(null);
		try {
			const res = await port.submitCode(code.trim());
			if (res.next === "done") onDone();
			else if (res.next === "password") setStep("password");
			else if (res.next === "email") setStep("email");
			else if (res.next === "captcha") {
				setSiteKey(res.siteKey);
				setStep("captcha");
			}
		} catch (err) {
			showErr(err);
		} finally {
			setBusy(false);
		}
	}
	async function sendPassword() {
		if (!port) return;
		setBusy(true);
		setError(null);
		try {
			await port.submitPassword(password);
			onDone();
		} catch (err) {
			showErr(err);
		} finally {
			setBusy(false);
		}
	}
	async function sendEmail() {
		if (!port) return;
		setBusy(true);
		setError(null);
		try {
			await port.submitEmail(email.trim());
			setStep("email_code");
		} catch (err) {
			showErr(err);
		} finally {
			setBusy(false);
		}
	}
	async function sendEmailCode() {
		if (!port) return;
		setBusy(true);
		setError(null);
		try {
			await port.submitEmailCode(code.trim());
			onDone();
		} catch (err) {
			showErr(err);
		} finally {
			setBusy(false);
		}
	}
	async function sendCaptcha() {
		if (!port) return;
		setBusy(true);
		setError(null);
		try {
			const res = await port.submitCaptcha(captcha.trim());
			setStep(res.next === "done" ? "phone" : "code");
			if (res.next === "done") onDone();
		} catch (err) {
			showErr(err);
		} finally {
			setBusy(false);
		}
	}
	async function saveCreds() {
		if (!onSaveCredentials) return;
		setBusy(true);
		setError(null);
		try {
			const id = Number(apiId.trim());
			const hash = apiHash.trim();
			if (!id || !hash) throw new AppError("not_configured", "Enter both API ID and API hash.");
			await onSaveCredentials(id, hash);
		} catch (err) {
			showErr(err);
		} finally {
			setBusy(false);
		}
	}
	function cancelExtra() {
		setStep("phone");
		setError(null);
		setCode("");
		setPassword("");
		setEmail("");
		setCaptcha("");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-5 flex size-14 items-center justify-center rounded-2xl bg-surface-2 shadow-[var(--shadow-border)]",
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
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-3xl font-semibold tracking-tight text-balance",
						children: "TG Videos"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted text-pretty",
						children: "Sign in with your Telegram account to browse channel and group videos."
					})
				]
			}),
			!configured ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault();
					saveCreds();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "app is not configured"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-pretty",
						children: [
							"Create an app at",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								className: "text-primary underline",
								href: "https://my.telegram.org/apps",
								target: "_blank",
								rel: "noreferrer",
								children: "my.telegram.org/apps"
							}),
							" ",
							"and paste the API ID and API hash. They stay on this device and are used to talk to Telegram directly from your browser."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "api-id",
						children: "API ID"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "api-id",
						inputMode: "numeric",
						autoComplete: "off",
						value: apiId,
						onChange: (e) => setApiId(e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "api-hash",
						children: "API hash"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "api-hash",
						autoComplete: "off",
						value: apiHash,
						onChange: (e) => setApiHash(e.target.value)
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy || !onSaveCredentials,
						children: "Save credentials"
					})
				]
			}) : null,
			configured && step === "phone" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault();
					sendCode();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "phone",
						children: "Phone number"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "phone",
						name: "phone",
						type: "tel",
						autoComplete: "tel",
						placeholder: "+15555550100",
						value: phone,
						onChange: (e) => setPhone(e.target.value)
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy || !phone.trim() || waitSeconds != null || !port,
						children: "Send code"
					}),
					onResetCredentials ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						disabled: busy,
						onClick: () => void onResetCredentials(),
						children: "Change API credentials"
					}) : null
				]
			}) : null,
			configured && step === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault();
					signIn();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "login-code",
						children: "Login code"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "login-code",
						inputMode: "numeric",
						autoComplete: "one-time-code",
						value: code,
						onChange: (e) => setCode(e.target.value)
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						"data-testid": "sign-in",
						disabled: busy || !code.trim(),
						children: "Sign in"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						disabled: busy,
						onClick: () => void sendCode(),
						children: "Resend"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: cancelExtra,
						children: "Cancel"
					})
				]
			}) : null,
			configured && step === "password" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault();
					sendPassword();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "password",
						children: "Two-step password"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "password",
						type: "password",
						autoComplete: "current-password",
						value: password,
						onChange: (e) => setPassword(e.target.value)
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy || !password,
						children: "Continue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: cancelExtra,
						children: "Cancel"
					})
				]
			}) : null,
			configured && step === "email" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault();
					sendEmail();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "email",
						children: "Email"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "email",
						type: "email",
						value: email,
						onChange: (e) => setEmail(e.target.value)
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy || !email.trim(),
						children: "Continue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: cancelExtra,
						children: "Cancel"
					})
				]
			}) : null,
			configured && step === "email_code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault();
					sendEmailCode();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "email-code",
						children: "Email code"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "email-code",
						inputMode: "numeric",
						value: code,
						onChange: (e) => setCode(e.target.value)
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy || !code.trim(),
						children: "Continue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: cancelExtra,
						children: "Cancel"
					})
				]
			}) : null,
			configured && step === "captcha" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: (e) => {
					e.preventDefault();
					sendCaptcha();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"Captcha required",
							siteKey ? ` (${siteKey})` : "",
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-sm font-medium",
						htmlFor: "captcha",
						children: "Captcha token"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "captcha",
						value: captcha,
						onChange: (e) => setCaptcha(e.target.value)
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy || !captcha.trim(),
						children: "Continue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: cancelExtra,
						children: "Cancel"
					})
				]
			}) : null
		]
	});
}
//#endregion
export { LoginScreen as t };
