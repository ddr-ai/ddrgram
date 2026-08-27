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
import { AppFrame } from "@/shell/AppFrame";
import { deleteDatabase } from "@/stores/db";
import { addToWatchlist, listWatchlist } from "@/stores/watchlistStore";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import type { WatchlistItem } from "@/telegram/types";
import { WatchlistTab } from "./WatchlistTab";

const cats: WatchlistItem = {
  peerId: "1001",
  accessHash: "ah",
  title: "Cats",
  kind: "channel",
  muted: false,
  addedAt: 1,
};

function renderWatchlist(port = createMockPort()) {
  const rootRoute = createRootRoute({
    component: () => (
      <TelegramProvider port={port} configured>
        <AppFrame>
          <Outlet />
        </AppFrame>
      </TelegramProvider>
    ),
  });
  const watchlist = createRoute({
    getParentRoute: () => rootRoute,
    path: "/watchlist",
    component: WatchlistTab,
  });
  const videos = createRoute({
    getParentRoute: () => rootRoute,
    path: "/watchlist/$peerId",
    component: () => <div>videos-page</div>,
  });
  const search = createRoute({
    getParentRoute: () => rootRoute,
    path: "/search",
    component: () => <div>search</div>,
  });
  const login = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => <div>login</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([watchlist, videos, search, login]),
    history: createMemoryHistory({ initialEntries: ["/watchlist"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("WatchlistTab", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("tapping a row selects it and the Videos tab appears", async () => {
    await addToWatchlist(cats);
    const user = userEvent.setup();
    renderWatchlist();
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Cats/ }));
    expect(await screen.findByRole("tab", { name: "Videos" })).toBeTruthy();
  });

  it("Remove deletes the local row and hides Videos if it was selected", async () => {
    await addToWatchlist(cats);
    const user = userEvent.setup();
    renderWatchlist();
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByLabelText("Chat actions"));
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));
    await waitFor(async () => {
      expect(await listWatchlist()).toEqual([]);
    });
  });

  it("Leave calls port.leave and keeps the watchlist row", async () => {
    await addToWatchlist(cats);
    const leave = vi.fn(async () => {});
    const user = userEvent.setup();
    renderWatchlist(createMockPort({ leave }));
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByLabelText("Chat actions"));
    await user.click(await screen.findByRole("menuitem", { name: "Leave" }));
    await waitFor(() => expect(leave).toHaveBeenCalled());
    expect(await listWatchlist()).toHaveLength(1);
  });

  it("Mute then unmute call port.mute and port.unmute", async () => {
    await addToWatchlist(cats);
    const mute = vi.fn(async () => {});
    const unmute = vi.fn(async () => {});
    const user = userEvent.setup();
    renderWatchlist(createMockPort({ mute, unmute }));
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByLabelText("Chat actions"));
    await user.click(await screen.findByRole("menuitem", { name: "Mute" }));
    await waitFor(() => expect(mute).toHaveBeenCalled());
    await user.click(screen.getByLabelText("Chat actions"));
    await user.click(await screen.findByRole("menuitem", { name: "Unmute" }));
    await waitFor(() => expect(unmute).toHaveBeenCalled());
  });

  it("shows the video total for each channel", async () => {
    await addToWatchlist(cats);
    const countVideos = vi.fn(async () => 42);
    renderWatchlist(createMockPort({ countVideos }));
    expect(await screen.findByText("Cats")).toBeTruthy();
    expect(await screen.findByLabelText("42 videos")).toBeTruthy();
    expect(countVideos).toHaveBeenCalled();
  });

  it("updates the video total when new videos are uploaded", async () => {
    await addToWatchlist(cats);
    let total = 12;
    const countVideos = vi.fn(async () => total);
    renderWatchlist(createMockPort({ countVideos }));
    expect(await screen.findByLabelText("12 videos")).toBeTruthy();
    total = 15;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(await screen.findByLabelText("15 videos")).toBeTruthy();
  });
});
