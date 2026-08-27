import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  TELEPROTO_SLEEP,
  TELEPROTO_SLEEP_BROWSER,
  patchTeleprotoBrowserSource,
} from "./teleprotoBrowserCompat";

const helpersPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../node_modules/teleproto/Helpers.js",
);

describe("teleproto browser sleep patch", () => {
  it("still matches the teleproto Helpers sleep helper", () => {
    const helpers = readFileSync(helpersPath, "utf8");
    expect(helpers).toContain(TELEPROTO_SLEEP);
  });

  it("rewrites unref so a numeric setTimeout id does not throw", () => {
    const helpers = readFileSync(helpersPath, "utf8");
    const patched = patchTeleprotoBrowserSource(helpers, helpersPath);
    expect(patched).toContain(TELEPROTO_SLEEP_BROWSER);
    expect(patched).not.toContain("setTimeout(resolve, ms).unref()");
  });
});
