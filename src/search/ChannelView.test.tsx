import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { formatDayHeading } from "@/lib/format";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import type { ChatMessage, SearchHit } from "@/telegram/types";
import { ChannelView } from "./ChannelView";
import { stashSearchHit } from "./searchHits";

const hit: SearchHit = {
  peerId: "1001",
  accessHash: "ah",
  username: "cats",
  title: "Cats",
  kind: "channel",
  membership: "unknown",
};

const groupHit: SearchHit = {
  ...hit,
  peerId: "2002",
  title: "Cat Chat",
  username: "catchat",
  kind: "group",
};

function message(partial: Partial<ChatMessage> & Pick<ChatMessage, "msgId" | "text">): ChatMessage {
  return {
    peerId: hit.peerId,
    date: Math.floor(Date.now() / 1000),
    senderName: "Cats",
    outgoing: false,
    photos: [],
    files: [],
    videos: [],
    ...partial,
  };
}

function renderChannel(
  port: ReturnType<typeof createMockPort>,
  peerId = hit.peerId,
  addItem = vi.fn(),
  addOtherItem = vi.fn(),
) {
  const rootRoute = createRootRoute({
    component: () => (
      <TelegramProvider port={port} configured>
        <Outlet />
      </TelegramProvider>
    ),
  });
  const channel = createRoute({
    getParentRoute: () => rootRoute,
    path: "/search/$peerId",
    component: () => (
      <ChannelView peerId={peerId} addItem={addItem} addOtherItem={addOtherItem} />
    ),
  });
  const search = createRoute({
    getParentRoute: () => rootRoute,
    path: "/search",
    component: () => <div>search</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([search, channel]),
    history: createMemoryHistory({ initialEntries: [`/search/${peerId}`] }),
  });
  return { ...render(<RouterProvider router={router} />), router, addItem, addOtherItem };
}

describe("ChannelView conversation", () => {
  it("shows messages top to bottom with a day heading and file attachment", async () => {
    const older = Math.floor(Date.now() / 1000) - 60;
    const newer = Math.floor(Date.now() / 1000);
    stashSearchHit(hit);
    const port = createMockPort({
      listMessages: async () => ({
        messages: [
          message({ msgId: 1, date: older, text: "first up" }),
          message({
            msgId: 2,
            date: newer,
            text: "later on",
            files: [
              {
                msgId: 2,
                peerId: hit.peerId,
                date: newer,
                name: "notes.txt",
                ext: "txt",
                mime: "text/plain",
                sizeBytes: 12,
                kind: "document",
                media: {},
              },
            ],
          }),
        ],
        nextOffset: null,
      }),
    });
    renderChannel(port);
    expect(await screen.findByRole("log", { name: "Conversation" })).toBeTruthy();
    expect(await screen.findByText(formatDayHeading(newer))).toBeTruthy();
    expect(screen.getByText("first up")).toBeTruthy();
    expect(screen.getByText("later on")).toBeTruthy();
    expect(screen.getByRole("button", { name: "View notes.txt" })).toBeTruthy();
    const log = screen.getByRole("log", { name: "Conversation" });
    const first = log.textContent?.indexOf("first up") ?? -1;
    const last = log.textContent?.indexOf("later on") ?? -1;
    expect(first).toBeGreaterThan(-1);
    expect(last).toBeGreaterThan(first);
  });

  it("names senders in a group thread", async () => {
    stashSearchHit(groupHit);
    const port = createMockPort({
      listMessages: async () => ({
        messages: [
          message({
            msgId: 1,
            peerId: groupHit.peerId,
            senderName: "Ada",
            text: "hello group",
          }),
          message({
            msgId: 2,
            peerId: groupHit.peerId,
            senderName: "Bob",
            text: "hey ada",
          }),
        ],
        nextOffset: null,
      }),
    });
    renderChannel(port, groupHit.peerId);
    expect(await screen.findByText("hello group")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("hey ada")).toBeTruthy();
  });

  it("loads older messages when the top of the thread is reached", async () => {
    const io = { cb: null as IntersectionObserverCallback | null };
    const Original = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        io.cb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds: number[] = [];
    } as unknown as typeof IntersectionObserver;

    stashSearchHit(hit);
    const listMessages = vi.fn(async (_peer: unknown, offset?: string) => {
      if (offset === "1") {
        return {
          messages: [message({ msgId: 1, text: "much earlier", date: 100 })],
          nextOffset: null,
        };
      }
      return {
        messages: [message({ msgId: 5, text: "latest", date: 500 })],
        nextOffset: "1",
      };
    });
    try {
      const port = createMockPort({ listMessages });
      renderChannel(port);
      expect(await screen.findByText("latest")).toBeTruthy();
      await waitFor(() => expect(io.cb).toBeTruthy());
      io.cb!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      expect(await screen.findByText("much earlier")).toBeTruthy();
      expect(listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ peerId: "1001" }),
        "1",
      );
    } finally {
      globalThis.IntersectionObserver = Original;
    }
  });

  it("asks the user to join when history is private", async () => {
    stashSearchHit(hit);
    const port = createMockPort({
      listMessages: async () => {
        throw new Error("CHANNEL_PRIVATE");
      },
    });
    renderChannel(port);
    expect(
      await screen.findByText("Join this channel or group to read the conversation."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Join" })).toBeTruthy();
  });

  it("Add to Watchlist from the conversation does not join", async () => {
    const user = userEvent.setup();
    const joinByUsername = vi.fn();
    const addItem = vi.fn();
    stashSearchHit(hit);
    const port = createMockPort({ joinByUsername });
    renderChannel(port, hit.peerId, addItem);
    await user.click(await screen.findByRole("button", { name: "Add to Watchlist" }));
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(joinByUsername).not.toHaveBeenCalled();
  });
});
