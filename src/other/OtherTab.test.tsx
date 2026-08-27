import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { OtherTab } from "./OtherTab";
import { deleteDatabase } from "@/stores/db";
import { addToOtherlist } from "@/stores/otherStore";
import { createMockPort } from "@/telegram/mockPort";
import { TelegramProvider } from "@/telegram/TelegramProvider";
import type { WatchlistItem } from "@/telegram/types";

const docs: WatchlistItem = {
  peerId: "2002",
  accessHash: "ah",
  title: "Docs Club",
  kind: "channel",
  muted: false,
  addedAt: 1,
};

function renderOther() {
  const rootRoute = createRootRoute({
    component: () => (
      <TelegramProvider port={createMockPort()} configured>
        <Outlet />
      </TelegramProvider>
    ),
  });
  const list = createRoute({
    getParentRoute: () => rootRoute,
    path: "/other",
    component: OtherTab,
  });
  const files = createRoute({
    getParentRoute: () => rootRoute,
    path: "/other/$peerId",
    component: () => <div>files-page</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([list, files]),
    history: createMemoryHistory({ initialEntries: ["/other"] }),
  });
  return { ...render(<RouterProvider router={router} />), router };
}

describe("OtherTab", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("opens a channel into the files view", async () => {
    await addToOtherlist(docs);
    const user = userEvent.setup();
    const { router } = renderOther();
    expect(await screen.findByText("Docs Club")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Docs Club/ }));
    expect(router.state.location.pathname).toBe("/other/2002");
  });
});
