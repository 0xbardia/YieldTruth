import { createFileRoute } from "@tanstack/react-router";
import { handle, json, readId } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/opportunities/$id/")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handle(request, async () => {
          const id = readId(params.id);
          if (id == null) return json({ error: "bad id", code: "bad_id" }, 400, request);
          const { catchUpFromChain } = await import("@/lib/yieldtruth/chain-sync.server");
          await catchUpFromChain();
          const { getOpportunity } = await import("@/lib/yieldtruth/repo.server");
          const row = await getOpportunity(id);
          if (!row) return json({ error: "not found", code: "not_found" }, 404, request);
          return json(row, 200, request);
        }),
    },
  },
});