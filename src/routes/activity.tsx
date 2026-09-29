import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchActivity } from "@/lib/yieldtruth/fns";
import { OriginNote, Shell } from "@/components/yield/shell";

export const Route = createFileRoute("/activity")({
  loader: () => fetchActivity(),
  component: ActivityPage,
});

function ActivityPage() {
  const rows = Route.useLoaderData();
  return (
    <Shell>
      <div className="desk-wrap py-10">
        <p className="kicker">Record</p>
        <h1 className="mt-2 text-5xl">Activity</h1>
        <p className="mt-3 max-w-2xl leading-7">A product log of what the desk has recorded. Fixture lines are labelled. Chain lines appear after the indexer reads finalized contract state.</p>
        {rows.length === 0 ? <p className="mt-8">No activity yet.</p> : null}
        <ol className="ledger mt-8 divide-y divide-white/70 px-5">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p>{row.summary}</p>
                {/^\d+$/.test(row.ref_id) ? (
                  <Link to="/opportunities/$id" params={{ id: row.ref_id }} className="text-sm underline">
                    Open record
                  </Link>
                ) : null}
              </div>
              <OriginNote origin={row.origin} />
            </li>
          ))}
        </ol>
      </div>
    </Shell>
  );
}
