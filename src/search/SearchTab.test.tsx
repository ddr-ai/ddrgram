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
import { AppFrame } from "@/shell/AppFrame";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import type { SearchHit } from "@/telegram/types";
import { ChannelView } from "./ChannelView";
import { SearchTab } from "./SearchTab";
import { stashSearchHit } from "./searchHits";

const hit: SearchHit = {
  peerId: "1001",
  accessHash: "ah",
  username: "cats",
  title: "Cats",
  kind: "channel",
  membership: "unknown",
};

function renderSearch(
  port: ReturnType<typeof createMockPort>,
  addItem = vi.fn(),
  addOtherItem = vi.fn(),
) {
  const rootRoute = createRootRoute({
    component: () => (
      <TelegramProvider port={port} configured>
        <AppFrame>
          <Outlet />
        </AppFrame>
      </TelegramProvider>
    ),
  });
  const search = createRoute({
    getParentRoute: () => rootRoute,
    path: "/search",
    component: SearchTab,
  });
  const channel = createRoute({
    getParentRoute: () => rootRoute,
    path: "/search/$peerId",
    component: function Channel() {
      const { peerId } = channel.useParams();
      return (
        <ChannelView peerId={peerId} addItem={addItem} addOtherItem={addOtherItem} />
      );
    },
  });
  const watchlist = createRoute({
    getParentRoute: () => rootRoute,
    path: "/watchlist",
    component: () => <div>watchlist</div>,
  });
  const other = createRoute({
    getParentRoute: () => rootRoute,
    path: "/other",
    component: () => <div>other</div>,
  });
  const login = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => <div>login</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([search, channel, watchlist, other, login]),
    history: createMemoryHistory({ initialEntries: ["/search"] }),
  });
  return { ...render(<RouterProvider router={router} />), router, addItem, addOtherItem };
}

describe("SearchTab", () => {
  it("Join does not add to the watchlist", async () => {
    const user = userEvent.setup();
    const joinByUsername = vi.fn(async () => ({ pending: false }));
    const addItem = vi.fn();
    const port = createMockPort({
      searchPublic: async () => ({ hits: [hit], nextOffset: null }),
      joinByUsername,
    });
    renderSearch(port, addItem);
    await user.type(
      await screen.findByPlaceholderText("Search, @username, or t.me link"),
      "cats",
    );
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Join" }));
    expect(joinByUsername).toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
  });

  it("opening a result shows channel content and add buttons", async () => {
    const user = userEvent.setup();
    const joinByUsername = vi.fn();
    const addItem = vi.fn();
    const port = createMockPort({
      searchPublic: async () => ({ hits: [hit], nextOffset: null }),
      joinByUsername,
      listMessages: async () => ({
        messages: [
          {
            msgId: 2,
            peerId: "1001",
            date: Math.floor(Date.now() / 1000),
            text: "Welcome to Cats",
            senderName: "Cats",
            outgoing: false,
            photos: [],
            files: [
              {
                msgId: 2,
                peerId: "1001",
                date: 1,
                name: "notes.txt",
                ext: "txt",
                mime: "text/plain",
                sizeBytes: 12,
                kind: "document",
                media: {},
              },
            ],
            videos: [
              {
                msgId: 1,
                peerId: "1001",
                date: 1,
                sizeBytes: 10,
                document: {},
                durationSec: 4,
              },
            ],
          },
        ],
        nextOffset: null,
      }),
    });
    const { router } = renderSearch(port, addItem);
    await user.type(
      await screen.findByPlaceholderText("Search, @username, or t.me link"),
      "cats",
    );
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Open Cats" }));
    expect(router.state.location.pathname).toBe("/search/1001");
    expect(await screen.findByRole("button", { name: "Add to Watchlist" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add to Other" })).toBeTruthy();
    expect(await screen.findByText("Welcome to Cats")).toBeTruthy();
    expect(screen.getByText("notes.txt")).toBeTruthy();
  });

  it("Add to Watchlist from the channel does not join", async () => {
    const user = userEvent.setup();
    const joinByUsername = vi.fn();
    const joinChannel = vi.fn();
    const addItem = vi.fn();
    stashSearchHit(hit);
    const port = createMockPort({
      joinByUsername,
      joinChannel,
    });
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
        <ChannelView peerId="1001" addItem={addItem} />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([channel]),
      history: createMemoryHistory({ initialEntries: ["/search/1001"] }),
    });
    render(<RouterProvider router={router} />);
    await user.click(await screen.findByRole("button", { name: "Add to Watchlist" }));
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(joinByUsername).not.toHaveBeenCalled();
    expect(joinChannel).not.toHaveBeenCalled();
  });

  it("empty query does not call searchPublic", async () => {
    const user = userEvent.setup();
    const searchPublic = vi.fn();
    const port = createMockPort({ searchPublic });
    renderSearch(port);
    await user.type(
      await screen.findByPlaceholderText("Search, @username, or t.me link"),
      "   ",
    );
    await new Promise((r) => setTimeout(r, 400));
    expect(searchPublic).not.toHaveBeenCalled();
  });

  it("invite link uses previewInvite not searchPublic", async () => {
    const user = userEvent.setup();
    const searchPublic = vi.fn();
    const previewInvite = vi.fn(async () => ({ ...hit, title: "Invite Club" }));
    const port = createMockPort({ searchPublic, previewInvite });
    renderSearch(port);
    await user.type(
      await screen.findByPlaceholderText("Search, @username, or t.me link"),
      "https://t.me/+AbCdEf123",
    );
    await waitFor(() => expect(previewInvite).toHaveBeenCalledWith("AbCdEf123"));
    expect(searchPublic).not.toHaveBeenCalled();
  });

  it("pending join shows pending approval and is not treated as joined", async () => {
    const user = userEvent.setup();
    const port = createMockPort({
      searchPublic: async () => ({ hits: [hit], nextOffset: null }),
      joinByUsername: async () => ({ pending: true }),
    });
    renderSearch(port);
    await user.type(
      await screen.findByPlaceholderText("Search, @username, or t.me link"),
      "cats",
    );
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Join" }));
    expect(await screen.findByText("pending approval")).toBeTruthy();
  });

  it("Add to Other from the channel does not join or add to the watchlist", async () => {
    const user = userEvent.setup();
    const joinByUsername = vi.fn();
    const addItem = vi.fn();
    const addOtherItem = vi.fn();
    stashSearchHit(hit);
    const port = createMockPort({
      joinByUsername,
    });
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
        <ChannelView peerId="1001" addItem={addItem} addOtherItem={addOtherItem} />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([channel]),
      history: createMemoryHistory({ initialEntries: ["/search/1001"] }),
    });
    render(<RouterProvider router={router} />);
    await user.click(await screen.findByRole("button", { name: "Add to Other" }));
    expect(addOtherItem).toHaveBeenCalledTimes(1);
    expect(addItem).not.toHaveBeenCalled();
    expect(joinByUsername).not.toHaveBeenCalled();
  });

  it("shows a video icon and the uploaded video count as a result loads", async () => {
    const user = userEvent.setup();
    const countVideos = vi.fn(async () => 128);
    const port = createMockPort({
      searchPublic: async () => ({ hits: [hit], nextOffset: null }),
      countVideos,
    });
    renderSearch(port);
    await user.type(
      await screen.findByPlaceholderText("Search, @username, or t.me link"),
      "cats",
    );
    expect(await screen.findByText("Cats")).toBeTruthy();
    await waitFor(() => expect(countVideos).toHaveBeenCalled());
    expect(await screen.findByLabelText("128 videos")).toBeTruthy();
    expect(screen.getByText("128")).toBeTruthy();
  });

  it("loads further pages as the list is scrolled, closest matches first", async () => {
    const user = userEvent.setup();
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

    const later: SearchHit = {
      ...hit,
      peerId: "1002",
      title: "Cat Clips",
      username: "catclips",
    };
    const searchPublic = vi.fn(async (_q: string, offset?: string) => {
      if (offset) return { hits: [later], nextOffset: null };
      return { hits: [hit], nextOffset: "1" };
    });
    try {
      const port = createMockPort({
        searchPublic,
        countVideos: async () => 3,
      });
      renderSearch(port);
      await user.type(
      await screen.findByPlaceholderText("Search, @username, or t.me link"),
      "cats",
    );
      expect(await screen.findByText("Cats")).toBeTruthy();
      await waitFor(() => expect(searchPublic).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(io.cb).toBeTruthy());
      if (!io.cb) throw new Error("IntersectionObserver was not constructed");
      io.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      expect(await screen.findByText("Cat Clips")).toBeTruthy();
      expect(searchPublic).toHaveBeenCalledWith("cats", "1");
      expect(screen.getByText("Cats")).toBeTruthy();
    } finally {
      globalThis.IntersectionObserver = Original;
    }
  });
});
