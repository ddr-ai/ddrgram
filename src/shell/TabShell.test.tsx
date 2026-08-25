import { render, screen } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { TabShell } from "./TabShell";

function renderShell(selectedPeerId: string | null) {
  const rootRoute = createRootRoute({
    component: () => (
      <TabShell selectedPeerId={selectedPeerId}>
        <Outlet />
      </TabShell>
    ),
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>home</div>,
  });
  const searchRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/search",
    component: () => <div>search</div>,
  });
  const watchlistRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/watchlist",
    component: () => <div>watchlist</div>,
  });
  const videosRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/watchlist/$peerId",
    component: () => <div>videos</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      searchRoute,
      watchlistRoute,
      videosRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ["/search"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("TabShell", () => {
  it("hides the Videos tab when nothing is selected", async () => {
    renderShell(null);
    expect(await screen.findByRole("tab", { name: "Search" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Videos" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Watchlist" })).toBeTruthy();
  });

  it("shows the Videos tab when a watchlist item is selected", async () => {
    renderShell("123");
    expect(await screen.findByRole("tab", { name: "Videos" })).toBeTruthy();
  });
});
