import { getSql, type Sql } from "../db";
import { gateFromStored } from "./policy";
import type {
  ActivityRecord,
  AssessmentRecord,
  OpportunityRecord,
  PolicyRecord,
  PolicyRules,
  SourceRecord,
} from "./types";

let seeded = false;

// Rules for the two *fixture* (teaching) policies only. Chain policies are whatever
// create_policy stored on Studionet and are never seeded here.
//
// max_age_seconds is 0 ("age is not gated") on purpose. These records are labelled
// "not a live reading" and carry fixed 2026-09 dates; with a 7-day window every
// fixture silently flipped to REVIEW_REQUIRED / STALE_ASSESSMENT on 2026-09-27 and the
// gate preview could no longer demonstrate an APPROVED outcome. The staleness gate
// itself is still enforced and unit-tested against the real chain policies.
const desk: PolicyRules = {
  allow_token_subsidy: false,
  allow_leverage: false,
  allow_recursive: false,
  allow_points: false,
  allow_counterparty: false,
  low_confidence_requires_review: true,
  conflicting_requires_review: true,
  max_age_seconds: 0,
};

function rules(policy: PolicyRules): string {
  return JSON.stringify(policy);
}

async function ensureSeed(sql: Sql): Promise<void> {
  if (seeded) return;
  const existing = await sql<{ n: number }>`select count(*)::int as n from yt_policies where origin = 'fixture'`;
  if ((existing[0]?.n ?? 0) > 0) {
    seeded = true;
    return;
  }
  await sql`
    insert into yt_policies (id, name, rules, creator, created_at, origin) values
    (9001, 'Desk conservative', ${rules(desk)}::jsonb, 'fixture', '2026-09-01T00:00:00Z', 'fixture'),
    (9002, 'Subsidy-tolerant research', ${rules({ ...desk, allow_token_subsidy: true })}::jsonb, 'fixture', '2026-09-01T00:00:00Z', 'fixture')
    on conflict (id) do nothing
  `;
  const sources: Array<[string, string]> = [
    ["aave.com", "Aave"],
    ["docs.aave.com", "Aave docs"],
    ["lido.fi", "Lido"],
    ["docs.lido.fi", "Lido docs"],
    ["docs.morpho.org", "Morpho docs"],
    ["docs.uniswap.org", "Uniswap docs"],
    ["ethereum.org", "Ethereum"],
  ];
  for (const [host, label] of sources) {
    await sql`
      insert into yt_sources (host, label, enabled, origin)
      values (${host}, ${label}, true, 'fixture')
      on conflict (host) do nothing
    `;
  }
  await insertOpp(sql, {
    id: 9001,
    protocol: "Aave",
    chain: "Ethereum",
    asset: "WETH",
    label: "Aave v3 WETH supply",
    advertised_apy: "variable",
    canonical_url: "https://aave.com/docs",
    evidence_urls: ["https://aave.com/docs", "https://docs.aave.com/"],
    pool_id: "",
    submitter: "fixture",
    submitted_at: "2026-09-18T00:00:00Z",
    origin: "fixture",
  });
  await insertOpp(sql, {
    id: 9002,
    protocol: "Lido",
    chain: "Ethereum",
    asset: "stETH",
    label: "stETH staking",
    advertised_apy: "variable",
    canonical_url: "https://docs.lido.fi/",
    evidence_urls: ["https://docs.lido.fi/", "https://lido.fi/"],
    pool_id: "steth",
    submitter: "fixture",
    submitted_at: "2026-09-18T00:00:00Z",
    origin: "fixture",
  });
  await insertOpp(sql, {
    id: 9003,
    protocol: "Teaching record",
    chain: "Ethereum",
    asset: "USDC",
    label: "Incentive drift, illustrative",
    advertised_apy: "not a live quote",
    canonical_url: "https://docs.aave.com/",
    evidence_urls: ["https://docs.aave.com/", "https://ethereum.org/en/defi/"],
    pool_id: "teaching-drift",
    submitter: "fixture",
    submitted_at: "2026-08-01T00:00:00Z",
    origin: "fixture",
  });
  await insertOpp(sql, {
    id: 9004,
    protocol: "Illustrative structure",
    chain: "Ethereum",
    asset: "USDC",
    label: "Recursive receipt loop",
    advertised_apy: "not a live quote",
    canonical_url: "https://ethereum.org/en/defi/",
    evidence_urls: ["https://ethereum.org/en/defi/", "https://docs.aave.com/"],
    pool_id: "teaching-recursive",
    submitter: "fixture",
    submitted_at: "2026-09-18T00:00:00Z",
    origin: "fixture",
  });
  await insertAssessment(sql, baseAssessment(9001, 1, 9001, "2026-09-20T12:00:00Z", "LENDING_INTEREST", ["LENDING_INTEREST"], "SUFFICIENT", "HIGH", "APPROVED", "POLICY_PASS", "Aave documents supplier yield as interest paid by borrowers. This fixture is not a live reading."));
  await insertAssessment(sql, baseAssessment(9002, 1, 9001, "2026-09-20T12:00:00Z", "STAKING_REWARDS", ["STAKING_REWARDS"], "SUFFICIENT", "HIGH", "APPROVED", "POLICY_PASS", "Lido documents stETH yield as Ethereum staking rewards. This fixture is not a live reading."));
  await insertAssessment(sql, baseAssessment(9003, 1, 9001, "2026-08-02T12:00:00Z", "LENDING_INTEREST", ["LENDING_INTEREST"], "SUFFICIENT", "HIGH", "APPROVED", "POLICY_PASS", "First pass of the teaching record: borrower interest only."));
  await insertAssessment(sql, baseAssessment(9003, 2, 9001, "2026-09-20T12:00:00Z", "TOKEN_SUBSIDY", ["TOKEN_SUBSIDY", "LENDING_INTEREST"], "SUFFICIENT", "MEDIUM", "REJECTED", "TOKEN_SUBSIDY_FORBIDDEN", "Second pass of the teaching record: token incentives became the primary source. Not a live protocol quote."));
  await insertAssessment(sql, baseAssessment(9004, 1, 9001, "2026-09-20T12:00:00Z", "RECURSIVE_YIELD", ["RECURSIVE_YIELD", "LENDING_INTEREST"], "SUFFICIENT", "HIGH", "REJECTED", "RECURSIVE_FORBIDDEN", "Illustrative loop that deposits its own receipt token. Not a named protocol balance."));
  const notes = [
    ["fixture", "Loaded the Aave WETH supply teaching record", "9001"],
    ["fixture", "Loaded the Lido stETH teaching record", "9002"],
    ["fixture", "Recorded yield drift on the incentive teaching record", "9003"],
    ["fixture", "Rejected the illustrative recursive loop", "9004"],
  ] as const;
  for (const [origin, summary, ref] of notes) {
    await sql`
      insert into yt_activity (kind, summary, ref_id, origin)
      values ('fixture', ${summary}, ${ref}, ${origin})
    `;
  }
  seeded = true;
}

function baseAssessment(
  opportunityId: number,
  revision: number,
  policyId: number,
  assessedAt: string,
  primary: AssessmentRecord["primary_component"],
  components: AssessmentRecord["components"],
  state: AssessmentRecord["evidence_state"],
  confidence: AssessmentRecord["confidence"],
  decision: AssessmentRecord["decision"],
  reason: string,
  rationale: string,
): AssessmentRecord {
  return {
    opportunity_id: opportunityId,
    revision,
    policy_id: policyId,
    assessed_at: assessedAt,
    evidence_state: state,
    primary_component: primary,
    components,
    risk_flags: [],
    confidence,
    rationale,
    sources_ok: 2,
    sources_failed: 0,
    decision,
    reason_code: reason,
    origin: "fixture",
  };
}

async function insertOpp(sql: Sql, row: OpportunityRecord): Promise<void> {
  await sql`
    insert into yt_opportunities (
      id, protocol, chain_name, asset, label, advertised_apy, canonical_url,
      evidence_urls, pool_id, submitter, submitted_at, origin
    ) values (
      ${row.id}, ${row.protocol}, ${row.chain}, ${row.asset}, ${row.label},
      ${row.advertised_apy}, ${row.canonical_url}, ${JSON.stringify(row.evidence_urls)}::jsonb,
      ${row.pool_id}, ${row.submitter}, ${row.submitted_at}, ${row.origin}
    ) on conflict (id) do nothing
  `;
}

async function insertAssessment(sql: Sql, row: AssessmentRecord): Promise<void> {
  await sql`
    insert into yt_assessments (
      opportunity_id, revision, policy_id, assessed_at, evidence_state, primary_component,
      components, risk_flags, confidence, rationale, sources_ok, sources_failed,
      decision, reason_code, origin
    ) values (
      ${row.opportunity_id}, ${row.revision}, ${row.policy_id}, ${row.assessed_at},
      ${row.evidence_state}, ${row.primary_component}, ${JSON.stringify(row.components)}::jsonb,
      ${JSON.stringify(row.risk_flags)}::jsonb, ${row.confidence}, ${row.rationale},
      ${row.sources_ok}, ${row.sources_failed}, ${row.decision}, ${row.reason_code}, ${row.origin}
    ) on conflict (opportunity_id, revision) do nothing
  `;
}

async function sqlClient(): Promise<Sql> {
  const sql = await getSql();
  await ensureSeed(sql);
  return sql;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") return JSON.parse(value) as T[];
  return [];
}

function mapOpp(row: Record<string, unknown>): OpportunityRecord {
  return {
    id: Number(row.id),
    protocol: String(row.protocol),
    chain: String(row.chain_name),
    asset: String(row.asset),
    label: String(row.label),
    advertised_apy: String(row.advertised_apy),
    canonical_url: String(row.canonical_url),
    evidence_urls: asArray<string>(row.evidence_urls),
    pool_id: String(row.pool_id ?? ""),
    submitter: String(row.submitter ?? ""),
    submitted_at: String(row.submitted_at),
    origin: row.origin === "chain" ? "chain" : "fixture",
  };
}

function mapPolicy(row: Record<string, unknown>): PolicyRecord {
  const parsed = typeof row.rules === "string" ? JSON.parse(row.rules) : (row.rules as PolicyRules);
  return {
    id: Number(row.id),
    name: String(row.name),
    creator: String(row.creator ?? ""),
    created_at: String(row.created_at),
    origin: row.origin === "chain" ? "chain" : "fixture",
    ...parsed,
  };
}

function mapAssessment(row: Record<string, unknown>): AssessmentRecord {
  return {
    opportunity_id: Number(row.opportunity_id),
    revision: Number(row.revision),
    policy_id: Number(row.policy_id),
    assessed_at: String(row.assessed_at),
    evidence_state: row.evidence_state as AssessmentRecord["evidence_state"],
    primary_component: row.primary_component as AssessmentRecord["primary_component"],
    components: asArray(row.components),
    risk_flags: asArray<string>(row.risk_flags),
    confidence: row.confidence as AssessmentRecord["confidence"],
    rationale: String(row.rationale),
    sources_ok: Number(row.sources_ok),
    sources_failed: Number(row.sources_failed),
    decision: row.decision as AssessmentRecord["decision"],
    reason_code: String(row.reason_code),
    origin: row.origin === "chain" ? "chain" : "fixture",
  };
}

export async function listOpportunities(limit = 20, offset = 0): Promise<OpportunityRecord[]> {
  const sql = await sqlClient();
  const safeLimit = Math.min(Math.max(Math.trunc(Number(limit)) || 1, 1), 50);
  const safeOffset = Math.max(Math.trunc(Number(offset)) || 0, 0);
  const rows = await sql<Record<string, unknown>>`
    select * from yt_opportunities order by id asc limit ${safeLimit} offset ${safeOffset}
  `;
  return rows.map(mapOpp);
}

export async function getOpportunity(id: number): Promise<OpportunityRecord | null> {
  const sql = await sqlClient();
  const rows = await sql<Record<string, unknown>>`select * from yt_opportunities where id = ${id}`;
  return rows[0] ? mapOpp(rows[0]) : null;
}

export async function listPolicies(): Promise<PolicyRecord[]> {
  const sql = await sqlClient();
  const rows = await sql<Record<string, unknown>>`select * from yt_policies order by id asc`;
  return rows.map(mapPolicy);
}

export async function getPolicy(id: number): Promise<PolicyRecord | null> {
  const sql = await sqlClient();
  const rows = await sql<Record<string, unknown>>`select * from yt_policies where id = ${id}`;
  return rows[0] ? mapPolicy(rows[0]) : null;
}

export async function listAssessments(opportunityId: number): Promise<AssessmentRecord[]> {
  const sql = await sqlClient();
  const rows = await sql<Record<string, unknown>>`
    select * from yt_assessments where opportunity_id = ${opportunityId} order by revision asc
  `;
  return rows.map(mapAssessment);
}

export async function getAssessment(opportunityId: number, revision: number): Promise<AssessmentRecord | null> {
  const sql = await sqlClient();
  const rows = await sql<Record<string, unknown>>`
    select * from yt_assessments where opportunity_id = ${opportunityId} and revision = ${revision}
  `;
  return rows[0] ? mapAssessment(rows[0]) : null;
}

export async function listSources(): Promise<SourceRecord[]> {
  const sql = await sqlClient();
  const rows = await sql<SourceRecord>`select host, label, enabled, origin from yt_sources order by host asc`;
  return rows.map((row) => ({ ...row, enabled: Boolean(row.enabled), origin: row.origin === "chain" ? "chain" : "fixture" }));
}

export async function upsertChainSources(rows: Array<{ host: string; label: string; enabled: boolean }>): Promise<void> {
  const sql = await sqlClient();
  for (const row of rows) {
    await sql`
      insert into yt_sources (host, label, enabled, origin)
      values (${row.host}, ${row.label}, ${row.enabled}, 'chain')
      on conflict (host) do update set
        label = excluded.label,
        enabled = excluded.enabled,
        origin = 'chain'
    `;
  }
}

export async function listActivity(limit = 30): Promise<ActivityRecord[]> {
  const sql = await sqlClient();
  const rows = await sql<ActivityRecord>`
    select id, kind, summary, ref_id, origin, created_at::text as created_at
    from yt_activity order by id desc limit ${Math.min(Math.max(limit, 1), 100)}
  `;
  return rows.map((row) => ({ ...row, id: Number(row.id), origin: row.origin === "chain" ? "chain" : "fixture" }));
}

export async function explainGate(opportunityId: number, policyId: number) {
  const [assessment] = (await listAssessments(opportunityId)).slice(-1);
  const policy = await getPolicy(policyId);
  if (!assessment || !policy) return null;
  return {
    assessment,
    policy,
    gate: gateFromStored(assessment, policy, new Date().toISOString()),
    note: "Local recomputation of the deterministic policy. Not a new GenLayer consensus result.",
  };
}

export async function readiness(): Promise<{ database: "ok" | "down"; error?: string }> {
  try {
    const sql = await sqlClient();
    await sql`select 1 as ok`;
    return { database: "ok" };
  } catch (error) {
    return { database: "down", error: error instanceof Error ? error.message : "database unavailable" };
  }
}

export async function upsertChainOpportunity(row: OpportunityRecord): Promise<boolean> {
  const sql = await sqlClient();
  const existing = await sql<{ id: number }>`select id from yt_opportunities where id = ${row.id}`;
  await sql`
    insert into yt_opportunities (
      id, protocol, chain_name, asset, label, advertised_apy, canonical_url,
      evidence_urls, pool_id, submitter, submitted_at, origin
    ) values (
      ${row.id}, ${row.protocol}, ${row.chain}, ${row.asset}, ${row.label},
      ${row.advertised_apy}, ${row.canonical_url}, ${JSON.stringify(row.evidence_urls)}::jsonb,
      ${row.pool_id}, ${row.submitter}, ${row.submitted_at}, 'chain'
    )
    on conflict (id) do update set
      protocol = excluded.protocol,
      chain_name = excluded.chain_name,
      asset = excluded.asset,
      label = excluded.label,
      advertised_apy = excluded.advertised_apy,
      canonical_url = excluded.canonical_url,
      evidence_urls = excluded.evidence_urls,
      pool_id = excluded.pool_id,
      submitter = excluded.submitter,
      submitted_at = excluded.submitted_at,
      origin = 'chain'
    where yt_opportunities.origin <> 'fixture'
  `;
  return existing.length === 0;
}

export async function upsertChainAssessment(row: AssessmentRecord): Promise<boolean> {
  const sql = await sqlClient();
  const existing = await sql<{ revision: number }>`
    select revision from yt_assessments where opportunity_id = ${row.opportunity_id} and revision = ${row.revision}
  `;
  await sql`
    insert into yt_assessments (
      opportunity_id, revision, policy_id, assessed_at, evidence_state, primary_component,
      components, risk_flags, confidence, rationale, sources_ok, sources_failed,
      decision, reason_code, origin
    ) values (
      ${row.opportunity_id}, ${row.revision}, ${row.policy_id}, ${row.assessed_at},
      ${row.evidence_state}, ${row.primary_component}, ${JSON.stringify(row.components)}::jsonb,
      ${JSON.stringify(row.risk_flags)}::jsonb, ${row.confidence}, ${row.rationale},
      ${row.sources_ok}, ${row.sources_failed}, ${row.decision}, ${row.reason_code}, 'chain'
    )
    on conflict (opportunity_id, revision) do update set
      decision = excluded.decision,
      reason_code = excluded.reason_code,
      rationale = excluded.rationale,
      origin = 'chain'
    where yt_assessments.origin <> 'fixture'
  `;
  return existing.length === 0;
}

export async function upsertChainPolicy(row: PolicyRecord): Promise<boolean> {
  const sql = await sqlClient();
  const existing = await sql<{ id: number }>`select id from yt_policies where id = ${row.id}`;
  const rules: PolicyRules = {
    allow_token_subsidy: row.allow_token_subsidy,
    allow_leverage: row.allow_leverage,
    allow_recursive: row.allow_recursive,
    allow_points: row.allow_points,
    allow_counterparty: row.allow_counterparty,
    low_confidence_requires_review: row.low_confidence_requires_review,
    conflicting_requires_review: row.conflicting_requires_review,
    max_age_seconds: row.max_age_seconds,
  };
  await sql`
    insert into yt_policies (id, name, rules, creator, created_at, origin)
    values (${row.id}, ${row.name}, ${JSON.stringify(rules)}::jsonb, ${row.creator}, ${row.created_at}, 'chain')
    on conflict (id) do update set
      name = excluded.name,
      rules = excluded.rules,
      creator = excluded.creator,
      created_at = excluded.created_at,
      origin = 'chain'
    where yt_policies.origin <> 'fixture'
  `;
  return existing.length === 0;
}

export async function backfillChainActivity(): Promise<void> {
  const sql = await sqlClient();
  await sql`
    insert into yt_activity (kind, summary, ref_id, origin)
    select 'policy',
      'Indexed policy “' || name || '” from the contract',
      'policy:' || id::text,
      'chain'
    from yt_policies p
    where p.origin = 'chain'
      and not exists (
        select 1 from yt_activity a
        where a.origin = 'chain' and a.kind = 'policy' and a.ref_id = 'policy:' || p.id::text
      )
  `;
  await sql`
    insert into yt_activity (kind, summary, ref_id, origin)
    select 'opportunity',
      'Indexed “' || label || '” from the contract',
      id::text,
      'chain'
    from yt_opportunities o
    where o.origin = 'chain'
      and not exists (
        select 1 from yt_activity a
        where a.origin = 'chain' and a.kind = 'opportunity' and a.ref_id = o.id::text
      )
  `;
  await sql`
    insert into yt_activity (kind, summary, ref_id, origin)
    select 'assessment:' || a.revision::text,
      'Indexed assessment ' || a.revision::text || ' of opportunity ' || a.opportunity_id::text || ' as ' || a.decision,
      a.opportunity_id::text,
      'chain'
    from yt_assessments a
    where a.origin = 'chain'
      and not exists (
        select 1 from yt_activity act
        where act.origin = 'chain'
          and act.kind = 'assessment:' || a.revision::text
          and act.ref_id = a.opportunity_id::text
      )
  `;
}

export async function readSync(): Promise<{ policy_cursor: number; opportunity_cursor: number; last_error: string }> {
  const sql = await sqlClient();
  const rows = await sql<{ policy_cursor: number; opportunity_cursor: number; last_error: string }>`
    select policy_cursor, opportunity_cursor, last_error from yt_sync where id = 1
  `;
  return rows[0] ?? { policy_cursor: 0, opportunity_cursor: 0, last_error: "" };
}

export async function writeSync(policyCursor: number, opportunityCursor: number, lastError: string, address: string): Promise<void> {
  const sql = await sqlClient();
  await sql`
    update yt_sync
    set policy_cursor = ${policyCursor},
        opportunity_cursor = ${opportunityCursor},
        last_error = ${lastError},
        contract_address = ${address},
        updated_at = now()
    where id = 1
  `;
}

