import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/yield/shell";
import { publicConfig } from "@/lib/yieldtruth/public-config";

export const Route = createFileRoute("/roadmap")({ component: RoadmapPage });

const PHASES = [
  {
    name: "V1 — Name the source",
    state: "In this build",
    note: publicConfig.contractAddress
      ? `The desk is pointed at Studionet ${publicConfig.contractAddress}. A write still has to be signed by the wallet in this browser. A stored assessment is not permission to move capital.`
      : "The desk, the contract, and the wallet-signed write path are here. A Studionet address is not connected, so live consensus is not running in this preview.",
    items: [
      "Host registry so evidence cannot point at a private network",
      "Policies as structured switches, not a paragraph a model can reinterpret",
      "Classification inside GenLayer, using comparative consensus",
      "Approve, reject, or review decided by code after consensus",
      "Reassessment that keeps every earlier reading",
      "Sign screen that calls genlayer-js from the connected wallet",
      "Explorer that labels fixtures instead of pretending they are live",
    ],
  },
  {
    name: "V1.1 — Notice when it changes",
    state: "Planned",
    note: "Not built. Do not treat a mention on this page as a feature.",
    items: [
      "A scheduled re-read of markets you already care about",
      "A plain alert when the primary source changes",
      "More documentation hosts, added by the owner one at a time",
      "Tighter parsers for a few well-known protocols",
    ],
  },
  {
    name: "V1.2 — Let a vault listen",
    state: "Planned",
    note: "A consumer, not a new decision maker.",
    items: [
      "A small SDK that reads a finalized assessment",
      "Policy templates a desk can copy",
      "A webhook after finality, carrying the stored verdict only",
    ],
  },
  {
    name: "V2 — Let capital follow a rule",
    state: "Planned",
    note: "Out of scope until the classification record is boringly reliable.",
    items: [
      "Hooks a treasury can call only after an approval",
      "Coverage beyond the first documentation set",
      "Controls an institution can audit without reading Python",
    ],
  },
];

function RoadmapPage() {
  return (
    <Shell>
      <div className="desk-wrap py-12">
        <p className="kicker">Development plan</p>
        <h1 className="mt-2 max-w-3xl text-5xl">Build the record before you build the router.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8">
          Each phase has to be usable on its own. Later phases are written down so we do not pretend they already exist.
        </p>
        <ol className="mt-10 space-y-5">
          {PHASES.map((phase, index) => (
            <li key={phase.name} className="slip p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm text-muted">0{index + 1}</span>
                <h2 className="text-3xl">{phase.name}</h2>
                <span className={`stamp ${phase.state === "Planned" ? "text-amber" : "text-canopy"}`}>{phase.state}</span>
              </div>
              <p className="mt-3 max-w-3xl leading-7">{phase.note}</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {phase.items.map((item) => (
                  <li key={item} className="rounded-xl bg-mist px-3 py-2 text-sm leading-6">{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-base">
          The rules behind the current phase are in the <Link to="/docs" className="underline underline-offset-4">docs</Link>.
        </p>
      </div>
    </Shell>
  );
}
