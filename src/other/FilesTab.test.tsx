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
import { FilesTab } from "./FilesTab";
import { deleteDatabase } from "@/stores/db";
import { addToOtherlist } from "@/stores/otherStore";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import type { FileItem, WatchlistItem } from "@/telegram/types";

const peer: WatchlistItem = {
  peerId: "2002",
  accessHash: "ah",
  title: "Docs Club",
  kind: "channel",
  muted: false,
  addedAt: 1,
};

const file: FileItem = {
  msgId: 9,
  peerId: "2002",
  date: 1,
  name: "notes.pdf",
  ext: "pdf",
  mime: "application/pdf",
  sizeBytes: 1200,
  kind: "document",
  media: { id: 9 },
};

function renderFiles(port: ReturnType<typeof createMockPort>, saveFile = vi.fn()) {
  const rootRoute = createRootRoute({
    component: () => (
      <TelegramProvider port={port} configured>
        <Outlet />
      </TelegramProvider>
    ),
  });
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/other/$peerId",
    component: () => <FilesTab peerId="2002" saveFile={saveFile} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/other/2002"] }),
  });
  return { ...render(<RouterProvider router={router} />), saveFile };
}

describe("FilesTab", () => {
  beforeEach(async () => {
    await deleteDatabase();
    await addToOtherlist(peer);
  });

  it("lists downloadable files and saves them to Downloads", async () => {
    const user = userEvent.setup();
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const downloadFile = vi.fn(async () => blob);
    const saveFile = vi.fn();
    const port = createMockPort({
      searchFiles: async () => ({ files: [file], nextOffset: null }),
      downloadFile,
    });
    renderFiles(port, saveFile);
    expect(await screen.findByText("notes.pdf")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Download notes.pdf" }));
    await waitFor(() => expect(downloadFile).toHaveBeenCalled());
    expect(saveFile).toHaveBeenCalledWith(blob, "notes.pdf");
  });

  it("opens the file so its contents can be read", async () => {
    const user = userEvent.setup();
    const code: FileItem = {
      ...file,
      msgId: 11,
      name: "app.py",
      ext: "py",
      mime: "text/x-python",
      kind: "code",
    };
    const blob = new Blob(["print('hello')\n"], { type: "text/plain" });
    const port = createMockPort({
      searchFiles: async () => ({ files: [code], nextOffset: null }),
      downloadFile: async () => blob,
    });
    renderFiles(port);
    expect(await screen.findByText("app.py")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "View app.py" }));
    expect(await screen.findByText(/print\('hello'\)/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });
});
