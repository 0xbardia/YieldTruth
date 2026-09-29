#!/usr/bin/env node
// Read-only YieldTruth chain verifier. Never signs, never holds a key.
// Enforces the public Studio rate limit (30 req/min) and caches output so a
// re-run costs nothing. Usage:
//   node scripts/chain-verify.mjs [--fresh] [--tx 0xhash ...]
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = Object.fromEntries(
  readFileSync(ROOT + "/.env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const ADDRESS = env.GENLAYER_CONTRACT_ADDRESS;
const RPC = env.GENLAYER_RPC_URL;
const CACHE = ROOT + "/report/chain-verify.json";
const GAP_MS = 2600; // stay under 30 req/min
const local = createHash("sha256")
  .update(readFileSync(ROOT + "/contracts/yield_truth.py"))
  .digest("hex");

const argv = process.argv.slice(2);
const fresh = argv.includes("--fresh");
const txs = argv.reduce((acc, a, i) => (argv[i - 1] === "--tx" ? [...acc, a] : acc), []);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The 20 readonly methods declared by the deployed schema.
const READS = [
  ["schema_version", []],
  ["get_owner", []],
  ["classification_charter", []],
  ["equivalence_principle", []],
  ["get_limits", []],
  ["source_count", []],
  ["get_source", ["aave.com"]],
  ["list_sources", []],
  ["get_policy_count", []],
  ["get_policy", ["1"]],
  ["list_policies", []],
  ["get_opportunity_count", []],
  ["get_opportunity", ["1"]],
  ["list_opportunities", []],
  ["get_assessment_count", []],
  ["get_assessment", ["1", "1"]],
  ["get_latest_assessment", ["1"]],
  ["get_history", ["1"]],
  ["get_latest_decision", ["1"]],
  ["satisfies", ["1", "1"]],
];

const summarise = (v) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (typeof v === "string" && v.length <= 220) return v;
  try {
    const p = JSON.parse(v);
    const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
    if (Array.isArray(p)) return JSON.stringify(p.slice(0, 3)).slice(0, 220) + (p.length > 3 ? ` …(${p.length})` : "");
    if (p && typeof p === "object") {
      const picked = pick(p, ["schema_version", "id", "revision", "decision", "reason_code", "stored_decision", "has_assessment", "stale", "evidence_state", "primary_component", "confidence", "sources_ok", "sources_failed", "policy_id", "opportunity_id", "name", "max_age_seconds", "low_confidence_requires_review", "conflicting_requires_review", "allow_token_subsidy", "allow_leverage", "allow_recursive", "allow_points", "allow_counterparty"]);
      // Never let the summary hide a successful read: fall back to the raw prefix.
      return Object.keys(picked).length ? JSON.stringify(picked) : s.slice(0, 260);
    }
  } catch {
    // Not JSON (e.g. a long charter string): fall through to the raw prefix.
  }
  return s.slice(0, 120) + "…";
};

async function main() {
  if (existsSync(CACHE) && !fresh && txs.length === 0) {
    console.log(JSON.stringify(JSON.parse(readFileSync(CACHE, "utf8")), null, 2));
    return;
  }
  const client = createClient({ chain: studionet, endpoint: RPC });
  const out = {
    verified_at: new Date().toISOString(),
    network: studionet.name,
    chain_id: studionet.id,
    contract: ADDRESS,
    rpc: RPC,
    local_source_sha256: local,
    reads: [],
    tx: {},
  };
  await sleep(GAP_MS);
  out.chain_id_rpc = String(await client.request({ method: "eth_chainId" }));

  for (const [functionName, args] of READS) {
    await sleep(GAP_MS);
    try {
      const value = await client.readContract({ address: ADDRESS, functionName, args });
      out.reads.push({ method: functionName, args, ok: true, value: summarise(value) });
    } catch (error) {
      out.reads.push({ method: functionName, args, ok: false, error: String(error.message ?? error).slice(0, 200) });
    }
  }

  // Deployed-source freeze proof.
  await sleep(GAP_MS);
  try {
    // genlayer-js decodes the base64 payload and returns the source text directly.
    const text = await client.getContractCode(ADDRESS);
    out.deployed_source_sha256 = createHash("sha256").update(text).digest("hex");
    out.deployed_source_bytes = Buffer.byteLength(text);
    out.local_source_bytes = Buffer.byteLength(readFileSync(ROOT + "/contracts/yield_truth.py"));
  } catch (error) {
    out.deployed_source_error = String(error.message ?? error).slice(0, 200);
  }
  out.source_match = out.deployed_source_sha256 === local;

  for (const hash of txs) {
    await sleep(GAP_MS);
    try {
      const t = await client.getTransaction({ hash });
      out.tx[hash] = {
        status: t.status,
        status_name: t.statusName ?? null,
        result: t.result ?? t.result_name ?? t.resultName ?? null,
        tx_execution_result: t.txExecutionResultName ?? t.tx_execution_result ?? null,
        leader_receipts: (t.consensus_data?.leader_receipt ?? []).map((r) => ({
          vote: r.vote ?? null,
          result: r.result ?? r.result_name ?? null,
          execution: r.execution_result ?? null,
        })),
        validator_receipts: (t.consensus_data?.validator_receipts ?? []).map((r) => ({
          vote: r.vote ?? null,
          result: r.result ?? r.result_name ?? null,
        })),
      };
    } catch (error) {
      out.tx[hash] = { error: String(error.message ?? error).slice(0, 200) };
    }
  }

  const passed = out.reads.filter((r) => r.ok).length;
  out.read_methods = { passed, total: READS.length, failed: READS.length - passed };
  writeFileSync(CACHE, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ...out, reads: undefined, cache: CACHE, read_methods: out.read_methods, source_match: out.source_match, local_source_sha256: out.local_source_sha256, deployed_source_sha256: out.deployed_source_sha256 }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
