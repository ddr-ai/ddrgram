import { openDb } from "./db";

const SESSION_KEY = "session";
const API_KEY = "api";

export async function saveSessionString(s: string): Promise<void> {
  const db = await openDb();
  await db.put("kv", { key: SESSION_KEY, value: s });
}

export async function loadSessionString(): Promise<string | null> {
  const db = await openDb();
  const row = (await db.get("kv", SESSION_KEY)) as
    | { key: string; value: string }
    | undefined;
  return row?.value ?? null;
}

export async function clearSessionString(): Promise<void> {
  const db = await openDb();
  await db.delete("kv", SESSION_KEY);
}

export async function saveApiCredentials(c: {
  apiId: number;
  apiHash: string;
}): Promise<void> {
  const db = await openDb();
  await db.put("kv", { key: API_KEY, value: c });
}

export async function loadApiCredentials(): Promise<{
  apiId: number;
  apiHash: string;
} | null> {
  const db = await openDb();
  const row = (await db.get("kv", API_KEY)) as
    | { key: string; value: { apiId: number; apiHash: string } }
    | undefined;
  const value = row?.value;
  if (!value?.apiId || !value?.apiHash) return null;
  return value;
}

export async function clearApiCredentials(): Promise<void> {
  const db = await openDb();
  await db.delete("kv", API_KEY);
}
