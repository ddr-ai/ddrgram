import { describe, expect, it } from "vitest";
import type { ChatMessage, FileItem } from "./types";
import {
  groupChatMessages,
  mergeMessagePages,
  showSenderName,
  threadSections,
} from "./messages";

function msg(partial: Partial<ChatMessage> & Pick<ChatMessage, "msgId">): ChatMessage {
  return {
    peerId: "1",
    date: 1_700_000_000,
    text: "",
    senderName: "Ada",
    outgoing: false,
    photos: [],
    files: [],
    videos: [],
    ...partial,
  };
}

function photo(msgId: number): FileItem {
  return {
    msgId,
    peerId: "1",
    date: 1_700_000_000,
    name: `photo-${msgId}.jpg`,
    ext: "jpg",
    mime: "image/jpeg",
    sizeBytes: 12,
    kind: "image",
    media: {},
    groupedId: "album",
  };
}

describe("groupChatMessages", () => {
  it("merges album parts into one message with caption and all media", () => {
    const grouped = groupChatMessages([
      msg({
        msgId: 11,
        groupedId: "album",
        text: "Weekend shots",
        photos: [photo(11)],
      }),
      msg({ msgId: 12, groupedId: "album", photos: [photo(12)] }),
      msg({ msgId: 13, text: "after the album" }),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toMatchObject({
      msgId: 11,
      text: "Weekend shots",
    });
    expect(grouped[0]!.photos.map((p) => p.msgId)).toEqual([11, 12]);
    expect(grouped[1]!.msgId).toBe(13);
  });

  it("leaves ungrouped messages alone", () => {
    const a = msg({ msgId: 1, text: "hi" });
    const b = msg({ msgId: 2, text: "there" });
    expect(groupChatMessages([a, b])).toEqual([a, b]);
  });
});

describe("mergeMessagePages", () => {
  it("prepends older unique messages in chronological order", () => {
    const newer = [msg({ msgId: 5, date: 50, text: "new" })];
    const older = [
      msg({ msgId: 1, date: 10, text: "old" }),
      msg({ msgId: 5, date: 50, text: "dup" }),
    ];
    const merged = mergeMessagePages(newer, older);
    expect(merged.map((m) => m.msgId)).toEqual([1, 5]);
    expect(merged[1]!.text).toBe("new");
  });
});

describe("threadSections", () => {
  it("splits messages by local day", () => {
    const dayA = Math.floor(Date.UTC(2024, 0, 1, 12) / 1000);
    const dayB = Math.floor(Date.UTC(2024, 0, 2, 12) / 1000);
    const sections = threadSections([
      msg({ msgId: 1, date: dayA, text: "a" }),
      msg({ msgId: 2, date: dayA, text: "b" }),
      msg({ msgId: 3, date: dayB, text: "c" }),
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.messages.map((m) => m.msgId)).toEqual([1, 2]);
    expect(sections[1]!.messages.map((m) => m.msgId)).toEqual([3]);
  });
});

describe("showSenderName", () => {
  it("shows the sender on the first message of a group run", () => {
    const first = msg({ msgId: 1, senderName: "Ada" });
    const same = msg({ msgId: 2, senderName: "Ada" });
    const next = msg({ msgId: 3, senderName: "Bob" });
    expect(showSenderName(undefined, first, "group")).toBe(true);
    expect(showSenderName(first, same, "group")).toBe(false);
    expect(showSenderName(same, next, "group")).toBe(true);
    expect(showSenderName(undefined, first, "channel")).toBe(false);
  });
});
