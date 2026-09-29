import { createFileRoute } from "@tanstack/react-router";
import { publicConfigPayload } from "@/lib/yieldtruth/config";
import { handle, json } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/config")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request, async () => json(publicConfigPayload(), 200, request)),
    },
  },
});