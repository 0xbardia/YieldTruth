import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchPolicies } from "@/lib/yieldtruth/fns";
import { policySentence } from "@/lib/yieldtruth/policy";
import { OriginNote, Shell } from "@/components/yield/shell";

export const Route = createFileRoute("/policies/")({
  loader: () => fetchPolicies(),
  component: PoliciesPage,
});

function PoliciesPage() {
  const policies = Route.useLoaderData();
  return (
    <Shell>
      <div className="desk-wrap py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">Policies</p>
            <h1 className="mt-2 text-5xl">Rules, not slogans</h1>
          </div>
          <Link to="/policies/new" className="btn btn-solid press">
            Create a policy
          </Link>
        </div>
        <ul className="ledger mt-8 divide-y divide-white/70 px-5">
          {policies.map((policy) => (
            <li key={policy.id} className="py-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/policies/$id" params={{ id: String(policy.id) }} className="text-2xl underline-offset-4 hover:underline">
                  {policy.name}
                </Link>
                <OriginNote origin={policy.origin} />
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6">{policySentence(policy)}</p>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}
