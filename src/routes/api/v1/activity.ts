import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/activity")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle(request, async () => {
          const { catchUpFromChain } = await import("@/lib/yieldtruth/chain-sync.server");
          await catchUpFromChain();
          const { listActivity } = await import("@/lib/yieldtruth/repo.server");
          return json({ activity: await listActivity() }, 200, request);
        }),
    },
  },
});