import type { Sql } from "@/lib/db";
import type { WatchlistItem } from "@/telegram/types";
import type { CloudWatchlistItem } from "./types";

export function toCloudItem(item: WatchlistItem): CloudWatchlistItem {
  const cloud: CloudWatchlistItem = {
    peerId: item.peerId,
    accessHash: item.accessHash,
    title: item.title,
    kind: item.kind,
    muted: item.muted,
    addedAt: item.addedAt,
  };
  if (item.username) cloud.username = item.username;
  return cloud;
}

export function mergeWatchlists(
  local: WatchlistItem[],
  cloud: CloudWatchlistItem[],
): { localWrites: WatchlistItem[]; cloudUpserts: CloudWatchlistItem[] } {
  const localByPeer = new Map(local.map((row) => [row.peerId, row]));
  const cloudByPeer = new Map(cloud.map((row) => [row.peerId, row]));
  const localWrites: WatchlistItem[] = [];
  const cloudUpserts: CloudWatchlistItem[] = [];

  for (const item of local) {
    const remote = cloudByPeer.get(item.peerId);
    if (!remote) {
      cloudUpserts.push(toCloudItem(item));
    }
  }

  for (const remote of cloud) {
    const here = localByPeer.get(remote.peerId);
    if (!here) {
      localWrites.push({ ...remote });
      continue;
    }
    if (remote.addedAt > here.addedAt) {
      localWrites.push({ ...here, ...remote, photoBlob: here.photoBlob });
    } else if (here.addedAt > remote.addedAt) {
      cloudUpserts.push(toCloudItem(here));
    } else if (here.muted !== remote.muted) {
      localWrites.push({ ...here, muted: remote.muted });
    }
  }

  return { localWrites, cloudUpserts };
}

type WatchlistRow = {
  peer_id: string;
  access_hash: string;
  username: string | null;
  title: string;
  kind: "channel" | "group";
  muted: boolean;
  added_at: string | Date;
};

function mapRow(r: WatchlistRow): CloudWatchlistItem {
  const item: CloudWatchlistItem = {
    peerId: r.peer_id,
    accessHash: r.access_hash,
    title: r.title,
    kind: r.kind,
    muted: r.muted,
    addedAt: new Date(r.added_at).getTime(),
  };
  if (r.username) item.username = r.username;
  return item;
}

export async function listWatchlistRows(
  sql: Sql,
  userId: string,
): Promise<CloudWatchlistItem[]> {
  if (!userId) return [];
  const rows = await sql<WatchlistRow>`select peer_id, access_hash, username, title, kind, muted, added_at
     from watchlist_items where user_id = ${userId} order by added_at desc`;
  return rows.map(mapRow);
}

export async function upsertWatchlistRow(
  sql: Sql,
  userId: string,
  item: CloudWatchlistItem,
): Promise<void> {
  if (!userId) return;
  await sql`
insert into watchlist_items (user_id, peer_id, access_hash, username, title, kind, muted, added_at)
values (${userId}, ${item.peerId}, ${item.accessHash}, ${item.username ?? null}, ${item.title}, ${item.kind}, ${item.muted}, ${new Date(item.addedAt).toISOString()})
on conflict (user_id, peer_id) do update set
  access_hash = excluded.access_hash,
  username = excluded.username,
  title = excluded.title,
  kind = excluded.kind,
  muted = excluded.muted,
  added_at = excluded.added_at`;
}

export async function deleteWatchlistRow(
  sql: Sql,
  userId: string,
  peerId: string,
): Promise<void> {
  if (!userId) return;
  await sql`delete from watchlist_items where user_id = ${userId} and peer_id = ${peerId}`;
}

export async function setMutedRow(
  sql: Sql,
  userId: string,
  peerId: string,
  muted: boolean,
): Promise<void> {
  if (!userId) return;
  await sql`update watchlist_items set muted = ${muted} where user_id = ${userId} and peer_id = ${peerId}`;
}
