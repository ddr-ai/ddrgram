import { createFileRoute } from "@tanstack/react-router";
import { OtherTab } from "@/other/OtherTab";

export const Route = createFileRoute("/_app/other/")({
  ssr: false,
  component: OtherTab,
});
