import { createFileRoute } from "@tanstack/react-router";
import { SearchTab } from "@/search/SearchTab";

export const Route = createFileRoute("/_app/search")({
  ssr: false,
  component: SearchTab,
});
