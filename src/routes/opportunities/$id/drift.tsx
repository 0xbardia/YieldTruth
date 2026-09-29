import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fetchOpportunity } from "@/lib/yieldtruth/fns";
import { COMPONENT_COPY, REASON_COPY, assessedWhen } from "@/lib/yieldtruth/copy";
import { DecisionMark, Shell } from "@/components/yield/shell";

export const Route = createFileRoute("/opportunities/$id/drift")({
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw notFound();
    const detail = await fetchOpportunity({ data: { id } });
    if (!detail) throw notFound();
    return detail;
  },
  component: DriftPage,
});

function DriftPage() {
  const { opportunity, assessments } = Route.useLoaderData();
  return (
    <Shell>
      <div className="desk-wrap py-10">
        <p className="text-xs tracking-[0.18em] uppercase">Yield drift</p>
        <h1 className="mt-2 text-5xl">{opportunity.label}</h1>
        <p className="mt-3 max-w-2xl leading-7">
          Older assessments stay. Nothing here is overwritten. A change in the primary source is the drift.
        </p>
        {assessments.length === 0 ? (
          <p className="mt-8">Nothing has been assessed for this market yet. Run an assessment and the first reading appears here.</p>
        ) : null}
        {assessments.length === 1 ? (
          <p className="mt-8 border-l-2 border-line pl-4 text-sm leading-6">
            This market has one assessment so far, so there is nothing to compare it against yet. Assess it again
            later and any change in the source of the yield will be shown here.
          </p>
        ) : null}
        <ol className="spine mt-8 space-y-8 pl-10">
          {assessments.map((row, index) => {
            const previous = assessments[index - 1];
            const changed = previous && previous.primary_component !== row.primary_component;
            return (
              <li key={row.revision}>
                <p className="text-xs tracking-[0.16em] uppercase">Assessment {row.revision}</p>
                <h2 className="text-3xl">{COMPONENT_COPY[row.primary_component].title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6">{COMPONENT_COPY[row.primary_component].plain}</p>
                {changed ? (
                  <p className="mt-2 text-sm text-rust">
                    Changed from {COMPONENT_COPY[previous.primary_component].title} to{" "}
                    {COMPONENT_COPY[row.primary_component].title}. That is the drift.
                  </p>
                ) : null}
                <div className="mt-3">
                  <DecisionMark decision={row.decision} />
                  <p className="mt-1 text-sm leading-6">{REASON_COPY[row.reason_code] ?? row.reason_code}</p>
                </div>
                <p className="mt-2 text-xs text-ink/70">
                  {assessedWhen(row.assessed_at)} · policy {row.policy_id}
                </p>
              </li>
            );
          })}
        </ol>
        <Link to="/opportunities/$id" params={{ id: String(opportunity.id) }} className="mt-8 inline-flex min-h-11 items-center underline">
          Back to the opportunity
        </Link>
      </div>
    </Shell>
  );
}
