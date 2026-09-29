# YieldTruth V1 — Final Certification

Date: 2026-09-29 UTC
Target: https://yieldtruth.bydx.fun
Contract: `0x23C029E1aB24f74b355EF05f7b540296BEdD6279` on GenLayer Studionet, chain id 61999

---

## STATUS

**PARTIAL** — 24 of 25 release gates PASS from executed evidence. One gate is not closed and
cannot be closed by me: **a real wallet-signed transaction from the production UI requires a human
to approve a signature in a browser wallet.** Everything up to that exact moment is verified.

This is a materially different starting position from the previous report. Two production defects
were found and fixed at the root, and one claimed-pass was false:

1. **Production was down.** `https://yieldtruth.bydx.fun` returned **502 Bad Gateway** for the
   entire time this certification began. The `yieldtruth` PM2 app had been dropped from the PM2
   registry and nothing was listening on `127.0.0.1:4330`. The previous report's claim that the
   "YieldTruth PM2 process online" was **not true at the time it was written**. Fixed, and the
   restart path is now a real, idempotent `startup.sh` plus a saved PM2 dump.
2. **The API rate limit was fully bypassable.** A rotating client-supplied `X-Forwarded-For`
   header defeated it completely: 130 consecutive requests returned 130 × 200 and 0 × 429
   against a 120/min limit. Fixed and re-verified (now 120 × 200, 10 × 429).
3. **The chain indexer could exhaust the shared public RPC and sustain the outage**, because a
   rate-limited response was retried on the very next request. Fixed with a bounded cadence and a
   failure backoff; self-recovery was observed end to end.

---

## 1. REAL WALLET PATH

The full path was traced in source and then driven in a real production browser. It is correct.

**Path as implemented**

`src/routes/opportunities/$id/index.tsx` → `WriteBox` → `src/lib/yieldtruth/chain-write.ts` →
`window.ethereum` → `genlayer-js` `createClient` → Studionet.

| Requirement | Verdict | Evidence |
|---|---|---|
| Connected account propagated correctly | PASS | `chain-write.ts:16` takes `accounts[0]` from `eth_requestAccounts` and passes it as `account` to `createClient`. |
| Correct Studionet network selected | PASS | `wallet.tsx` defines chain id 61999 from `publicConfig.chainId`; `public-config.ts:8` pins `STUDIO_CHAIN_ID = 61999`. Live `eth_chainId` returns `0xf22f`. |
| Signer/provider is the real browser wallet | PASS | `provider: ethereum` — the live EIP-1193 object. `genlayer-js` routes `eth_sendTransaction` to the provider when `account` is an address string, so the wallet signs. |
| Backend does not sign | PASS | `chain-sync.server.ts:69` builds its client with **no `account` and no `provider`**. The only other `createClient` call is in `chain-write.ts`, browser-only. |
| No private key server-side | PASS | A grep for `PRIVATE_KEY|private_key|mnemonic|SEED_PHRASE` across `src/`, `server/`, `scripts/` matches only an in-process test keypair in `gate-identity.test.ts`. The secret scan found 0 hits. |
| Arguments match the contract ABI | PASS | `assess(opportunity_id: str, policy_id: str)` in `contracts/yield_truth.py:767`. The UI sends `[String(opportunity.id), String(policyId)]` = `["1", "1"]`. |
| `assess(1,1)` encoded correctly | PASS | Live browser confirmed the policy selector resolves to id `1` ("Treasury desk") on `/opportunities/1`, so the write is exactly `assess("1","1")`. |
| pending / submitted / finalized / error states | PASS | `Phase` is a literal union in `write-box.tsx`; the button disables during `wallet` and `consensus`. |
| Tx hash alone is not treated as success | PASS | `chain-write.ts:58-82` polls `waitForTransactionReceipt` for `FINALIZED`, then independently requires an agreed consensus result **and** no leader `execution_result !== "SUCCESS"` **and** `txExecutionResultName === FINISHED_WITH_RETURN`, else it throws. |
| Finality detected correctly | PASS | `TransactionStatus.FINALIZED` with 3 s polling and 100 retries. |
| Canonical state re-read after finality | PASS | `write-box.tsx:31-38` invalidates the router on `final`. |

**Where the path stops.** In a headless browser `window.ethereum` is absent, so the run terminates
with the honest message `Status: failed — No browser wallet is available.` That is the correct
fail-closed behaviour and is the exact boundary at which a human signature is required. Screenshot:
`screenshots/writebox-nowallet.png`.

I did **not** install a wallet of my own, generate a key, or self-sign. That would have produced a
transaction hash while proving nothing about the user-facing path, and it would have manufactured
the evidence the task explicitly forbids manufacturing.

---

## 2. REAL FRONTEND TRANSACTION

**Not executed — awaiting one human signature.**

`assess(1, 1)` is valid in current state: opportunity 1 and policy 1 both exist,
`latest_revision[1] == 1 < MAX_REVISIONS (20)`, so the call will produce revision 2.

One honest expectation to set: `assess` renders the two registered evidence URLs and asks the
validators to classify. If either page fails to render, the contract's `_safe_classification`
path yields `INSUFFICIENT` / `LOW`, and Policy 1 has `low_confidence_requires_review: true`, so
`REVIEW_REQUIRED` is a legitimate and correct outcome. The gate that must close is that a real
transaction reaches a real final consensus result — not that the verdict is `APPROVED`.

See **READY_FOR_SIGNATURE** at the end of this report for the exact action.

---

## 3. CANONICAL STATE VERIFICATION

Contract, backend, and frontend were compared independently. All three converge.

| Layer | Evidence | Result |
|---|---|---|
| Contract | 20/20 read methods via `genlayer-js` against the deployed address | **20/20 PASS** |
| Backend | `yt_assessments` row for opportunity 1 revision 1: `APPROVED/POLICY_PASS/MEDIUM/LENDING_INTEREST`, `assessed_at 2026-09-26T08:39:40Z` | matches contract |
| Frontend | Production browser rendered `Approved`, `SUFFICIENT`, `MEDIUM`, `LENDING_INTEREST`, `2 ok / 0 failed`, badged **On-chain index** | matches contract |

**Indexer**

| Check | Result |
|---|---|
| Cursors | policy 2 / opportunity 1, equal to `get_policy_count()` and `get_opportunity_count()` |
| Chain-origin row counts | policies 2, opportunities 1, assessments 1, sources 14 — identical to the on-chain counts |
| Duplicate activity | `group by kind, ref_id, origin having count(*) > 1` → **0 rows** |
| Stale assessment | none; cursor matches the chain |
| Lost events/state | none; `assessment_count` 1 on chain and 1 in the database |
| Manual refresh dependency | none; every read goes through the server-side indexer |
| Restart-safe persistence | **verified — see below** |

**Restart recovery.** Snapshotted the full chain-origin state and the cursor, ran
`pm2 restart yieldtruth`, then re-read both:

- Canonical rows **byte-identical** before and after.
- Cursor **identical** before and after: `2/1/`, no reset, no error.
- `yt_activity` row count unchanged at 8 — the restart did not re-ingest anything.

Readiness after restart: `{"status":"ready","database":"ok","migrations":"applied","chain":"ok",
"lag":{"policy_cursor":2,"opportunity_cursor":1,"last_error":""}}`.

The full loop is therefore closed for all **read** traffic:
UI → index → chain → index → UI. The **write** leg is closed up to the signature boundary in §2.

---

## 4. POLICY INVARIANT

**The model controls classification only. Contract code controls the verdict.** This is enforced
structurally, not by convention.

**How the verdict is computed.** `assess()` runs `classify()` under `gl.vm.run_nondet`, then
parses the agreed output and passes it through `_coerce_model` a **second** time before storage
(`contracts/yield_truth.py:834`). Only then does it call
`evaluate_policy(classification, policy, assessed_at, assessed_at)` (line 849). The model never
sees or influences the policy object, and the stored `decision` is always
`verdict["decision"]` — a return value of pure Python.

**Why the model cannot force `APPROVED`.** `_coerce_model` admits exactly seven keys
(`schema_version`, `evidence_state`, `primary_component`, `components`, `risk_flags`,
`confidence`, `rationale`). **There is no verdict key to admit.** Any extra key returns
`_safe_classification`, which fails closed to `INSUFFICIENT` / `UNKNOWN` / `LOW` /
`THIN_EVIDENCE` — a state that can never approve. `sources_ok` and `sources_failed` are counted by
contract code, not by the model, and the re-coerce strips any model-supplied copy. Equivalence is
computed in Python by `_classifications_match`, never voted on by an LLM.

**Why `LENDING_INTEREST` + `MEDIUM` yields `APPROVED` / `POLICY_PASS` under Policy 1.**

Policy 1, read from the chain: `allow_token_subsidy false`, `allow_leverage false`,
`allow_recursive false`, `allow_points false`, `allow_counterparty false`,
`low_confidence_requires_review true`, `conflicting_requires_review true`,
`max_age_seconds 604800`.

Stored classification: `evidence_state SUFFICIENT`, `primary_component LENDING_INTEREST`,
`components [LENDING_INTEREST]`, `confidence MEDIUM`, `sources_ok 2`, `sources_failed 0`.

Walking `evaluate_policy` in order, every gate **passes**:

1. Not `INSUFFICIENT`, primary is not `UNKNOWN`, no `UNKNOWN` in components → pass.
2. State is not `CONFLICTING` → the conflict-review gate does not fire.
3. **Confidence is `MEDIUM`, not `LOW`.** Policy 1 reviews on *low* confidence, so the
   `LOW_CONFIDENCE` gate does not fire. This is the decisive step.
4. Age 0 s < 604800 s → the staleness gate does not fire.
5–9. `LENDING_INTEREST` is in none of the five gated sets
   (`TOKEN_SUBSIDY`, `LEVERAGED_YIELD`, `RECURSIVE_YIELD`, `POINTS_SPECULATION`,
   `COUNTERPARTY_DEPENDENT`) → no rejection and no counterparty review.
10. State **is** `SUFFICIENT` → the final `EVIDENCE_NOT_SUFFICIENT` gate does not fire.
11. Falls through to `return {"decision": "APPROVED", "reason_code": "POLICY_PASS"}`.

In short: the yield is ordinary borrower interest, the policy forbids only subsidy, leverage,
recursive, points, and counterparty exposure, the evidence was sufficient, and medium confidence
does not trip this policy's review bar. `satisfies(1,1)` independently recomputes the same verdict
from stored state and returns `APPROVED` / `POLICY_PASS` / `stale false`, confirming the stored
decision is reproducible rather than incidental.

**New tests added this session** (`src/lib/yieldtruth/policy.test.ts`), 8/8 passing:

- `LENDING_INTEREST + MEDIUM against Policy 1 is APPROVED / POLICY_PASS` — pins the exact deployed
  Policy 1 rules and the exact stored revision-1 classification.
- `every gate that could have blocked revision 1 is load-bearing` — flips each of the nine fields
  in turn and asserts the verdict changes to the expected reason code, plus the exact 604800-second
  staleness boundary (the boundary passes, one second past it does not).
- `a model-supplied verdict key cannot reach the decision` — a classification carrying
  `decision`/`verdict`/`reason_code` alongside a forbidden component still returns
  `REJECTED / TOKEN_SUBSIDY_FORBIDDEN`.

Contract-side Direct Mode coverage already existed and is unchanged: 14 tests in
`tests/direct/test_yield_truth.py`, including `test_lending_is_approved_and_subsidy_is_rejected`,
`test_prompt_injection_cannot_approve`, `test_malformed_model_outputs_fail_closed`, and
`test_validator_compares_fields_in_code`. **`gltest` is not installed in this workspace, so those
14 were not re-executed here.** They were last executed against this exact contract source, and the
deployed source hash is unchanged.

---

## 5. DEPENDENCY ADVISORY TRIAGE

`npm audit` reports **22 moderate, 0 high, 0 critical**. All 22 trace back to **two leaf
advisories** — there is no second hidden issue in the set.

### Leaf advisory A — `uuid` (GHSA-w5hq-g745-h8pq)

- **Advisory**: missing buffer bounds check in `v3`/`v5`/`v6` when a caller-supplied `buf` is
  passed. Affected range `< 11.1.1`. Installed: `8.3.2` hoisted, `9.0.1` nested under five
  `@metamask/*` packages.
- **Dependency path**: `@rainbow-me/rainbowkit` / `wagmi` → `@wagmi/connectors` →
  `@metamask/sdk` → `@metamask/sdk-communication-layer` → `uuid`; and `@metamask/utils` → `uuid`.
  This one root propagates to 20 of the 22 findings.
- **Runtime reachability**: **the vulnerable functions are never called.** A search across the
  entire `node_modules` tree for any import of `v3`, `v5`, or `v6` from `uuid` returned **zero
  matches**. The browser build of `@metamask/sdk-communication-layer` imports exactly
  `{ validate, v4 }`. `@metamask/utils` calls only `uuid.v4()`, and only inside `dist/fs.*`, a
  Node-only test-sandbox helper excluded from the browser build.
- **Exploitability in YieldTruth**: **none.** The advisory requires a caller to pass a buffer to
  `v3`/`v5`/`v6`. No such call exists in any reachable path.
- **Fix availability / why an upgrade is unsafe**: the fix is `>= 11.1.1`. Forcing that is a
  **three-major-version jump** (8 → 11) applied to `@metamask/*`, which declare `uuid@^8.3.2`.
  uuid v9+ changed the module surface and Node requirements. This is blocked by upstream and would
  be expected to break `@metamask/utils` and the SDK at runtime.
- **Mitigation**: none required; the vulnerable code path is absent. Recorded here rather than
  suppressed.

### Leaf advisory B — `decode-uri-component` (GHSA-vcc3-ghjq-m6fr)

- **Advisory**: denial of service via exponential decoding of malformed percent-encoded input.
  Affected `<= 0.4.2`. Installed: `0.2.2`.
- **Dependency path**: `query-string@7.1.3` → `decode-uri-component@0.2.2`, reached through
  `@walletconnect/utils` → `@walletconnect/*` → `@reown/appkit*` → `@wagmi/connectors` → `wagmi` →
  `@rainbow-me/rainbowkit`. This is the remaining 2 of the 22 findings.
- **Runtime reachability**: **not present in any shipped artifact.** A search of the entire
  `.vercel/output/` tree — both the client static bundle and the serverless function — for
  `strict-uri-encode`, `strictUriEncode`, and the `(%[a-f0-9]{2})` split regex used by the
  vulnerable version returned **no matches**. The library is tree-shaken out of the build.
- **Exploitability in YieldTruth**: **none.** Additionally, the entire WalletConnect branch is
  dead in production: `VITE_WALLETCONNECT_PROJECT_ID` is empty, so `wallet.tsx` never calls
  `getDefaultConfig` and the wagmi config carries only `connectors: [injected()]`.
- **Fix availability / why an upgrade is unsafe**: `decode-uri-component@0.5.0` exists and is
  outside the advisory range, but `query-string@7.1.3` declares `^0.2.0`, which 0.5.0 does not
  satisfy. Forcing it would install a version outside the consumer's declared semver range purely
  to fix a library that is not in the output. The correct fix is upstream, in `@reown/appkit` /
  `@walletconnect/utils`.
- **Mitigation**: none required.

### Classification summary

| # | Finding group | Class | Disposition |
|---|---|---|---|
| 20 | `uuid` chain (wagmi, @wagmi/connectors, @metamask/*, @gemini-wallet/core) | **false / non-applicable** — vulnerable functions never imported | retained, documented; upgrade unsafe (8 → 11 across `@metamask/*`) |
| 2 | `decode-uri-component` / `query-string` via WalletConnect | **not production-runtime reachable** — absent from every shipped artifact; WalletConnect branch disabled | retained, documented; override would violate the consumer's semver range for zero benefit |

No `force`-upgrade was run. No advisory output was hidden, suppressed, or filtered —
`npm audit --json` is reproduced in full above via the per-package enumeration, and the
`--audit-level=high` gate exits 0.

**Goal check: zero unresolved Moderate findings that are realistically exploitable in the
production application — met, with proof rather than assertion.** Both leaves are unreachable on
the deployed code path; one is additionally absent from the build output.

Compatibility preserved and verified in the tree: wagmi 2.19.5, viem 2.56.9,
RainbowKit 2.2.11, genlayer-js 1.1.8, `@x402/evm` 2.27.0. The lockfile was **not** regenerated
(`e5481f90…` unchanged from the baseline), which is the point: no dependency changed, so there was
nothing to re-verify for compatibility drift.

---

## 6. LOW SECURITY FINDINGS

Both were re-examined rather than carried forward. Neither is still "accepted because it was
accepted before".

**YT-003 (in-memory rate limiter) — superseded by a real finding, now fixed.** The original
description ("not shared across instances", "resets on restart") understated the exposure. I
traced the actual key derivation and found a **complete bypass**: `clientKey()` read the first
entry of the client-supplied `X-Forwarded-For`, which nginx *appends* to rather than overwrites.

Reproduced against production before the fix: **130 requests with a rotating header → 130 × 200,
0 × 429**, against a 120/min limit. The honest control (no header) gave 120 × 200, 10 × 429, so
the limiter was bypassable, not merely loose.

Fixed by keying on `X-Real-IP`, which nginx overwrites with `$remote_addr` and which a client
cannot forge, and by failing closed to a single shared bucket when it is absent — the failure mode
is stricter, never looser. Safe: the backend binds `127.0.0.1:4330` and is reachable only through
the nginx vhost, so that header is trustworthy in this topology. Three regression tests added.
Re-verified against production: **120 × 200, 10 × 429 on a clean window.**

**YT-005 (no Content Security Policy) — fixed.** A CSP now ships on the TLS vhost. The inline
hydration payload forces `script-src 'unsafe-inline'`; that residual is stated, not hidden. The
directives that do real work are `connect-src` pinned to `'self'` + the Studio RPC + `grok.com`
(so assessment data cannot be exfiltrated to an arbitrary host), `object-src 'none'`,
`base-uri 'self'`, `frame-ancestors 'none'`, and `form-action 'self'`.

I did not take this on faith. The **first** attempt shipped a CSP that blocked the Google Fonts
stylesheet, and browser verification caught it before it was accepted. `fonts.googleapis.com` was
added to `style-src` and `fonts.gstatic.com` to `font-src`, and the re-run was clean: 26/26
routes rendered, 0 console errors, 0 CSP violations, and the
`https://grok.com/grok-app-builder/extensions.js` branding script still present and unblocked.

**Two additional defects found and fixed this session**, both recorded in
`report/SECURITY_FINDINGS.md`:

- **YT-008** — the chain indexer retried into an exhausted rate limit on every request, turning a
  transient cap into a self-sustaining outage. Fixed with a bounded cadence and a 120 s backoff
  (see §8). A 40-request burst now produces **1** rate-limit error instead of one per request.
- **YT-009** — the fixture teaching records silently expired. The seeded fixture policies set a
  7-day `max_age_seconds` while the fixture assessments carry a fixed `2026-09-20` timestamp, so
  from 2026-09-27 every fixture read `REVIEW_REQUIRED / STALE_ASSESSMENT` and the "Preview gate"
  control could no longer demonstrate an approved outcome. Fixed at the source by setting the
  fixture policies to `max_age_seconds: 0`, which is the honest setting for a record explicitly
  labelled "not a live reading". Chain policies are untouched and still gate at 7 days, and the
  staleness gate stays unit-tested including its exact boundary.

**Open Low findings: 1** — the `script-src 'unsafe-inline'` residual in YT-005, which cannot be
removed without a per-response nonce, and that would require changing the platform-owned shell
injector.

---

## 7. SOURCE / SECRET PROVENANCE

Git history cannot be reconstructed, so **no claim is made about whether `.env` was ever
committed.** Instead a verifiable current-state baseline was established.

| Check | Result |
|---|---|
| `.env` present | yes |
| `.env` mode | **600** (owner only) |
| `.env` in `.gitignore` | yes (line 6) |
| `.env` in the distributable archive | **no** — verified against the actual `tar -tzf` listing, not assumed |
| Private key in source | none |
| Seed phrase / mnemonic | none |
| Database password in any project-owned file | none — the literal password was searched across the tree |
| WalletConnect secret | none exists; the variable is empty |
| RPC secret | none; the Studio endpoint is the public one |
| Deployment credentials | none |
| Debug dumps | none; every `0x` + 64-hex match in the tree is a **public transaction hash** in docs |

| Artifact | SHA-256 |
|---|---|
| Application source tree (**reproducible fingerprint**) | `2acc8f17895b75cc159edef30caea5df23961e7c05b1ba0fdfe5496714a4ac3c` |
| Application source archive (convenience; embeds mtimes, not byte-reproducible) | `92641b30b5643c48664917f50fb21f20f4491620227bd125996157df5e80277e` |
| `package-lock.json` | `e5481f9032139e506df6e90d46665a1c9a1c5324181e7a0892d3948b628e7f9e` |
| `contracts/yield_truth.py` | `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1` |
| Files inventoried | 180 |

The tree hash is computed over sorted `(path, file-sha256)` pairs, so it is independent of
timestamps and filesystem layout, and it was confirmed **byte-identical across repeated runs**
after I caught and fixed two self-inflicted defects in the generator: it was including its own
output (making the hash change every run) and it was misreporting `.env.example` as a leaked
`.env`. Compare the **tree hash**, not the archive hash, when checking for drift — `tar` embeds
mtimes, so the archive's own bytes are not reproducible. Full inventory in
`report/FINAL_RELEASE_MANIFEST.md`.

---

## 8. REGRESSION VALIDATION

All gates re-run after every change. The production server was restarted and re-verified after
each rebuild; no result below is from a stale process.

| Gate | Result | Note |
|---|---|---|
| Lint | **PASS** | `eslint .` exit 0. 0 errors, 2 pre-existing warnings (`react-refresh` export shape, an unused eslint-disable) — both in files I did not touch. |
| Typecheck | **PASS** | `tsc --noEmit` exit 0. |
| Unit / integration tests | **PASS** | **271 passing, 0 failing** (195 script tests + 76 app tests). |
| Production build | **PASS** | `vite build` exit 0; `✓ built in 8.62s`. |
| Dependency audit | **PASS** | `npm audit --audit-level=high` exit 0. 0 high, 0 critical, 22 moderate (triaged in §5). |
| Secret scan | **PASS** | 0 findings; `.env` excluded from the archive. |
| Backend health / readiness | **PASS** | live 200; ready 200 with `database ok`, `migrations applied`, `chain ok`, `last_error` empty. |
| Production API smoke | **PASS** | 20 routes × 200. |
| Production 5xx | **0** | across the smoke and the browser runs. |
| Playwright desktop | **PASS** | 5/5. |
| Playwright mobile | **PASS** | 5/5. |
| Console errors | **0** | 26 route renders + all interactive runs. |
| CSP violations | **0** | |
| nginx / PostgreSQL / PM2 | **active** | `pm2 yieldtruth` online. |

**The Playwright base URL was wrong and I fixed it rather than reporting around it.** The repo's
`playwright.config.ts` targets `127.0.0.1:8080`, which in this environment serves an unrelated
application ("TrenchIQ market indexer"), so the suite was testing the wrong software. I added
`playwright.prod.config.ts` pointing at the real production origin. The specs then exposed two
genuine defects, both fixed:

- `walk.spec.ts` asserted `expect(errors).toEqual([])` immediately after deliberately navigating
  to a 404 — a contradiction; the browser logs that navigation as a console error. Fixed by
  scoping the exemption to exactly that one expected message. While fixing it I also removed a
  **dead check**: the `failed` array filtered on `url.includes("127.0.0.1:8080")`, so under any
  other origin it was always empty. It is now origin-agnostic and actually catches 4xx/5xx.
- `desk.spec.ts` overran the 30 s default timeout (it takes ~26 s alone). Given an explicit budget,
  as `walk.spec` already did.

I did **not** simply raise timeouts to force a green run. The walk test's 120 s budget was
raised to 300 s only after confirming the failing step moved between runs — the signature of
budget exhaustion, not a broken step. Every individual assertion still has to pass, and the
zero-console-error and zero-failed-response assertions are intact and now stricter than before.

**Service outage root cause and fix.** Production served 502 on arrival. The `yieldtruth` app was
absent from the PM2 registry (a stale `yieldtruth-8.pid` from 02:56 was the only trace) and
`127.0.0.1:4330` was closed. I restored it with `ecosystem.config.cjs`, ran `pm2 save` so the
registry survives a daemon restart, confirmed `pm2-root.service` is enabled, and rewrote
`startup.sh` as a real production restart contract: it probes the **upstream port** rather than the
process table (a live process with a dead listener is still an outage), starts only what is down,
saves the dump, and is idempotent — verified by running it twice.

**Chain indexer root cause and fix (YT-008).** The public Studio RPC enforces a 500-requests-per-
hour `gen_call` budget. One catch-up costs 7 calls. The old 12 s cooldown implied up to 2100
calls/hour, and because a failure did not update `lastSuccessAt`, every subsequent page load
retried straight back into the cap — I reproduced this, watching `yt_sync.last_error` stick at
"Rate limit exceeded" and readiness report `chain: down`. Fixed with a 5-minute cadence (≈84
calls/hour, ~17 % of the shared budget) plus a 120 s backoff on a rate-limited response. The error
is still returned to the caller and still persisted, so nothing is swallowed. Self-recovery was
observed end to end: after the window reset, readiness returned to `ready` with the cursor
preserved and `last_error` cleared.

---

## 9. CONTRACT FREEZE

`contracts/` was **not modified**. No redeployment was performed. All evidence in this report
therefore refers to one contract version, and no evidence is mixed across versions.

| Check | Result |
|---|---|
| Local `contracts/yield_truth.py` SHA-256 | `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1` |
| Deployed source SHA-256 (`gen_getContractCode`) | `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1` |
| Byte length, both sides | 38396 / 38396 |
| **Match** | **true** |

### Studio lifecycle (re-read from Studionet)

| Transaction | Hash | Status | Result |
|---|---|---|---|
| deploy | `0x61a1d68664ddc707611eea2dc2221d95678bd5ad637351ba9ae0e8713b5f9d5f` | 7 FINALIZED | 6 (MAJORITY_AGREE), execution SUCCESS |
| `create_policy` | `0x019077e53f0ce0bb6221da7db124f39febf092f20b1fd1038e56d1e986c258cf` | 7 FINALIZED | 6 (MAJORITY_AGREE), execution SUCCESS |
| `submit_opportunity` | `0xf29bf7b8ad3994d87cbcc9049b661d1477f363d59cb8bcc532b43a132bfd2bb2` | 7 FINALIZED | 6 (MAJORITY_AGREE) |
| `assess(1,1)` | `0xacd5ffc84280b348e59d63707bdc0f89aa1e7b6ab7e79efb9e7e99dee06dbae7` | 7 FINALIZED | 6 (MAJORITY_AGREE), execution SUCCESS |

### Read methods — 20/20 PASS

`schema_version` `1` · `get_owner` `0x6f9D2483ce8903354aA997aa98184b77CDaBe75c` ·
`classification_charter` `YIELDTRUTH_CLASSIFY_V1` · `equivalence_principle` `YIELDTRUTH_EQ_V1` ·
`get_limits` full bounds and enums · `source_count` `14` · `get_source(aave.com)` enabled ·
`list_sources` 14 hosts · `get_policy_count` `2` · `get_policy(1)` Treasury desk ·
`list_policies` ids 1, 2 · `get_opportunity_count` `1` · `get_opportunity(1)` Aave/Ethereum/USDC ·
`list_opportunities` `[1]` · `get_assessment_count` `1` · `get_assessment(1,1)` revision 1
APPROVED/POLICY_PASS · `get_latest_assessment(1)` revision 1 · `get_history(1)` one entry ·
`get_latest_decision(1)` APPROVED/POLICY_PASS · `satisfies(1,1)` APPROVED, `stale false`,
`stored_decision APPROVED`.

**Passed 20 · Failed 0 · Total 20.** Raw output: `report/chain-verify.json`
(regenerate with `node scripts/chain-verify.mjs --fresh`; it is rate-limit aware and caches).

---

## KNOWN LIMITATIONS

Only genuine remaining limitations.

1. **The frontend-signed wallet transaction is not executed.** It needs one human signature.
   Everything up to that point is verified (§1). This is the sole reason the status is PARTIAL.
2. **14 contract Direct Mode tests were not re-executed** — `gltest` is not installed in this
   workspace. They were last run against this exact source, and the deployed source hash is
   unchanged. Stated rather than implied to have passed today.
3. **The public Studio RPC caps `gen_call` at 500/hour.** This constrained how much independent
   verification could be done: three read-verification attempts were throttled mid-run before I
   stopped the application from competing, idled, and captured a clean 20/20. It is also a real
   operational constraint. A dedicated RPC endpoint removes it and allows a much shorter sync
   cadence than the current 5 minutes.
4. **A finalized assessment can take up to 5 minutes to appear in the index** — the direct
   consequence of the cadence above. This is a deliberate trade: correctness for a shared public
   limit over a marginally snappier refresh. The UI links the transaction hash to GenLayer Studio
   in the meantime.
5. **`script-src 'unsafe-inline'` remains in the CSP** because of the inline hydration payload.
   Removing it needs a per-response nonce, which would mean changing the platform-owned shell
   injector.
6. **The write path is desktop-only.** `VITE_WALLETCONNECT_PROJECT_ID` is empty, so only an
   injected EIP-1193 provider is offered. A mobile visitor with no injected wallet cannot connect.
   This is an owner-supplied third-party credential, not a code change (YT-010).
7. **No Git history exists**, so nothing can be proven about past commits. The release manifest
   establishes a forward-looking baseline only.

---

## FINAL VERDICT

**PARTIAL.** YieldTruth V1 does not satisfy every release gate, and the reason is one specific
missing piece of evidence rather than an unresolved defect.

**Satisfied (24 of 25):** real production frontend wallet path verified end to end up to the
signature boundary, with the account, network, signer, ABI encoding, phase handling, finality
detection, and canonical re-read each confirmed against source and a live browser; canonical
contract state verified independently; backend state matches contract; frontend state matches
contract; indexer survives restart without divergence; 20/20 read methods PASS; deterministic
policy invariant verified and newly protected by targeted tests; deployed/local contract hash
matches; 0 Critical; 0 High; no realistically exploitable unresolved Moderate issue; all three
Low findings addressed (two fixed at the root, one residual documented); secret scan PASS;
dependency audit fully triaged; lint, typecheck, tests, and build PASS; Playwright desktop and
mobile PASS; zero unexplained console errors; zero unexplained production 5xx; production
healthy.

**Not satisfied (1 of 25):** *a real production frontend wallet transaction, signed, with its hash
recorded, finalized, and its consensus result captured.* No transaction was submitted by this
certification, and none is claimed.

Along the way this certification also found and fixed three defects that the previous report
either missed or misstated — a 502 production outage, a complete rate-limit bypass, and a
self-sustaining indexer outage — plus two time-bombed test/data defects. Two of my own first
attempts were also caught by verification and corrected before shipping: a CSP that silently broke
web fonts, and a release-manifest generator whose self-inclusion made its own hash meaningless.

The status is PARTIAL and not PASS, because PASS must come from executed evidence and this one
piece of evidence does not exist yet. It is obtainable in a single signature.
