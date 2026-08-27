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

export type FileKind =
  | "image"
  | "document"
  | "code"
  | "ebook"
  | "archive"
  | "package"
  | "folder";

export type FileItem = {
  msgId: number;
  peerId: string;
  date: number;
  name: string;
  ext: string;
  mime: string;
  sizeBytes: number;
  kind: FileKind;
  media: unknown;
  groupedId?: string;
  children?: FileItem[];
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

export type ChatMessage = {
  msgId: number;
  peerId: string;
  date: number;
  text: string;
  senderName: string;
  outgoing: boolean;
  groupedId?: string;
  photos: FileItem[];
  files: FileItem[];
  videos: VideoItem[];
};

export type Me = {
  id: string;
  firstName: string;
};
