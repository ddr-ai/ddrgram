import { describe, expect, it } from "vitest";
import { AppError, parseTelegramError, userMessage } from "./errors";

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

describe("userMessage", () => {
  it("turns flood wait into a countdown copy", () => {
    expect(userMessage(new AppError("flood_wait", "FLOOD_WAIT_32", 32))).toBe(
      "Wait 32s before trying again.",
    );
  });

  it("hides raw RPC codes from the user", () => {
    expect(userMessage(new AppError("unknown", "RPC_CALL_FAIL"))).toBe(
      "Something went wrong. Try again.",
    );
  });

  it("keeps a readable fallback for private chats", () => {
    expect(userMessage(parseTelegramError(new Error("CHANNEL_PRIVATE")))).toBe(
      "This chat is private or you are not a participant.",
    );
  });
});
