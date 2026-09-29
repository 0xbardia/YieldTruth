import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/yield/shell";
import { WriteBox } from "@/components/yield/write-box";
import { submitGenlayerWrite } from "@/lib/yieldtruth/chain-write";
import { policySentence } from "@/lib/yieldtruth/policy";
import type { PolicyRules } from "@/lib/yieldtruth/types";

export const Route = createFileRoute("/policies/new")({ component: NewPolicy });

const DEFAULTS: PolicyRules = {
  allow_token_subsidy: false,
  allow_leverage: false,
  allow_recursive: false,
  allow_points: false,
  allow_counterparty: false,
  low_confidence_requires_review: true,
  conflicting_requires_review: true,
  max_age_seconds: 604800,
};

const TOGGLES: Array<[keyof PolicyRules, string]> = [
  ["allow_token_subsidy", "Allow token subsidies"],
  ["allow_leverage", "Allow leverage"],
  ["allow_recursive", "Allow recursive yield"],
  ["allow_points", "Allow points speculation"],
  ["allow_counterparty", "Allow counterparty-dependent yield"],
  ["low_confidence_requires_review", "Low confidence requires review"],
  ["conflicting_requires_review", "Conflicting evidence requires review"],
];

function NewPolicy() {
  const [name, setName] = useState("Treasury desk");
  const [rules, setRules] = useState(DEFAULTS);
  const payload = { name, ...rules };
  const days = rules.max_age_seconds / 86400;
  const policyIssue =
    name.trim().length === 0
      ? "Name the policy before signing."
      : name.length > 64
        ? "The name has to be 64 characters or fewer."
        : !Number.isInteger(days) || days < 0 || days > 365
          ? "Freshness has to be a whole number of days, from 0 to 365."
          : undefined;
  return (
    <Shell>
      <div className="desk-wrap grid gap-8 py-10 lg:grid-cols-2">
        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
          <h1 className="text-5xl">Create a policy</h1>
          <p className="text-sm leading-6">The sentence below is compiled from these switches. The contract does not parse free-form policy text.</p>
          <label className="block text-sm" htmlFor="name">
            Name
            <input id="name" className="mt-1 min-h-11 w-full border border-ink bg-cream px-3" value={name} maxLength={64} onChange={(event) => setName(event.target.value)} />
          </label>
          {TOGGLES.map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={Boolean(rules[key])}
                onChange={(event) => setRules({ ...rules, [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
          <label className="block text-sm" htmlFor="age">
            Freshness window (days)
            <span className="mt-1 block text-xs leading-5 text-ink/70">
              A reading older than this many days is sent to review instead of passing. Use 0 for no time limit.
            </span>
            <input
              id="age"
              type="number"
              min={0}
              max={365}
              className="mt-1 min-h-11 w-full border border-ink bg-cream px-3"
              value={Math.round(rules.max_age_seconds / 86400)}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isInteger(next)) return;
                setRules({ ...rules, max_age_seconds: next * 86400 });
              }}
            />
          </label>
        </form>
        <div className="space-y-6">
          <p className="text-lg leading-7">{policySentence({ name, ...rules })}</p>
          <WriteBox
            title="Sign the policy"
            intent="This creates an immutable policy version. A later edit is a new id, not a rewrite."
            subject={`Create a new policy named “${name.trim() || "(unnamed)"}”`}
            disabledReason={policyIssue}
            onSign={(update) => submitGenlayerWrite("create_policy", [JSON.stringify(payload)], update)}
          />
        </div>
      </div>
    </Shell>
  );
}
