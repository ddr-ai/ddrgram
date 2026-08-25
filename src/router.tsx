import {
  createHashHistory,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const history =
    typeof document === "undefined"
      ? createMemoryHistory({ initialEntries: ["/"] })
      : createHashHistory();

  return createRouter({
    routeTree,
    history,
    defaultErrorComponent: AppErrorComponent,
  });
}
