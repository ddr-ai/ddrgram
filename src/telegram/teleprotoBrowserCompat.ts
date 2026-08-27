export const TELEPROTO_SLEEP =
  "const sleep = (ms, isUnref = false) => new Promise((resolve) => isUnref ? setTimeout(resolve, ms).unref() : setTimeout(resolve, ms));";

export const TELEPROTO_SLEEP_BROWSER =
  'const sleep = (ms, isUnref = false) => new Promise((resolve) => { const timer = setTimeout(resolve, ms); if (isUnref && timer && typeof timer.unref === "function") timer.unref(); });';

const TELEPROTO_SERIALIZE_BYTES =
  "if (!(data instanceof Buffer)) {\n        if (typeof data === \"string\") {\n            data = Buffer.from(data);\n        }\n        else {\n            throw new Error(`Bytes or str expected, not ${typeof data}`);\n        }\n    }";

const TELEPROTO_SERIALIZE_BYTES_BROWSER = `if (!(typeof Buffer !== "undefined" && (typeof Buffer.isBuffer === "function" ? Buffer.isBuffer(data) : data instanceof Buffer))) {
        if (typeof data === "string") {
            data = Buffer.from(data);
        } else if (data instanceof Uint8Array || (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(data))) {
            data = Buffer.from(data);
        } else {
            throw new Error(\`Bytes or str expected, not \${typeof data}\`);
        }
    }`;

/** Rewrite teleproto Node-only bits so the client bundle can run in a browser. */
export function patchTeleprotoBrowserSource(code: string, id: string): string | null {
  const norm = id.replace(/\\/g, "/");
  let next = code;
  if (norm.includes("teleproto/tl/runtime/helpers") && next.includes("Bytes or str expected")) {
    next = next.replace(TELEPROTO_SERIALIZE_BYTES, TELEPROTO_SERIALIZE_BYTES_BROWSER);
  }
  if (next.includes(TELEPROTO_SLEEP)) {
    next = next.replace(TELEPROTO_SLEEP, TELEPROTO_SLEEP_BROWSER);
  }
  return next === code ? null : next;
}
