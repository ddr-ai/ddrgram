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
      searchPublic: async () => [hit],
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
      searchPublic: async () => [hit],
      joinByUsername,
      joinChannel,
      joinInvite,
    });
    renderSearch(port, addItem);
    await user.type(screen.getByLabelText("Search"), "cats");
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Add" }));
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
      searchPublic: async () => [hit],
      joinByUsername: async () => ({ pending: true }),
    });
    renderSearch(port);
    await user.type(screen.getByLabelText("Search"), "cats");
    expect(await screen.findByText("Cats")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Join" }));
    expect(await screen.findByText("pending approval")).toBeTruthy();
  });
});
