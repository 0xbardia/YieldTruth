import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchPolicy } from "@/lib/yieldtruth/fns";
import { policySentence } from "@/lib/yieldtruth/policy";
import { assessedWhen } from "@/lib/yieldtruth/copy";
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
  const age =
    policy.max_age_seconds > 0
      ? `${Math.round(policy.max_age_seconds / 86400)} ${Math.round(policy.max_age_seconds / 86400) === 1 ? "day" : "days"}`
      : "no limit";
  // Each row states the outcome, not the stored boolean, so a first-time reader can
  // answer "what would this reject?" without decoding true/false.
  const rows: Array<[string, string]> = [
    ["Token incentives", policy.allow_token_subsidy ? "allowed" : "rejected"],
    ["Leveraged yield", policy.allow_leverage ? "allowed" : "rejected"],
    ["Recursive yield", policy.allow_recursive ? "allowed" : "rejected"],
    ["Points speculation", policy.allow_points ? "allowed" : "rejected"],
    ["Counterparty-dependent yield", policy.allow_counterparty ? "allowed" : "sent to review"],
    ["Low-confidence reading", policy.low_confidence_requires_review ? "sent to review" : "allowed"],
    ["Sources that disagree", policy.conflicting_requires_review ? "sent to review" : "allowed"],
    ["Reading older than", age],
  ];
  return (
    <Shell>
      <article className="desk-wrap py-10">
        <OriginNote origin={policy.origin} />
        <p className="kicker">Policy #{policy.id}</p>
        <h1 className="mt-2 text-5xl">{policy.name}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-7">
          This policy decides whether a market may pass. It does not decide where the yield comes from — GenLayer
          validators do that first, and the contract applies these rules to the result.
        </p>
        <h2 className="mt-8 text-2xl">What this policy does</h2>
        <dl className="mt-3 max-w-xl divide-y divide-line border-y border-ink">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt>{label}</dt>
              <dd className={value === "rejected" ? "font-medium text-rust" : "font-medium"}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/80">{policySentence(policy)}</p>
        <p className="mt-4 text-xs text-ink/70">
          Created {assessedWhen(policy.created_at)} · policy id {policy.id}
        </p>
      </article>
    </Shell>
  );
}
