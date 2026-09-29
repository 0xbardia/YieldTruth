import assert from "node:assert/strict";
import test from "node:test";
import { syncFromReader, type ChainReader, type SyncStore } from "./indexer.ts";
import type { AssessmentRecord, OpportunityRecord, PolicyRecord } from "./types.ts";

function memoryStore() {
  const policies: PolicyRecord[] = [];
  const opportunities: OpportunityRecord[] = [];
  const assessments: AssessmentRecord[] = [];
  const state = { policy_cursor: 0, opportunity_cursor: 0, last_error: "" };
  const store: SyncStore = {
    read: async () => ({ ...state }),
    write: async (policyCursor, opportunityCursor, lastError) => {
      state.policy_cursor = policyCursor;
      state.opportunity_cursor = opportunityCursor;
      state.last_error = lastError;
    },
    savePolicy: async (row) => {
      const index = policies.findIndex((item) => item.id === row.id);
      if (index >= 0) {
        policies[index] = row;
        return false;
      }
      policies.push(row);
      return true;
    },
    saveOpportunity: async (row) => {
      const index = opportunities.findIndex((item) => item.id === row.id);
      if (index >= 0) {
        opportunities[index] = row;
        return false;
      }
      opportunities.push(row);
      return true;
    },
    saveAssessment: async (row) => {
      const index = assessments.findIndex(
        (item) => item.opportunity_id === row.opportunity_id && item.revision === row.revision,
      );
      if (index >= 0) {
        assessments[index] = row;
        return false;
      }
      assessments.push(row);
      return true;
    },
  };
  return { store, policies, opportunities, assessments, state };
}

const policy = {
  id: 1,
  name: "Desk",
  creator: "0xabc",
  created_at: "2026-09-01T00:00:00Z",
  origin: "chain" as const,
  allow_token_subsidy: false,
  allow_leverage: false,
  allow_recursive: false,
  allow_points: false,
  allow_counterparty: false,
  low_confidence_requires_review: true,
  conflicting_requires_review: true,
  max_age_seconds: 86400,
};

function opportunity(id: number): OpportunityRecord {
  return {
    id,
    protocol: "Aave",
    chain: "Ethereum",
    asset: "WETH",
    label: "Supply",
    advertised_apy: "variable",
    canonical_url: "https://aave.com/docs",
    evidence_urls: ["https://aave.com/docs"],
    pool_id: "",
    submitter: "0xabc",
    submitted_at: "2026-09-01T00:00:00Z",
    origin: "chain",
  };
}

test("sync is idempotent and resumes after the cursor", async () => {
  const bag = memoryStore();
  let oppCount = 1;
  const reader: ChainReader = {
    policyCount: async () => 1,
    opportunityCount: async () => oppCount,
    getPolicy: async () => policy,
    getOpportunity: async (id) => opportunity(id),
    getHistory: async (id) => [
      {
        opportunity_id: id,
        revision: 1,
        policy_id: 1,
        assessed_at: "2026-09-02T00:00:00Z",
        evidence_state: "SUFFICIENT",
        primary_component: "LENDING_INTEREST",
        components: ["LENDING_INTEREST"],
        risk_flags: [],
        confidence: "HIGH",
        rationale: "Interest.",
        sources_ok: 2,
        sources_failed: 0,
        decision: "APPROVED",
        reason_code: "POLICY_PASS",
        origin: "chain",
      },
    ],
  };
  const first = await syncFromReader(reader, bag.store);
  assert.equal(first.inserted, 3);
  const second = await syncFromReader(reader, bag.store);
  assert.equal(second.inserted, 0);
  assert.equal(bag.opportunities.length, 1);
  assert.equal(bag.assessments.length, 1);
  oppCount = 2;
  const third = await syncFromReader(reader, bag.store);
  assert.equal(third.inserted, 2);
  assert.equal(bag.state.opportunity_cursor, 2);
});

test("a later revision is indexed even when the opportunity cursor has already passed", async () => {
  const bag = memoryStore();
  let revisions = 1;
  const reader: ChainReader = {
    policyCount: async () => 1,
    opportunityCount: async () => 1,
    getPolicy: async () => policy,
    getOpportunity: async (id) => opportunity(id),
    getHistory: async (id) =>
      Array.from({ length: revisions }, (_, index) => ({
        opportunity_id: id,
        revision: index + 1,
        policy_id: 1,
        assessed_at: "2026-09-02T00:00:00Z",
        evidence_state: "SUFFICIENT" as const,
        primary_component: index === 0 ? ("LENDING_INTEREST" as const) : ("TOKEN_SUBSIDY" as const),
        components: index === 0 ? (["LENDING_INTEREST"] as const) : (["TOKEN_SUBSIDY"] as const),
        risk_flags: [],
        confidence: "HIGH" as const,
        rationale: "Interest.",
        sources_ok: 2,
        sources_failed: 0,
        decision: index === 0 ? ("APPROVED" as const) : ("REJECTED" as const),
        reason_code: index === 0 ? "POLICY_PASS" : "TOKEN_SUBSIDY_FORBIDDEN",
        origin: "chain" as const,
      })),
  };
  await syncFromReader(reader, bag.store);
  assert.equal(bag.assessments.length, 1);
  revisions = 2;
  const again = await syncFromReader(reader, bag.store);
  assert.equal(again.inserted, 1);
  assert.equal(bag.assessments.length, 2);
  assert.equal(bag.state.opportunity_cursor, 1);
});

test("a failed read does not advance the cursor", async () => {
  const bag = memoryStore();
  const reader: ChainReader = {
    policyCount: async () => 2,
    opportunityCount: async () => 0,
    getPolicy: async (id) => (id === 1 ? policy : null),
    getOpportunity: async () => null,
    getHistory: async () => [],
  };
  await assert.rejects(() => syncFromReader(reader, bag.store));
  assert.equal(bag.state.policy_cursor, 0);
  assert.match(bag.state.last_error, /missing policy 2/);
});
