import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import type { SearchHit } from "@/telegram/types";
import { SearchTab } from "./SearchTab";

const hit: SearchHit = {
  peerId: "1001",
  accessHash: "ah",
  username: "cats",
  title: "Cats",
  kind: "channel",
  membership: "unknown",
};

function renderSearch(port: ReturnType<typeof createMockPort>, addItem = vi.fn()) {
  return render(
    <TelegramProvider port={port} configured>
      <SearchTab addItem={addItem} />
    </TelegramProvider>,
  );
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
    await user.type(screen.getByLabelText("Search"), "cats");
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Join" }));
    expect(joinByUsername).toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
  });

  it("Add does not join", async () => {
    const user = userEvent.setup();
    const joinByUsername = vi.fn();
    const joinChannel = vi.fn();
    const joinInvite = vi.fn();
    const addItem = vi.fn();
    const port = createMockPort({
      searchPublic: async () => ({ hits: [hit], nextOffset: null }),
      joinByUsername,
      joinChannel,
      joinInvite,
    });
    renderSearch(port, addItem);
    await user.type(screen.getByLabelText("Search"), "cats");
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Add to" }));
    await user.click(await screen.findByRole("menuitem", { name: "Watchlist" }));
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(joinByUsername).not.toHaveBeenCalled();
    expect(joinChannel).not.toHaveBeenCalled();
    expect(joinInvite).not.toHaveBeenCalled();
  });

  it("empty query does not call searchPublic", async () => {
    const user = userEvent.setup();
    const searchPublic = vi.fn();
    const port = createMockPort({ searchPublic });
    renderSearch(port);
    await user.type(screen.getByLabelText("Search"), "   ");
    await new Promise((r) => setTimeout(r, 400));
    expect(searchPublic).not.toHaveBeenCalled();
  });

  it("invite link uses previewInvite not searchPublic", async () => {
    const user = userEvent.setup();
    const searchPublic = vi.fn();
    const previewInvite = vi.fn(async () => ({ ...hit, title: "Invite Club" }));
    const port = createMockPort({ searchPublic, previewInvite });
    renderSearch(port);
    await user.type(screen.getByLabelText("Search"), "https://t.me/+AbCdEf123");
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
    await user.type(screen.getByLabelText("Search"), "cats");
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Join" }));
    expect(await screen.findByText("pending approval")).toBeTruthy();
  });

  it("Add to Other does not join or add to the watchlist", async () => {
    const user = userEvent.setup();
    const joinByUsername = vi.fn();
    const addItem = vi.fn();
    const addOtherItem = vi.fn();
    const port = createMockPort({
      searchPublic: async () => ({ hits: [hit], nextOffset: null }),
      joinByUsername,
    });
    render(
      <TelegramProvider port={port} configured>
        <SearchTab addItem={addItem} addOtherItem={addOtherItem} />
      </TelegramProvider>,
    );
    await user.type(screen.getByLabelText("Search"), "cats");
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Add to" }));
    await user.click(await screen.findByRole("menuitem", { name: "Other" }));
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
    await user.type(screen.getByLabelText("Search"), "cats");
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
      await user.type(screen.getByLabelText("Search"), "cats");
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
