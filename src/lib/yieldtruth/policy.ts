import type { AssessmentRecord, Decision, GateResult, PolicyRules } from "./types";

export interface ClassificationInput {
  evidence_state: AssessmentRecord["evidence_state"];
  primary_component: AssessmentRecord["primary_component"];
  components: AssessmentRecord["components"];
  confidence: AssessmentRecord["confidence"];
}

function ageSeconds(nowIso: string, assessedAt: string): number {
  const now = Date.parse(nowIso);
  const then = Date.parse(assessedAt);
  if (Number.isNaN(now) || Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((now - then) / 1000);
}

/**
 * Mirror of contracts/yield_truth.py evaluate_policy.
 * Preview only. Stored verdicts come from the contract or a labelled fixture.
 */
export function evaluatePolicy(
  classification: ClassificationInput,
  policy: PolicyRules,
  nowIso: string,
  assessedAt: string,
): { decision: Decision; reason_code: string } {
  const { evidence_state: state, primary_component: primary, components, confidence } = classification;
  if (state === "INSUFFICIENT" || primary === "UNKNOWN" || components.includes("UNKNOWN")) {
    return { decision: "REVIEW_REQUIRED", reason_code: "INSUFFICIENT_EVIDENCE" };
  }
  if (state === "CONFLICTING" && policy.conflicting_requires_review) {
    return { decision: "REVIEW_REQUIRED", reason_code: "CONFLICTING_EVIDENCE" };
  }
  if (confidence === "LOW" && policy.low_confidence_requires_review) {
    return { decision: "REVIEW_REQUIRED", reason_code: "LOW_CONFIDENCE" };
  }
  if (policy.max_age_seconds > 0 && assessedAt && ageSeconds(nowIso, assessedAt) > policy.max_age_seconds) {
    return { decision: "REVIEW_REQUIRED", reason_code: "STALE_ASSESSMENT" };
  }
  if (components.includes("TOKEN_SUBSIDY") && !policy.allow_token_subsidy) {
    return { decision: "REJECTED", reason_code: "TOKEN_SUBSIDY_FORBIDDEN" };
  }
  if (components.includes("LEVERAGED_YIELD") && !policy.allow_leverage) {
    return { decision: "REJECTED", reason_code: "LEVERAGE_FORBIDDEN" };
  }
  if (components.includes("RECURSIVE_YIELD") && !policy.allow_recursive) {
    return { decision: "REJECTED", reason_code: "RECURSIVE_FORBIDDEN" };
  }
  if (components.includes("POINTS_SPECULATION") && !policy.allow_points) {
    return { decision: "REJECTED", reason_code: "POINTS_FORBIDDEN" };
  }
  if (components.includes("COUNTERPARTY_DEPENDENT") && !policy.allow_counterparty) {
    return { decision: "REVIEW_REQUIRED", reason_code: "COUNTERPARTY_REVIEW" };
  }
  if (state !== "SUFFICIENT") {
    return { decision: "REVIEW_REQUIRED", reason_code: "EVIDENCE_NOT_SUFFICIENT" };
  }
  return { decision: "APPROVED", reason_code: "POLICY_PASS" };
}

export function gateFromStored(
  assessment: AssessmentRecord,
  policy: PolicyRules,
  nowIso: string,
): GateResult {
  const verdict = evaluatePolicy(assessment, policy, nowIso, assessment.assessed_at);
  return { ...verdict, stale: verdict.reason_code === "STALE_ASSESSMENT", source: "mirror" };
}

export function policySentence(policy: PolicyRules & { name?: string }): string {
  const blocks: string[] = [];
  if (!policy.allow_token_subsidy) blocks.push("token subsidies are rejected");
  if (!policy.allow_leverage) blocks.push("leverage is rejected");
  if (!policy.allow_recursive) blocks.push("recursive yield is rejected");
  if (!policy.allow_points) blocks.push("points speculation is rejected");
  if (!policy.allow_counterparty) blocks.push("counterparty-dependent yield needs review");
  if (policy.low_confidence_requires_review) blocks.push("low confidence needs review");
  if (policy.conflicting_requires_review) blocks.push("conflicting evidence needs review");
  const days = Math.round(policy.max_age_seconds / 86400);
  const age =
    policy.max_age_seconds > 0
      ? `assessments older than ${days} ${days === 1 ? "day" : "days"} need review`
      : "age is not gated";
  const name = policy.name ? `${policy.name}: ` : "";
  return `${name}${blocks.join("; ")}. ${age}.`;
}

/**
 * Display labels for a policy list.
 *
 * The chain holds immutable policy versions, and it is legitimate for two of them
 * to carry the same name — the first build created "Treasury desk" twice. Rendering
 * two identical labels makes the selector unusable and hides the fact that the
 * desk is evaluating against a specific policy id, so an ambiguous name gets its
 * id appended. This changes nothing on chain and nothing in the stored record.
 */
export function policyLabels(policies: Array<{ id: number; name: string }>): Record<number, string> {
  const counts = new Map<string, number>();
  for (const policy of policies) counts.set(policy.name, (counts.get(policy.name) ?? 0) + 1);
  const labels: Record<number, string> = {};
  for (const policy of policies) {
    labels[policy.id] = (counts.get(policy.name) ?? 0) > 1 ? `${policy.name} (#${policy.id})` : policy.name;
  }
  return labels;
}
