import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fetchOpportunity } from "@/lib/yieldtruth/fns";
import { COMPONENT_COPY, DECISION_COPY, REASON_COPY } from "@/lib/yieldtruth/copy";
import { DecisionMark, Shell } from "@/components/yield/shell";

export const Route = createFileRoute("/assessments/$id")({
  loader: async ({ params }) => {
    const [opp, rev] = params.id.split("-");
    const id = Number(opp);
    const revision = Number(rev);
    if (!Number.isInteger(id) || !Number.isInteger(revision)) throw notFound();
    const detail = await fetchOpportunity({ data: { id } });
    const assessment = detail?.assessments.find((row) => row.revision === revision);
    if (!detail || !assessment) throw notFound();
    return { opportunity: detail.opportunity, assessment };
  },
  component: AssessmentPage,
});

function AssessmentPage() {
  const { opportunity, assessment } = Route.useLoaderData();
  const copy = COMPONENT_COPY[assessment.primary_component];
  return (
    <Shell>
      <article className="desk-wrap py-10">
        <p className="text-xs tracking-[0.18em] uppercase">Assessment {assessment.revision}</p>
        <h1 className="mt-2 text-5xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-7">{copy.plain}</p>
        <div className="mt-4">
          <DecisionMark decision={assessment.decision} />
        </div>
        <p className="mt-3 max-w-2xl leading-7">{DECISION_COPY[assessment.decision]}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6">{REASON_COPY[assessment.reason_code]}</p>
        <p className="mt-4 text-sm leading-6">{assessment.rationale}</p>
        <p className="mt-4 font-mono text-xs">{assessment.assessed_at}</p>
        <Link to="/opportunities/$id" params={{ id: String(opportunity.id) }} className="mt-6 inline-flex underline">
          {opportunity.label}
        </Link>
      </article>
    </Shell>
  );
}
