export function getApiConfig():
  | { apiId: number; apiHash: string }
  | { error: "not_configured" } {
  const apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID ?? "");
  const apiHash = String(import.meta.env.VITE_TELEGRAM_API_HASH ?? "");
  if (!apiId || !apiHash) return { error: "not_configured" };
  return { apiId, apiHash };
}
