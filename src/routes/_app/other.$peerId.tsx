import { createFileRoute } from "@tanstack/react-router";
import { FilesTab } from "@/other/FilesTab";

export const Route = createFileRoute("/_app/other/$peerId")({
  ssr: false,
  component: FilesRoute,
});

function FilesRoute() {
  const { peerId } = Route.useParams();
  return <FilesTab peerId={peerId} />;
}
