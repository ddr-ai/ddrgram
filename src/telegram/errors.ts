export type AppErrorCode =
  | "not_configured"
  | "offline"
  | "invalid_code"
  | "code_expired"
  | "password_needed"
  | "flood_wait"
  | "session_revoked"
  | "invalid_invite"
  | "private_chat"
  | "join_pending"
  | "frozen"
  | "download_failed"
  | "unknown";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public waitSeconds?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const RPC_CODE = /^[A-Z][A-Z0-9_]{2,}$/;

export function userMessage(err: AppError): string {
  switch (err.code) {
    case "not_configured":
      return "Telegram API credentials are missing.";
    case "offline":
      return "You are offline. Retry when you reconnect.";
    case "invalid_code":
      return "Invalid code.";
    case "code_expired":
      return "Code expired.";
    case "password_needed":
      return "Two-step password required.";
    case "flood_wait": {
      const seconds = err.waitSeconds ?? 0;
      return seconds > 0
        ? `Wait ${seconds}s before trying again.`
        : "Too many attempts. Try again shortly.";
    }
    case "session_revoked":
      return "Telegram signed this session out. Sign in again.";
    case "invalid_invite":
      return "That invite link is invalid or expired.";
    case "private_chat":
      return "This chat is private or you are not a participant.";
    case "join_pending":
      return "Join request sent — pending approval.";
    case "frozen":
      return "This Telegram account is restricted right now.";
    case "download_failed":
      return "Download failed. Try again.";
    default: {
      const raw = err.message.trim();
      if (!raw || raw === "unknown" || RPC_CODE.test(raw)) {
        return "Something went wrong. Try again.";
      }
      return raw;
    }
  }
}

export function errorMessage(err: unknown): string {
  return userMessage(parseTelegramError(err));
}

export function parseTelegramError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const rec = err as {
    seconds?: number;
    errorMessage?: string;
    message?: string;
    constructor?: { name?: string };
  };
  const name = rec?.constructor?.name ?? "";
  const msg = String(rec?.errorMessage || rec?.message || err);

  if (
    typeof rec?.seconds === "number" &&
    /FLOOD_WAIT|FloodWait|SlowModeWait/i.test(name + msg)
  ) {
    return new AppError("flood_wait", msg, rec.seconds);
  }
  if (/SESSION_REVOKED|AUTH_KEY_UNREGISTERED/i.test(msg + name)) {
    return new AppError("session_revoked", msg);
  }
  if (/FLOOD_WAIT|SlowModeWait/i.test(msg + name)) {
    const n = Number((/(\d+)/.exec(msg) ?? [])[1] ?? rec?.seconds ?? 0);
    return new AppError("flood_wait", msg, n);
  }
  if (/INVITE_HASH|INVITE_INVALID/i.test(msg)) {
    return new AppError("invalid_invite", msg);
  }
  if (/PASSWORD_HASH_INVALID|SESSION_PASSWORD_NEEDED/i.test(msg + name)) {
    return new AppError("password_needed", msg);
  }
  if (/PHONE_CODE_EXPIRED/i.test(msg)) return new AppError("code_expired", msg);
  if (/PHONE_CODE_INVALID/i.test(msg)) return new AppError("invalid_code", msg);
  if (/CHANNEL_PRIVATE|CHAT_PRIVATE|not a participant/i.test(msg)) {
    return new AppError("private_chat", msg);
  }
  if (/INVITE_REQUEST_SENT/i.test(msg)) return new AppError("join_pending", msg);
  if (/FROZEN|FROZEN_METHOD/i.test(msg + name)) return new AppError("frozen", msg);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return new AppError("offline", msg);
  }
  return new AppError("unknown", msg);
}
