import { createFileRoute } from "@tanstack/react-router";
import { handle, json, readId } from "@/lib/yieldtruth/http";

export const Route = createFileRoute("/api/v1/opportunities/$id/assessments")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handle(request, async () => {
          const id = readId(params.id);
          if (id == null) return json({ error: "bad id", code: "bad_id" }, 400, request);
          const { listAssessments } = await import("@/lib/yieldtruth/repo.server");
          return json({ assessments: await listAssessments(id) }, 200, request);
        }),
    },
  },
});