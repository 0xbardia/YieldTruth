import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/health/live")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request, async () => json({ status: "live" }, 200, request)),
    },
  },
});