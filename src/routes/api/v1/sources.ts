import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/sources")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle(request, async () => {
          const { catchUpFromChain } = await import("@/lib/yieldtruth/chain-sync.server");
          await catchUpFromChain();
          const { listSources } = await import("@/lib/yieldtruth/repo.server");
          return json({ sources: await listSources() }, 200, request);
        }),
    },
  },
});