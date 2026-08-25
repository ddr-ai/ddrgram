//#region node_modules/.nitro/vite/services/ssr/assets/format-DGlZpr5_.js
function formatDuration(sec) {
	if (sec == null || !Number.isFinite(sec) || sec < 0) return "";
	const s = Math.round(sec);
	const h = Math.floor(s / 3600);
	const m = Math.floor(s % 3600 / 60);
	const r = s % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
	return `${m}:${String(r).padStart(2, "0")}`;
}
function formatCount(n) {
	if (n == null || !Number.isFinite(n)) return "";
	if (n < 1e3) return String(n);
	if (n < 1e4) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
	if (n < 1e6) return `${Math.round(n / 1e3)}k`;
	return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}m`;
}
function initials(title) {
	const parts = title.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}
function hueFromId(id) {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = h * 31 + id.charCodeAt(i) >>> 0;
	return 198 + h % 28;
}
//#endregion
export { initials as i, formatDuration as n, hueFromId as r, formatCount as t };
