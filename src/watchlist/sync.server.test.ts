import { describe, expect, it } from "vitest";
import type { Sql } from "@/lib/db";
import {
  deleteWatchlistRow,
  listWatchlistRows,
  setMutedRow,
  upsertWatchlistRow,
} from "./syncLogic";
import { createMemoryCloudApi } from "./cloudApi";
import type { CloudWatchlistItem } from "./types";

type Row = {
  user_id: string;
  peer_id: string;
  access_hash: string;
  username: string | null;
  title: string;
  kind: "channel" | "group";
  muted: boolean;
  added_at: string;
};

function createFakeSql(): Sql {
  const rows: Row[] = [];
  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const t = text.replace(/\s+/g, " ").trim().toLowerCase();
    if (t.startsWith("select")) {
      const userId = String(params[0] ?? "");
      return rows
        .filter((r) => r.user_id === userId)
        .sort((a, b) => (a.added_at < b.added_at ? 1 : -1)) as T[];
    }
    if (t.startsWith("insert")) {
      const next: Row = {
        user_id: String(params[0]),
        peer_id: String(params[1]),
        access_hash: String(params[2]),
        username: (params[3] as string | null) ?? null,
        title: String(params[4]),
        kind: params[5] as Row["kind"],
        muted: Boolean(params[6]),
        added_at: String(params[7]),
      };
      const idx = rows.findIndex(
        (r) => r.user_id === next.user_id && r.peer_id === next.peer_id,
      );
      if (idx >= 0) rows[idx] = next;
      else rows.push(next);
      return [] as T[];
    }
    if (t.startsWith("delete")) {
      const userId = String(params[0]);
      const peerId = String(params[1]);
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (rows[i]!.user_id === userId && rows[i]!.peer_id === peerId) {
          rows.splice(i, 1);
        }
      }
      return [] as T[];
    }
    if (t.startsWith("update")) {
      const muted = Boolean(params[0]);
      const userId = String(params[1]);
      const peerId = String(params[2]);
      for (const r of rows) {
        if (r.user_id === userId && r.peer_id === peerId) r.muted = muted;
      }
      return [] as T[];
    }
    throw new Error(`unsupported sql: ${text}`);
  };
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

const item: CloudWatchlistItem = {
  peerId: "1",
  accessHash: "h",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 100,
};

describe("watchlist SQL helpers", () => {
  it("empty userId lists [] and mutations no-op", async () => {
    const sql = createFakeSql();
    expect(await listWatchlistRows(sql, "")).toEqual([]);
    await upsertWatchlistRow(sql, "", item);
    await deleteWatchlistRow(sql, "", "1");
    await setMutedRow(sql, "", "1", true);
    expect(await listWatchlistRows(sql, "u")).toEqual([]);
  });

  it("upsert then list returns the row; remove then list empty", async () => {
    const sql = createFakeSql();
    await upsertWatchlistRow(sql, "u", item);
    const listed = await listWatchlistRows(sql, "u");
    expect(listed).toEqual([item]);
    await deleteWatchlistRow(sql, "u", "1");
    expect(await listWatchlistRows(sql, "u")).toEqual([]);
  });

  it("setMuted updates the row", async () => {
    const sql = createFakeSql();
    await upsertWatchlistRow(sql, "u", item);
    await setMutedRow(sql, "u", "1", true);
    expect((await listWatchlistRows(sql, "u"))[0]?.muted).toBe(true);
  });
});

describe("createMemoryCloudApi", () => {
  it("empty userId lists []; upsert then list; remove then empty", async () => {
    const api = createMemoryCloudApi();
    expect(await api.list("")).toEqual([]);
    await api.upsert("u", item);
    expect(await api.list("u")).toEqual([item]);
    await api.remove("u", "1");
    expect(await api.list("u")).toEqual([]);
  });
});
