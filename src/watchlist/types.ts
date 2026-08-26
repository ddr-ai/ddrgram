import { z } from "zod";

export const cloudWatchlistItemSchema = z.object({
  peerId: z.string(),
  accessHash: z.string(),
  username: z.string().optional(),
  title: z.string(),
  kind: z.enum(["channel", "group"]),
  muted: z.boolean(),
  addedAt: z.number(),
});

export type CloudWatchlistItem = z.infer<typeof cloudWatchlistItemSchema>;
