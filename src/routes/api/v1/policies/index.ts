import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/policies/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle(request, async () => {
          const { catchUpFromChain } = await import("@/lib/yieldtruth/chain-sync.server");
          await catchUpFromChain();
          const { listPolicies } = await import("@/lib/yieldtruth/repo.server");
          return json({ policies: await listPolicies() }, 200, request);
        }),
    },
  },
});