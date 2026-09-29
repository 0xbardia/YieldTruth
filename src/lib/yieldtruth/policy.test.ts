import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePolicy, policyLabels, policySentence, type ClassificationInput } from "./policy.ts";

const desk = {
  allow_token_subsidy: false,
  allow_leverage: false,
  allow_recursive: false,
  allow_points: false,
  allow_counterparty: false,
  low_confidence_requires_review: true,
  conflicting_requires_review: true,
  max_age_seconds: 86400,
};

const now = "2026-09-26T00:00:00Z";
const fresh = "2026-09-25T00:00:00Z";

test("token subsidy is rejected even if a model field would say approved", () => {
  const verdict = evaluatePolicy(
    {
      evidence_state: "SUFFICIENT",
      primary_component: "TOKEN_SUBSIDY",
      components: ["TOKEN_SUBSIDY", "LENDING_INTEREST"],
      confidence: "HIGH",
    },
    desk,
    now,
    fresh,
  );
  assert.equal(verdict.decision, "REJECTED");
  assert.equal(verdict.reason_code, "TOKEN_SUBSIDY_FORBIDDEN");
});

test("organic fees pass a conservative desk", () => {
  const verdict = evaluatePolicy(
    {
      evidence_state: "SUFFICIENT",
      primary_component: "ORGANIC_FEES",
      components: ["ORGANIC_FEES"],
      confidence: "HIGH",
    },
    desk,
    now,
    fresh,
  );
  assert.equal(verdict.decision, "APPROVED");
});

test("stale assessments ask for review without rewriting history", () => {
  const verdict = evaluatePolicy(
    {
      evidence_state: "SUFFICIENT",
      primary_component: "LENDING_INTEREST",
      components: ["LENDING_INTEREST"],
      confidence: "HIGH",
    },
    desk,
    now,
    "2026-01-01T00:00:00Z",
  );
  assert.equal(verdict.reason_code, "STALE_ASSESSMENT");
});

test("a one-day window is singular", () => {
  const sentence = policySentence({ ...desk, name: "Studio readback", max_age_seconds: 86400 });
  assert.match(sentence, /older than 1 day need review/);
  assert.doesNotMatch(sentence, /1 days/);
});

test("unknown enums cannot become an approval", () => {
  const verdict = evaluatePolicy(
    {
      evidence_state: "INSUFFICIENT",
      primary_component: "UNKNOWN",
      components: ["UNKNOWN"],
      confidence: "LOW",
    },
    desk,
    now,
    fresh,
  );
  assert.equal(verdict.decision, "REVIEW_REQUIRED");
});

// --- The invariant that matters: consensus classifies, contract code decides. ---

/** Policy 1 exactly as read from Studionet via get_policy("1"). */
const policyOne = {
  allow_token_subsidy: false,
  allow_leverage: false,
  allow_recursive: false,
  allow_points: false,
  allow_counterparty: false,
  low_confidence_requires_review: true,
  conflicting_requires_review: true,
  max_age_seconds: 604800,
};

/** The revision-1 consensus result exactly as stored by the contract. */
const chainRevision1: ClassificationInput = {
  evidence_state: "SUFFICIENT",
  primary_component: "LENDING_INTEREST",
  components: ["LENDING_INTEREST"],
  confidence: "MEDIUM",
};

test("LENDING_INTEREST + MEDIUM against Policy 1 is APPROVED / POLICY_PASS", () => {
  const verdict = evaluatePolicy({ ...chainRevision1 }, policyOne, now, fresh);
  assert.deepEqual(verdict, { decision: "APPROVED", reason_code: "POLICY_PASS" });
});

test("every gate that could have blocked revision 1 is load-bearing", () => {
  // APPROVED is only reachable because each of these gates passes. Flip exactly one
  // and the verdict must change, which is what makes the pass deterministic rather
  // than a model choice.
  const blocked: Array<[Partial<ClassificationInput>, string]> = [
    [{ evidence_state: "INSUFFICIENT" }, "INSUFFICIENT_EVIDENCE"],
    [{ evidence_state: "CONFLICTING" }, "CONFLICTING_EVIDENCE"],
    [{ primary_component: "UNKNOWN", components: ["UNKNOWN"] }, "INSUFFICIENT_EVIDENCE"],
    [{ confidence: "LOW" }, "LOW_CONFIDENCE"],
    [{ components: ["LENDING_INTEREST", "TOKEN_SUBSIDY"] }, "TOKEN_SUBSIDY_FORBIDDEN"],
    [{ components: ["LENDING_INTEREST", "LEVERAGED_YIELD"] }, "LEVERAGE_FORBIDDEN"],
    [{ components: ["LENDING_INTEREST", "RECURSIVE_YIELD"] }, "RECURSIVE_FORBIDDEN"],
    [{ components: ["LENDING_INTEREST", "POINTS_SPECULATION"] }, "POINTS_FORBIDDEN"],
    [{ components: ["LENDING_INTEREST", "COUNTERPARTY_DEPENDENT"] }, "COUNTERPARTY_REVIEW"],
  ];
  for (const [override, reason] of blocked) {
    const verdict = evaluatePolicy({ ...chainRevision1, ...override }, policyOne, now, fresh);
    assert.notEqual(verdict.decision, "APPROVED", `${JSON.stringify(override)} must not approve`);
    assert.equal(verdict.reason_code, reason);
  }
  // Staleness is the one gate that is time-based rather than field-based.
  const stale = evaluatePolicy({ ...chainRevision1 }, policyOne, now, "2026-01-01T00:00:00Z");
  assert.equal(stale.reason_code, "STALE_ASSESSMENT");
  // 604800s is exactly 7 days, and the gate is a strict `>`: the boundary passes,
  // one second past it does not.
  assert.equal(evaluatePolicy({ ...chainRevision1 }, policyOne, "2026-08-02T00:00:00Z", "2026-07-26T00:00:00Z").reason_code, "POLICY_PASS");
  assert.equal(evaluatePolicy({ ...chainRevision1 }, policyOne, "2026-08-02T00:00:01Z", "2026-07-26T00:00:00Z").reason_code, "STALE_ASSESSMENT");
});

test("a policy name shared by two on-chain versions is disambiguated by id", () => {
  // The first build created "Treasury desk" twice. Two identical labels make the
  // selector unusable, so the id is appended only when the name is ambiguous.
  assert.deepEqual(policyLabels([{ id: 1, name: "Treasury desk" }, { id: 2, name: "Treasury desk" }]), {
    1: "Treasury desk (#1)",
    2: "Treasury desk (#2)",
  });
  assert.deepEqual(policyLabels([{ id: 7, name: "Desk conservative" }, { id: 8, name: "Treasury desk" }]), {
    7: "Desk conservative",
    8: "Treasury desk",
  });
});

test("a model-supplied verdict key cannot reach the decision", () => {
  // contracts/yield_truth.py `_coerce_model` fails closed on any key outside
  // {schema_version, evidence_state, primary_component, components, risk_flags,
  // confidence, rationale} — there is no verdict key to coerce. Mirror that here:
  // extra fields on the classification are ignored by the deterministic layer.
  const smuggled = {
    ...chainRevision1,
    components: ["LENDING_INTEREST", "TOKEN_SUBSIDY"],
    decision: "APPROVED",
    reason_code: "POLICY_PASS",
    verdict: "APPROVED",
  };
  const verdict = evaluatePolicy(smuggled as never, policyOne, now, fresh);
  assert.deepEqual(verdict, { decision: "REJECTED", reason_code: "TOKEN_SUBSIDY_FORBIDDEN" });
});

