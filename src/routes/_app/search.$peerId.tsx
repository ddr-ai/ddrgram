import { createFileRoute } from "@tanstack/react-router";
import { ChannelView } from "@/search/ChannelView";

export const Route = createFileRoute("/_app/search/$peerId")({
  ssr: false,
  component: ChannelRoute,
});

function ChannelRoute() {
  const { peerId } = Route.useParams();
  return <ChannelView peerId={peerId} />;
}
