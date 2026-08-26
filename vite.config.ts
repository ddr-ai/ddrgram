import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

const FS_SHIM = join(process.cwd(), "src/shims/node-fs.cjs");
const STREAM_SHIM = join(process.cwd(), "node_modules/stream-browserify/index.js");
const UTIL_SHIM = join(process.cwd(), "src/shims/node-util.cjs");

const CLIENT_NODE_ALIASES: Record<string, string> = {
  fs: FS_SHIM,
  "node:fs": FS_SHIM,
  "fs/promises": FS_SHIM,
  "node:fs/promises": FS_SHIM,
  stream: STREAM_SHIM,
  "node:stream": STREAM_SHIM,
  util: UTIL_SHIM,
  "node:util": UTIL_SHIM,
  sys: UTIL_SHIM,
  "node:sys": UTIL_SHIM,
};

const NODE_BUILTIN_ROOTS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "module",
  "net",
  "os",
  "path",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "vm",
  "zlib",
]);

function isServerEnvironment(name: string | undefined): boolean {
  return name === "ssr" || name === "nitro";
}

/**
 * vite-plugin-node-polyfills sets resolve.alias globally, so Nitro/SSR would
 * otherwise bundle browser shims. React SSR then crashes with
 * `util.TextEncoder is not a constructor`. Keep real Node builtins off-client.
 *
 * Only match ssr/nitro — a missing environment name is optimizeDeps (client).
 */
function ssrNodeBuiltinsExternal(): Plugin {
  return {
    name: "ssr-node-builtins-external",
    enforce: "pre",
    applyToEnvironment(environment) {
      return isServerEnvironment(environment.name);
    },
    resolveId(id) {
      const envName = (this as { environment?: { name?: string } }).environment?.name;
      if (!isServerEnvironment(envName)) return;
      const raw = id.startsWith("node:") ? id.slice(5) : id;
      const root = raw.split("/")[0] ?? raw;
      if (!NODE_BUILTIN_ROOTS.has(root)) return;
      return { id: id.startsWith("node:") ? id : `node:${raw}`, external: true };
    },
  };
}

/** teleproto's serializeBytes only accepts Node Buffer/string. Rolldown can
 *  hand it a Uint8Array from a second Buffer copy, which throws
 *  "Bytes or str expected, not object" during connect/login. */
function teleprotoSerializeBytesPlugin(): Plugin {
  return {
    name: "teleproto-serialize-bytes",
    enforce: "pre",
    transform(code, id) {
      const norm = id.replace(/\\/g, "/");
      if (!norm.includes("teleproto/tl/runtime/helpers")) return;
      if (!code.includes("Bytes or str expected")) return;
      const next = code.replace(
        "if (!(data instanceof Buffer)) {\n        if (typeof data === \"string\") {\n            data = Buffer.from(data);\n        }\n        else {\n            throw new Error(`Bytes or str expected, not ${typeof data}`);\n        }\n    }",
        `if (!(typeof Buffer !== "undefined" && (typeof Buffer.isBuffer === "function" ? Buffer.isBuffer(data) : data instanceof Buffer))) {
        if (typeof data === "string") {
            data = Buffer.from(data);
        } else if (data instanceof Uint8Array || (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(data))) {
            data = Buffer.from(data);
        } else {
            throw new Error(\`Bytes or str expected, not \${typeof data}\`);
        }
    }`,
      );
      if (next === code) return;
      return { code: next, map: null };
    },
  };
}

function clientNodePolyfills(): Plugin[] {
  return [
    ssrNodeBuiltinsExternal(),
    ...nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
      // Empty `module` mock breaks Nitro (`createRequire`). fs/stream/util
      // cannot be resolve.alias'd — Vite aliases are prefix matches, and
      // `require("util/")` would resolve to the shim path + "/". Exact
      // resolveId in client-node-shims / optimizeDeps handles those instead.
      exclude: ["module", "fs", "stream", "util", "sys"],
    }),
    {
      name: "client-node-shims",
      enforce: "pre",
      resolveId(id) {
        const envName = (this as { environment?: { name?: string } }).environment?.name;
        if (envName !== "client") return;
        return CLIENT_NODE_ALIASES[id];
      },
    },
  ];
}

function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages is served under /ddrgram/; Vercel is the site root.
  base: process.env.VERCEL ? "/" : "/ddrgram/",
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    include: ["teleproto", "teleproto/sessions", "teleproto/extensions", "big-integer"],
    rolldownOptions: {
      plugins: [
        {
          name: "optimize-node-shims",
          resolveId(id: string) {
            return CLIENT_NODE_ALIASES[id];
          },
        },
      ],
    },
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  plugins: [
    teleprotoSerializeBytesPlugin(),
    ...clientNodePolyfills(),
    pgliteBootstrapPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true },
    }),
    ...(command === "build" || isPreview
      ? [
          nitro({
            // Node/Vercel preset so Vite preview can prerender the SPA shell.
            // GitHub Pages only publishes the static client HTML/assets.
            preset: "vercel",
            serverDir: false,
          }),
        ]
      : []),
    viteReact(),
  ],
}));
