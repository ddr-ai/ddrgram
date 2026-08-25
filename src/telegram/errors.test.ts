import { describe, expect, it } from "vitest";
import { AppError, parseTelegramError } from "./errors";

describe("parseTelegramError", () => {
  it("extracts flood wait seconds", () => {
    const e = parseTelegramError(new Error("FLOOD_WAIT_32"));
    expect(e.code).toBe("flood_wait");
    expect(e.waitSeconds).toBe(32);
  });

  it("maps SESSION_REVOKED", () => {
    expect(parseTelegramError(new Error("SESSION_REVOKED")).code).toBe(
      "session_revoked",
    );
  });

  it("maps AUTH_KEY_UNREGISTERED to session_revoked", () => {
    expect(
      parseTelegramError(new Error("AUTH_KEY_UNREGISTERED")),
    ).toMatchObject({ code: "session_revoked" });
  });

  it("maps PHONE_CODE_INVALID", () => {
    expect(parseTelegramError(new Error("PHONE_CODE_INVALID")).code).toBe(
      "invalid_code",
    );
  });

  it("maps CHANNEL_PRIVATE", () => {
    expect(parseTelegramError(new Error("CHANNEL_PRIVATE")).code).toBe(
      "private_chat",
    );
  });

  it("passes AppError through", () => {
    const original = new AppError("download_failed", "nope");
    expect(parseTelegramError(original)).toBe(original);
  });

  it("reads seconds from FloodWaitError-shaped objects", () => {
    class FloodWaitError extends Error {
      seconds = 17;
      errorMessage = "FLOOD_WAIT";
    }
    const e = parseTelegramError(new FloodWaitError("Please wait 17 seconds"));
    expect(e.code).toBe("flood_wait");
    expect(e.waitSeconds).toBe(17);
  });
});
