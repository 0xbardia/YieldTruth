import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchPolicy } from "@/lib/yieldtruth/fns";
import { policySentence } from "@/lib/yieldtruth/policy";
import { OriginNote, Shell } from "@/components/yield/shell";

export const Route = createFileRoute("/policies/$id")({
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw notFound();
    const policy = await fetchPolicy({ data: { id } });
    if (!policy) throw notFound();
    return policy;
  },
  component: PolicyPage,
});

function PolicyPage() {
  const policy = Route.useLoaderData();
  const flags: Array<[string, boolean | number]> = [
    ["Token subsidy allowed", policy.allow_token_subsidy],
    ["Leverage allowed", policy.allow_leverage],
    ["Recursive yield allowed", policy.allow_recursive],
    ["Points speculation allowed", policy.allow_points],
    ["Counterparty dependency allowed", policy.allow_counterparty],
    ["Low confidence requires review", policy.low_confidence_requires_review],
    ["Conflicting evidence requires review", policy.conflicting_requires_review],
    ["Max age (seconds)", policy.max_age_seconds],
  ];
  return (
    <Shell>
      <article className="desk-wrap py-10">
        <OriginNote origin={policy.origin} />
        <h1 className="mt-3 text-5xl">{policy.name}</h1>
        <p className="mt-4 max-w-2xl leading-7">{policySentence(policy)}</p>
        <dl className="mt-8 max-w-xl divide-y divide-line border-y border-ink">
          {flags.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt>{label}</dt>
              <dd className="font-mono">{String(value)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 font-mono text-xs">Created {policy.created_at}</p>
      </article>
    </Shell>
  );
}
