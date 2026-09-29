import { serverConfig } from "./config.ts";
import { syncFromReader, type ChainReader, type SyncStore } from "./indexer.ts";
import type { AssessmentRecord, OpportunityRecord, PolicyRecord, YieldComponent, EvidenceState, Confidence, Decision } from "./types.ts";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || value === "null") return null;
  if (typeof value === "string") {
    if (value === "null" || value === "") return null;
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  }
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function num(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error("chain id was not an integer");
  return parsed;
}

function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  throw new Error("chain boolean was not a boolean");
}

// The public Studio RPC allows ~500 `gen_call` requests per hour, shared by every
// consumer behind the same endpoint. One catch-up costs 7 (2 counts + one read per
// policy and per opportunity + history + list_sources). A 5-minute cadence spends
// ~84 calls/hour — about 17% of the budget, leaving room for the application, for
// operators, and for independent verification. Anything faster monopolises a shared
// public limit and degrades the indexer for everyone.
//
// Consequence, stated rather than hidden: a freshly finalized assessment can take up
// to 5 minutes to appear in the index. Supplying a dedicated RPC endpoint removes the
// shared cap and allows a much shorter interval; that is a deployment decision, not a
// code change.
const SYNC_INTERVAL_MS = 300_000;
// A rate-limited RPC must not be retried on the next request. Retrying without
// backoff turns a transient hourly cap into a self-sustaining outage, because
// every page load burns more of the window that has to recover first.
const BACKOFF_MS = 120_000;
const RATE_LIMITED = /rate limit|\b429\b/i;

const SYNC_TIMEOUT_MS = 8_000;
let inflight: Promise<{ skipped: boolean; inserted?: number; error?: string }> | null = null;
let lastSuccessAt = 0;
let backoffUntil = 0;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("chain sync timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function runCatchUp(): Promise<{ skipped: boolean; inserted?: number; error?: string }> {
  if (!serverConfig.contractAddress) return { skipped: true };
  const address = serverConfig.contractAddress;
  if (!ADDRESS.test(address)) {
    return { skipped: false, error: "contract address is not a 20-byte hex address" };
  }
  const { createClient } = await import("genlayer-js");
  const { studionet } = await import("genlayer-js/chains");
  const repo = await import("./repo.server.ts");
  const client = createClient({ chain: studionet, endpoint: serverConfig.rpcUrl });
  const target = address as `0x${string}`;

  async function view(name: string, args: string[] = []): Promise<unknown> {
    return client.readContract({ address: target, functionName: name, args });
  }

  const reader: ChainReader = {
    async policyCount() {
      return num(await view("get_policy_count"));
    },
    async opportunityCount() {
      return num(await view("get_opportunity_count"));
    },
    async getPolicy(id) {
      const data = asRecord(await view("get_policy", [String(id)]));
      if (!data) return null;
      const row: PolicyRecord = {
        id: num(data.id),
        name: String(data.name ?? ""),
        creator: String(data.creator ?? ""),
        created_at: String(data.created_at ?? ""),
        origin: "chain",
        allow_token_subsidy: bool(data.allow_token_subsidy),
        allow_leverage: bool(data.allow_leverage),
        allow_recursive: bool(data.allow_recursive),
        allow_points: bool(data.allow_points),
        allow_counterparty: bool(data.allow_counterparty),
        low_confidence_requires_review: bool(data.low_confidence_requires_review),
        conflicting_requires_review: bool(data.conflicting_requires_review),
        max_age_seconds: num(data.max_age_seconds),
      };
      return row;
    },
    async getOpportunity(id) {
      const data = asRecord(await view("get_opportunity", [String(id)]));
      if (!data) return null;
      const urls = asList(data.evidence_urls).map(String);
      const row: OpportunityRecord = {
        id: num(data.id),
        protocol: String(data.protocol ?? ""),
        chain: String(data.chain ?? ""),
        asset: String(data.asset ?? ""),
        label: String(data.label ?? ""),
        advertised_apy: String(data.advertised_apy ?? ""),
        canonical_url: String(data.canonical_url ?? ""),
        evidence_urls: urls,
        pool_id: String(data.pool_id ?? ""),
        submitter: String(data.submitter ?? ""),
        submitted_at: String(data.submitted_at ?? ""),
        origin: "chain",
      };
      return row;
    },
    async getHistory(id) {
      const rows = asList(await view("get_history", [String(id)]));
      return rows.map((item) => {
        const data = asRecord(item);
        if (!data) throw new Error(`bad history for ${id}`);
        const assessment: AssessmentRecord = {
          opportunity_id: num(data.opportunity_id),
          revision: num(data.revision),
          policy_id: num(data.policy_id),
          assessed_at: String(data.assessed_at ?? ""),
          evidence_state: String(data.evidence_state) as EvidenceState,
          primary_component: String(data.primary_component) as YieldComponent,
          components: asList(data.components).map(String) as YieldComponent[],
          risk_flags: asList(data.risk_flags).map(String),
          confidence: String(data.confidence) as Confidence,
          rationale: String(data.rationale ?? ""),
          sources_ok: num(data.sources_ok),
          sources_failed: num(data.sources_failed),
          decision: String(data.decision) as Decision,
          reason_code: String(data.reason_code ?? ""),
          origin: "chain",
        };
        return assessment;
      });
    },
  };

  const store: SyncStore = {
    read: () => repo.readSync(),
    write: async (policyCursor, opportunityCursor, lastError) => {
      await repo.writeSync(policyCursor, opportunityCursor, lastError, address);
      if (!lastError) await repo.backfillChainActivity();
    },
    savePolicy: (row) => repo.upsertChainPolicy(row),
    saveOpportunity: (row) => repo.upsertChainOpportunity(row),
    saveAssessment: (row) => repo.upsertChainAssessment(row),
  };

  try {
    const [result, listed] = await Promise.all([syncFromReader(reader, store), view("list_sources").then(asList)]);
    const sources = listed.map((item) => {
      const data = asRecord(item);
      if (!data || typeof data.host !== "string") throw new Error("bad source row");
      return {
        host: data.host,
        label: String(data.label ?? data.host),
        enabled: data.enabled === true,
      };
    });
    await repo.upsertChainSources(sources);
    return { skipped: false, inserted: result.inserted };
  } catch (error) {
    return { skipped: false, error: error instanceof Error ? error.message : "sync failed" };
  }
}

export async function catchUpFromChain(options?: {
  wait?: boolean;
}): Promise<{ skipped: boolean; inserted?: number; error?: string }> {
  if (!serverConfig.contractAddress) return { skipped: true };
  const wait = options?.wait !== false;
  if (Date.now() < backoffUntil) return { skipped: true };
  const fresh = lastSuccessAt > 0 && Date.now() - lastSuccessAt < SYNC_INTERVAL_MS;
  if (fresh) return { skipped: true };
  const pending = startCatchUp();
  if (!wait) {
    const repo = await import("./repo.server.ts");
    const state = await repo.readSync();
    const indexed = state.last_error === "" && (state.policy_cursor > 0 || state.opportunity_cursor > 0);
    if (indexed || lastSuccessAt > 0) return { skipped: false };
  }
  try {
    return await withTimeout(pending, SYNC_TIMEOUT_MS);
  } catch {
    return { skipped: false };
  }
}

function startCatchUp() {
  if (!inflight) {
    inflight = runCatchUp()
      .then((result) => {
        if (!result.error) lastSuccessAt = Date.now();
        // Backpressure, not divergence: the cursor did not move because there was
        // nothing to move, so pause instead of hammering an exhausted endpoint.
        // The error is still returned to the caller and still recorded in yt_sync.
        else if (result.error && RATE_LIMITED.test(result.error)) backoffUntil = Date.now() + BACKOFF_MS;
        return result;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
