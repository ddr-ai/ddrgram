import { dayKey, formatDayHeading } from "../lib/format";
import type { ChatKind, ChatMessage } from "./types";

export function mergeAlbum(parts: ChatMessage[]): ChatMessage {
  const sorted = [...parts].sort((a, b) => a.msgId - b.msgId);
  const first = sorted[0]!;
  const text = sorted
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n");
  return {
    ...first,
    text,
    photos: sorted.flatMap((part) => part.photos),
    files: sorted.flatMap((part) => part.files),
    videos: sorted.flatMap((part) => part.videos),
  };
}

export function groupChatMessages(messages: ChatMessage[]): ChatMessage[] {
  const byGroup = new Map<string, ChatMessage[]>();
  for (const msg of messages) {
    if (!msg.groupedId) continue;
    const list = byGroup.get(msg.groupedId) ?? [];
    list.push(msg);
    byGroup.set(msg.groupedId, list);
  }
  const used = new Set<string>();
  const out: ChatMessage[] = [];
  for (const msg of messages) {
    if (!msg.groupedId) {
      out.push(msg);
      continue;
    }
    if (used.has(msg.groupedId)) continue;
    used.add(msg.groupedId);
    const parts = byGroup.get(msg.groupedId) ?? [msg];
    out.push(parts.length === 1 ? parts[0]! : mergeAlbum(parts));
  }
  return out;
}

export function mergeMessagePages(
  existing: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const seen = new Set(existing.map((msg) => msg.msgId));
  const extra = incoming.filter((msg) => !seen.has(msg.msgId));
  return [...extra, ...existing].sort(
    (a, b) => a.date - b.date || a.msgId - b.msgId,
  );
}

export type ThreadSection = {
  key: string;
  heading: string;
  messages: ChatMessage[];
};

export function threadSections(messages: ChatMessage[]): ThreadSection[] {
  const sections: ThreadSection[] = [];
  for (const msg of messages) {
    const key = dayKey(msg.date);
    const last = sections[sections.length - 1];
    if (!last || last.key !== key) {
      sections.push({
        key,
        heading: formatDayHeading(msg.date),
        messages: [msg],
      });
    } else {
      last.messages.push(msg);
    }
  }
  return sections;
}

export function showSenderName(
  prev: ChatMessage | undefined,
  msg: ChatMessage,
  kind: ChatKind,
): boolean {
  if (kind !== "group") return false;
  if (!msg.senderName) return false;
  if (!prev) return true;
  return prev.senderName !== msg.senderName || prev.outgoing !== msg.outgoing;
}
