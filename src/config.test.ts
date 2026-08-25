import { afterEach, describe, expect, it, vi } from "vitest";

describe("getApiConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns not_configured when api id or hash is missing", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_TELEGRAM_API_ID", "");
    vi.stubEnv("VITE_TELEGRAM_API_HASH", "");
    const { getApiConfig } = await import("./config");
    expect(getApiConfig()).toEqual({ error: "not_configured" });
  });

  it("returns apiId and apiHash when both are set", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_TELEGRAM_API_ID", "12345");
    vi.stubEnv("VITE_TELEGRAM_API_HASH", "abcdef");
    const { getApiConfig } = await import("./config");
    expect(getApiConfig()).toEqual({ apiId: 12345, apiHash: "abcdef" });
  });
});
