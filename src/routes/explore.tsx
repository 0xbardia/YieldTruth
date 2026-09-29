import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchExplore } from "@/lib/yieldtruth/fns";
import { COMPONENT_COPY } from "@/lib/yieldtruth/copy";
import { gateFromStored } from "@/lib/yieldtruth/policy";
import { DecisionMark, OriginNote, Shell } from "@/components/yield/shell";

export const Route = createFileRoute("/explore")({
  loader: () => fetchExplore(),
  component: Explore,
});

function Explore() {
  const { rows, policies, syncError } = Route.useLoaderData();
  const policy = policies.find((item) => item.id === 9001) ?? policies[0];
  const now = new Date().toISOString();
  return (
    <Shell>
      <div className="desk-wrap py-10">
        <p className="kicker">Explore yield</p>
        <h1 className="mt-2 text-5xl">Where the return is coming from</h1>
        <p className="mt-3 max-w-2xl leading-7">
          Fixture rows are labelled teaching records, not live quotes. The gate column recomputes the deterministic policy locally. It is not a fresh GenLayer vote.
        </p>
        {syncError ? (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-rust">
            The live contract could not be caught up just now ({syncError}). Rows already on the desk stay. Nothing here is treated as a new verdict.
          </p>
        ) : null}
        {rows.length === 0 ? <p className="mt-8">No opportunities yet.</p> : null}
        <div className="ledger mt-8 overflow-x-auto px-4">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <caption className="sr-only">Yield opportunities</caption>
            <thead>
              <tr className="border-b border-ink text-xs tracking-widest uppercase">
                <th className="py-2 font-medium">Market</th>
                <th className="py-2 font-medium">Primary source</th>
                <th className="py-2 font-medium">Gate</th>
                <th className="py-2 font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ opportunity, latest }) => {
                const gate = latest && policy ? gateFromStored(latest, policy, now) : null;
                const source = latest ? COMPONENT_COPY[latest.primary_component] : null;
                return (
                  <tr key={opportunity.id} className="border-b border-line align-top">
                    <td className="py-4 pr-4">
                      <Link to="/opportunities/$id" params={{ id: String(opportunity.id) }} className="text-lg underline-offset-4 hover:underline">
                        {opportunity.label}
                      </Link>
                      <p className="text-xs">
                        {opportunity.protocol} · {opportunity.asset} · APY {opportunity.advertised_apy}
                      </p>
                    </td>
                    <td className="py-4 pr-4">{source ? source.title : "Not assessed"}</td>
                    <td className="py-4 pr-4">{gate ? <DecisionMark decision={gate.decision} /> : "—"}</td>
                    <td className="py-4">
                      <OriginNote origin={opportunity.origin} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
