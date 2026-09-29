import { createFileRoute } from "@tanstack/react-router";
import { handle, json, readId } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/assessments/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handle(request, async () => {
          const [opp, rev] = params.id.split("-");
          const opportunityId = readId(opp ?? "");
          const revision = readId(rev ?? "");
          if (opportunityId == null || revision == null) {
            return json({ error: "use opportunity-revision", code: "bad_id" }, 400, request);
          }
          const { getAssessment } = await import("@/lib/yieldtruth/repo.server");
          const row = await getAssessment(opportunityId, revision);
          if (!row) return json({ error: "not found", code: "not_found" }, 404, request);
          return json(row, 200, request);
        }),
    },
  },
});