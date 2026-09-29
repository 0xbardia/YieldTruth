import { createFileRoute } from "@tanstack/react-router";
import { handle, json } from "@/lib/yieldtruth/http";
import { serverConfig } from "@/lib/yieldtruth/config";

export const Route = createFileRoute("/api/v1/health/ready")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle(request, async () => {
          const { catchUpFromChain } = await import("@/lib/yieldtruth/chain-sync.server");
          await catchUpFromChain();
          const { readiness, readSync } = await import("@/lib/yieldtruth/repo.server");
          const db = await readiness();
          const sync = db.database === "ok" ? await readSync() : null;
          const chain = serverConfig.contractAddress ? (sync?.last_error ? "down" : "ok") : "unconfigured";
          const ready = db.database === "ok" && chain !== "down";
          return json(
            {
              status: ready ? "ready" : "degraded",
              database: db.database,
              migrations: db.database === "ok" ? "applied" : "unknown",
              chain,
              contractAddress: serverConfig.contractAddress,
              lag: sync,
            },
            ready ? 200 : 503,
            request,
          );
        }),
    },
  },
});