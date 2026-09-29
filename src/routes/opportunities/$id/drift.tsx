import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fetchOpportunity } from "@/lib/yieldtruth/fns";
import { COMPONENT_COPY } from "@/lib/yieldtruth/copy";
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
        {assessments.length === 0 ? <p className="mt-8">No history yet.</p> : null}
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
                    Changed from {COMPONENT_COPY[previous.primary_component].title}. {row.primary_component} entered the set.
                  </p>
                ) : null}
                <div className="mt-3">
                  <DecisionMark decision={row.decision} />
                </div>
                <p className="mt-2 font-mono text-xs">{row.assessed_at}</p>
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
