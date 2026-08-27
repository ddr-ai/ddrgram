import type { ChatMessage, FileItem, JoinedChat, Me, SearchHit, VideoItem, WatchlistItem } from "./types";

export type LoginStart = { phone: string };
export type VideoPage = { videos: VideoItem[]; nextOffset: string | null };
export type SearchPage = { hits: SearchHit[]; nextOffset: string | null };
export type FilePage = { files: FileItem[]; nextOffset: string | null };
export type MessagePage = { messages: ChatMessage[]; nextOffset: string | null };

export type AuthNext =
  | { next: "done" }
  | { next: "password" }
  | { next: "email" }
  | { next: "email_code" }
  | { next: "captcha"; siteKey?: string }
  | { next: "code" };

export interface TelegramPort {
  restoreSession(): Promise<Me | null>;
  startLogin(input: LoginStart): Promise<{ next: "code" | "email" | "captcha"; siteKey?: string }>;
  submitCode(code: string): Promise<{
    next: "done" | "password" | "email" | "captcha";
    siteKey?: string;
  }>;
  submitPassword(password: string): Promise<{ next: "done" }>;
  submitEmail(email: string): Promise<{ next: "email_code" }>;
  submitEmailCode(code: string): Promise<{ next: "done" }>;
  submitCaptcha(token: string): Promise<{ next: "code" | "done" }>;
  logout(): Promise<void>;
  getMe(): Promise<Me>;
  searchPublic(query: string, offset?: string): Promise<SearchPage>;
  countVideos(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<number | null>;
  previewInvite(hash: string): Promise<SearchHit>;
  joinInvite(hash: string): Promise<{ pending: boolean }>;
  joinByUsername(username: string): Promise<{ pending: boolean }>;
  joinChannel(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<{ pending: boolean }>;
  leave(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<void>;
  mute(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<void>;
  unmute(peer: Pick<WatchlistItem, "peerId" | "accessHash">): Promise<void>;
  listJoinedChannelsAndGroups(
    offset?: string,
  ): Promise<{ chats: JoinedChat[]; nextOffset: string | null }>;
  searchVideos(
    peer: Pick<WatchlistItem, "peerId" | "accessHash">,
    offset?: string,
  ): Promise<VideoPage>;
  searchFiles(
    peer: Pick<WatchlistItem, "peerId" | "accessHash">,
    offset?: string,
  ): Promise<FilePage>;
  listMessages(
    peer: Pick<WatchlistItem, "peerId" | "accessHash">,
    offset?: string,
  ): Promise<MessagePage>;
  getVideoThumb(document: unknown): Promise<Blob | null>;
  getFileThumb(media: unknown): Promise<Blob | null>;
  downloadVideo(document: unknown, onProgress?: (ratio: number) => void): Promise<Blob>;
  downloadFile(media: unknown, onProgress?: (ratio: number) => void): Promise<Blob>;
}
