// @ts-nocheck
/** Browser util plus realm TextEncoder — Node SSR also has globalThis.TextEncoder. */
const util = require("../../node_modules/util/util.js");

if (typeof globalThis.TextEncoder === "function") {
  util.TextEncoder = globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "function") {
  util.TextDecoder = globalThis.TextDecoder;
}

module.exports = util;
