import { createFileRoute } from "@tanstack/react-router";
import { handle, json, readPage } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/opportunities/")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handle(request, async () => {
          const page = readPage(new URL(request.url));
          if ("error" in page) return json({ error: page.error, code: "bad_page" }, 400, request);
          const { catchUpFromChain } = await import("@/lib/yieldtruth/chain-sync.server");
          const sync = await catchUpFromChain();
          const { serverConfig } = await import("@/lib/yieldtruth/config");
          const { listOpportunities } = await import("@/lib/yieldtruth/repo.server");
          const rows = await listOpportunities(page.limit, page.offset);
          const syncStatus = sync.error ? "stale" : serverConfig.contractAddress ? "ok" : "unconfigured";
          return json({ opportunities: rows, sync: syncStatus }, 200, request);
        }),
    },
  },
});
