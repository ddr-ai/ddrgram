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
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/telegram/errors";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import { deleteDatabase } from "@/stores/db";
import { addToWatchlist } from "@/stores/watchlistStore";
import type { VideoItem, WatchlistItem } from "@/telegram/types";
import { VideosTab } from "./VideosTab";

const peer: WatchlistItem = {
  peerId: "1001",
  accessHash: "ah",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 1,
};

function video(msgId: number): VideoItem {
  return {
    msgId,
    peerId: "1001",
    date: 1000 - msgId,
    durationSec: 12,
    sizeBytes: 10,
    document: { id: msgId },
  };
}

function renderVideos(port: ReturnType<typeof createMockPort>) {
  const rootRoute = createRootRoute({
    component: () => (
      <TelegramProvider port={port} configured>
        <Outlet />
      </TelegramProvider>
    ),
  });
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/watchlist/$peerId",
    validateSearch: (s: Record<string, unknown>) => ({
      v: s.v != null ? Number(s.v) : undefined,
    }),
    component: () => <VideosTab peerId="1001" />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/watchlist/1001"] }),
  });
  return { ...render(<RouterProvider router={router} />), router };
}

describe("VideosTab", () => {
  beforeEach(async () => {
    await deleteDatabase();
    await addToWatchlist(peer);
  });

  it("empty copy No videos in this channel/group.", async () => {
    const port = createMockPort({
      searchVideos: async () => ({ videos: [], nextOffset: null }),
    });
    renderVideos(port);
    expect(
      await screen.findByText("No videos in this channel/group."),
    ).toBeTruthy();
  });

  it("private_chat shows Join (does not call addToWatchlist)", async () => {
    const joinChannel = vi.fn(async () => ({ pending: false }));
    const port = createMockPort({
      searchVideos: async () => {
        throw new AppError("private_chat", "CHANNEL_PRIVATE");
      },
      joinChannel,
    });
    renderVideos(port);
    expect(await screen.findByRole("button", { name: "Join" })).toBeTruthy();
  });

  it("first page renders buttons for each video", async () => {
    const port = createMockPort({
      searchVideos: async () => ({
        videos: [video(3), video(2), video(1)],
        nextOffset: null,
      }),
    });
    renderVideos(port);
    await waitFor(() => {
      expect(document.querySelectorAll("[data-msgid]").length).toBe(3);
    });
  });
});
