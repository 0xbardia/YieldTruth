export const COMPONENTS = [
  "ORGANIC_FEES",
  "LENDING_INTEREST",
  "STAKING_REWARDS",
  "TOKEN_SUBSIDY",
  "LEVERAGED_YIELD",
  "RECURSIVE_YIELD",
  "COUNTERPARTY_DEPENDENT",
  "POINTS_SPECULATION",
  "OTHER_VERIFIED",
  "UNKNOWN",
] as const;

export type YieldComponent = (typeof COMPONENTS)[number];

export const EVIDENCE_STATES = ["SUFFICIENT", "INSUFFICIENT", "CONFLICTING"] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const DECISIONS = ["APPROVED", "REJECTED", "REVIEW_REQUIRED"] as const;
export type Decision = (typeof DECISIONS)[number];

export type Origin = "fixture" | "chain";

export interface PolicyRules {
  allow_token_subsidy: boolean;
  allow_leverage: boolean;
  allow_recursive: boolean;
  allow_points: boolean;
  allow_counterparty: boolean;
  low_confidence_requires_review: boolean;
  conflicting_requires_review: boolean;
  max_age_seconds: number;
}

export interface PolicyRecord extends PolicyRules {
  id: number;
  name: string;
  creator: string;
  created_at: string;
  origin: Origin;
}

export interface OpportunityRecord {
  id: number;
  protocol: string;
  chain: string;
  asset: string;
  label: string;
  advertised_apy: string;
  canonical_url: string;
  evidence_urls: string[];
  pool_id: string;
  submitter: string;
  submitted_at: string;
  origin: Origin;
}

export interface AssessmentRecord {
  opportunity_id: number;
  revision: number;
  policy_id: number;
  assessed_at: string;
  evidence_state: EvidenceState;
  primary_component: YieldComponent;
  components: YieldComponent[];
  risk_flags: string[];
  confidence: Confidence;
  rationale: string;
  sources_ok: number;
  sources_failed: number;
  decision: Decision;
  reason_code: string;
  origin: Origin;
}

export interface SourceRecord {
  host: string;
  label: string;
  enabled: boolean;
  origin: Origin;
}

export interface ActivityRecord {
  id: number;
  kind: string;
  summary: string;
  ref_id: string;
  origin: Origin;
  created_at: string;
}

export interface GateResult {
  decision: Decision;
  reason_code: string;
  stale: boolean;
  source: "mirror";
}
