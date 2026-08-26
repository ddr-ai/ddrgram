import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  deleteWatchlistRow,
  listWatchlistRows,
  setMutedRow,
  upsertWatchlistRow,
} from "./syncLogic";
import { cloudWatchlistItemSchema } from "./types";

const userIdSchema = z.object({ userId: z.string() });
const upsertSchema = z.object({
  userId: z.string(),
  item: cloudWatchlistItemSchema,
});
const removeSchema = z.object({
  userId: z.string(),
  peerId: z.string(),
});
const mutedSchema = z.object({
  userId: z.string(),
  peerId: z.string(),
  muted: z.boolean(),
});

export const listCloudWatchlist = createServerFn({ method: "GET" })
  .validator((input: unknown) => userIdSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    return listWatchlistRows(sql, data.userId);
  });

export const upsertCloudWatchlistItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await upsertWatchlistRow(sql, data.userId, data.item);
  });

export const removeCloudWatchlistItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => removeSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await deleteWatchlistRow(sql, data.userId, data.peerId);
  });

export const setCloudWatchlistMuted = createServerFn({ method: "POST" })
  .validator((input: unknown) => mutedSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await setMutedRow(sql, data.userId, data.peerId, data.muted);
  });
