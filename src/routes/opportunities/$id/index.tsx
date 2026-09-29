import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { fetchGate, fetchOpportunity, fetchPolicies } from "@/lib/yieldtruth/fns";
import { COMPONENT_COPY, DECISION_COPY, REASON_COPY } from "@/lib/yieldtruth/copy";
import { DecisionMark, OriginNote, Shell } from "@/components/yield/shell";
import { WriteBox } from "@/components/yield/write-box";
import { submitGenlayerWrite } from "@/lib/yieldtruth/chain-write";

export const Route = createFileRoute("/opportunities/$id/")({
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw notFound();
    const [detail, policies] = await Promise.all([fetchOpportunity({ data: { id } }), fetchPolicies()]);
    if (!detail) throw notFound();
    return { ...detail, policies };
  },
  component: OpportunityPage,
});

function OpportunityPage() {
  const { opportunity, assessments, policies } = Route.useLoaderData();
  const latest = assessments.at(-1) ?? null;
  const [policyId, setPolicyId] = useState(latest?.policy_id ?? policies[0]?.id ?? 9001);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof fetchGate>> | undefined>(undefined);
  const source = latest ? COMPONENT_COPY[latest.primary_component] : null;
  const decision = preview?.gate.decision ?? latest?.decision ?? "REVIEW_REQUIRED";
  const reason = preview?.gate.reason_code ?? latest?.reason_code ?? "NO_ASSESSMENT";

  return (
    <Shell>
      <article className="desk-wrap py-10">
        <p className="kicker">Opportunity</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-5xl">{opportunity.label}</h1>
          <OriginNote origin={opportunity.origin} />
        </div>
        <p className="mt-3 max-w-2xl leading-7">
          {opportunity.protocol} on {opportunity.chain}, asset {opportunity.asset}. Advertised APY is recorded as “{opportunity.advertised_apy}” and is not a quality score.
        </p>
        {source && latest ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="text-3xl">{source.title}</h2>
              <p className="mt-3 text-lg leading-7">{source.plain}</p>
              <p className="mt-4 text-sm leading-6">{latest.rationale}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs tracking-widest uppercase">Evidence</dt>
                  <dd>{latest.evidence_state}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-widest uppercase">Confidence</dt>
                  <dd>{latest.confidence}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-widest uppercase">Sources read</dt>
                  <dd>
                    {latest.sources_ok} ok / {latest.sources_failed} failed
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm">
                Components: {latest.components.join(", ") || "none"}. Flags: {latest.risk_flags.join(", ") || "none"}.
              </p>
            </div>
            <div className="slip p-5">
              <DecisionMark decision={decision} />
              <p className="mt-3 text-sm leading-6">{DECISION_COPY[decision]}</p>
              <p className="mt-2 text-sm leading-6">{REASON_COPY[reason] ?? reason}</p>
              <button
                type="button"
                className="mt-3 min-h-11 border border-ink px-3 text-sm"
                onClick={() => {
                  void fetchGate({ data: { opportunityId: opportunity.id, policyId } }).then(setPreview);
                }}
              >
                Preview gate
              </button>
              <p className="mt-3 text-xs leading-5">Preview uses the contract’s deterministic rules. It does not ask the model again. The policy is the one selected beside the signature.</p>
              <Link to="/opportunities/$id/drift" params={{ id: String(opportunity.id) }} className="mt-4 inline-flex min-h-11 items-center underline">
                Yield drift
              </Link>
            </div>
          </section>
        ) : (
          <p className="mt-8">No assessment yet. The signature below is the first reading.</p>
        )}
        <section className="mt-10">
          <h2 className="text-3xl">Evidence</h2>
          <ul className="mt-3 space-y-2">
            {opportunity.evidence_urls.map((url) => (
              <li key={url}>
                <a className="font-mono text-xs break-all underline" href={url} rel="noreferrer" target="_blank">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <label className="block text-sm" htmlFor="policy">
            Recompute against a policy
            <select
              id="policy"
              className="mt-1 min-h-11 w-full border border-ink bg-cream px-2"
              value={policyId}
              onChange={(event) => setPolicyId(Number(event.target.value))}
            >
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs leading-5">The same policy id is what your wallet sends with the assessment. The model does not pick it.</span>
          </label>
          <WriteBox
            title="Ask GenLayer to assess"
            intent="Validators render the registered evidence, agree on a classification, then the contract applies the policy you select. You sign this from your wallet."
            disabledReason={
              opportunity.origin === "fixture"
                ? "Fixture ids are not chain ids. Submit a new opportunity on Studionet to assess it there."
                : policies.length === 0
                  ? "Create a policy before asking for an assessment."
                  : undefined
            }
            onSign={(update) => submitGenlayerWrite("assess", [String(opportunity.id), String(policyId)], update)}
          />
        </div>
      </article>
    </Shell>
  );
}
