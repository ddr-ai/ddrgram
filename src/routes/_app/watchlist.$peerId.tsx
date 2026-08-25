import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VideosTab } from "@/videos/VideosTab";

export const Route = createFileRoute("/_app/watchlist/$peerId")({
  ssr: false,
  validateSearch: z.object({
    v: z.coerce.number().optional(),
  }),
  component: VideosRoute,
});

function VideosRoute() {
  const { peerId } = Route.useParams();
  return <VideosTab peerId={peerId} />;
}
