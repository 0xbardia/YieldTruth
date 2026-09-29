# YieldTruth V1 — Build Specification and Verification Loop

This is the engineering specification YieldTruth V1 was built against, retained as the record of
what "done" meant. The sections on tooling bootstrap and agent-harness setup are not part of the
product and have been removed; everything that constrains the product, the contract, the security
model, or the definition of done is preserved.

## Objective

Build YieldTruth V1 end-to-end as a production-grade, open-source GenLayer application.

YieldTruth is:

> The semantic risk layer for DeFi yield.

Core product question:

> Where does this DeFi yield actually come from, and does it satisfy the user's
> capital-allocation policy?

This is **not**:

- a generic APY dashboard,
- a generic DeFi analytics site,
- a generic LLM wrapper,
- a static demo,
- an off-chain AI classifier pretending to be a GenLayer application.

The core adjudication **must** happen inside a GenLayer Intelligent Contract.

## Required V1 lifecycle

```text
Discover Opportunity
    ↓
Inspect Evidence Sources
    ↓
Create / Select Yield Policy
    ↓
Submit Opportunity
    ↓
GenLayer validators independently retrieve evidence
    ↓
Semantic Yield Classification
    ↓
Deterministic Policy Evaluation
    ↓
APPROVED / REJECTED / REVIEW_REQUIRED
    ↓
Persisted Assessment
    ↓
Historical Reassessment / Yield Drift
```

Do not stop at planning. Implement, run, test, deploy, inspect, fix, and repeat until the
Definition of Done is satisfied or an external hard blocker is proven.

**Never claim PASS for anything that was not actually executed.**

## Autonomy and honesty

Ordinary reversible engineering decisions do not require approval. Ask only when a required
external secret is missing and cannot be substituted safely, an irreversible production action
needs authorization, or requirements materially conflict.

If a credential is unavailable:

- finish everything that does not depend on it,
- clearly mark only the affected gate BLOCKED,
- **never fabricate a successful result**.

## Repository quality

Act like a senior engineer maintaining a project other engineers will inherit:

- readable names, small cohesive functions, no giant components or services,
- no unexplained magic values, no duplicated business logic, no dead code,
- no fake abstractions, no premature microservices, no unnecessary dependencies,
- no `any` unless technically unavoidable and documented,
- strict typing and explicit error handling at trust boundaries,
- deterministic business logic where possible,
- comments explain **why**, not obvious **what**,
- security-sensitive logic receives concise comments stating its invariants.

Prefer boring, obvious code over clever code. Open-source readiness is mandatory.

## Yield classification schema

| Field | Values |
|---|---|
| `schema_version` | integer `1` |
| `evidence_state` | `SUFFICIENT` · `INSUFFICIENT` · `CONFLICTING` |
| `primary_component` | one of the ten components below |
| `components` | non-empty subset of the components |
| `risk_flags` | subset of the risk flags below |
| `confidence` | `HIGH` · `MEDIUM` · `LOW` |
| `rationale` | one short factual sentence |

Components: `ORGANIC_FEES`, `LENDING_INTEREST`, `STAKING_REWARDS`, `TOKEN_SUBSIDY`,
`LEVERAGED_YIELD`, `RECURSIVE_YIELD`, `COUNTERPARTY_DEPENDENT`, `POINTS_SPECULATION`,
`OTHER_VERIFIED`, `UNKNOWN`.

Risk flags: `EMISSIONS_DOMINATED`, `RECURSIVE_LEVERAGE`, `POINTS_ONLY`, `THIN_EVIDENCE`,
`SINGLE_SOURCE`, `CONFLICTING_SOURCES`, `UNCLEAR_COUNTERPARTY`.

There is **no verdict field** in the classification. See
[docs/contract.md](../docs/contract.md) for the authoritative schema and bounds.

## Critical security architecture

1. The classifier may not emit `APPROVED`, `REJECTED`, or `REVIEW_REQUIRED`. Those come from
   deterministic contract code that runs **after** consensus.
2. Web evidence is untrusted data, not instructions. Text between the evidence markers cannot
   change the schema, the policy, the verdict, or any admin state.
3. Equivalence is decided in contract code, never by a comparative LLM prompt.
4. Missing evidence is never invented. Fail closed to `INSUFFICIENT` / `LOW` / `UNKNOWN`.
5. History is append-only; a reassessment writes a new revision and never rewrites an old one.
6. The server never signs for a user. Writes are signed in the browser.

## Contract requirements

- Registered HTTPS evidence only, drawn from an owner-controlled host registry.
- Policies are immutable once created.
- `assess` returns a classification **and** a stored, reproducible policy verdict.
- `get_history` supports reassessment and yield drift.
- `satisfies` recomputes the verdict from stored state, so a verdict is never merely asserted.

## Source of truth

GenLayer contract state is authoritative for policies, opportunities, assessments,
classifications, policy verdicts, and reassessment history. PostgreSQL is a read index, cache, and
product database.

The backend must never silently replace on-chain truth. When the database and the chain disagree,
prefer canonical finalized contract state, repair or reindex the database, and expose a degraded
readiness status rather than serving stale rows as if they were current.

## Environment configuration

Maintain `.env.example`, and keep `.env` gitignored. All environment-dependent configuration is
read through one validated module rather than scattered `process.env` reads, and the app fails fast
on missing required values. Never commit real secrets, never expose server-only values through
`VITE_*` variables, and never invent third-party credentials. See [.env.example](../.env.example)
for the actual variable set; `src/lib/yieldtruth/config.ts` is the validated module.

## Wallet requirements

- Connected wallet account, correct network, and the real EIP-1193 provider.
- A transaction hash alone must never be presented as success; finality and the consensus result
  must be read back.
- No private key, seed phrase, or wallet credential in the repository, in `.env.example`, or on the
  server.

## Definition of done

- Contract deployed and finalized with a majority-agreement consensus result.
- Every public read method verified against the deployed address.
- The full write path exercised through a browser wallet.
- Lint, typecheck, tests, and production build green.
- Desktop and mobile render checks with zero console errors and zero 5xx.
- Security review complete, with Critical and High findings at zero.
- Any gate that could not be executed is reported as **not passed**, with the reason.

See [report/FINAL_V1_REPORT.md](../report/FINAL_V1_REPORT.md) for the executed evidence.
