export type ChatKind = "channel" | "group";

export type WatchlistItem = {
  peerId: string;
  accessHash: string;
  username?: string;
  title: string;
  kind: ChatKind;
  photoBlob?: Blob;
  muted: boolean;
  addedAt: number;
};

export type VideoItem = {
  msgId: number;
  peerId: string;
  date: number;
  durationSec?: number;
  width?: number;
  height?: number;
  sizeBytes: number;
  document: unknown;
};

export type SearchHit = {
  peerId: string;
  accessHash: string;
  username?: string;
  title: string;
  kind: ChatKind;
  memberCount?: number;
  photoBlob?: Blob;
  membership: "unknown" | "joined" | "pending";
};

export type JoinedChat = {
  peerId: string;
  accessHash: string;
  username?: string;
  title: string;
  kind: ChatKind;
  photoBlob?: Blob;
};

export type Me = {
  id: string;
  firstName: string;
};
