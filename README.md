# YieldTruth

**APY tells you how much. YieldTruth tells you why.**

YieldTruth verifies where DeFi yield actually comes from before capital is allowed to follow it.

It is the semantic risk layer for DeFi yield, powered by GenLayer consensus. A GenLayer Intelligent
Contract decides what kind of yield an opportunity produces; separate deterministic code decides
whether that yield satisfies a stated capital-allocation policy. The model is never allowed to
choose the verdict.

## Live

| | |
|---|---|
| Production | **https://yieldtruth.bydx.fun** |
| Network | GenLayer **Studionet**, chain id `61999` (`0xf22f`) |
| Contract | `0x23C029E1aB24f74b355EF05f7b540296BEdD6279` |
| Deploy tx | `0x61a1d68664ddc707611eea2dc2221d95678bd5ad637351ba9ae0e8713b5f9d5f` (FINALIZED, `MAJORITY_AGREE`) |
| Studio | https://studio.genlayer.com/contracts |
| Contract source SHA-256 | `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1` |

## What it does

1. Someone submits a named DeFi opportunity with HTTPS evidence URLs on owner-registered hosts.
2. GenLayer validators independently render those pages and classify the yield into a bounded
   schema — evidence state, primary component, component set, risk flags, confidence.
3. Validators must reach **equivalence** on the critical fields. Equivalence is compared in contract
   code, not by asking a model whether two answers "look the same".
4. Deterministic contract code evaluates that classification against an immutable policy.
5. The result is stored as `APPROVED`, `REJECTED`, or `REVIEW_REQUIRED`, with a reason code.
6. Reassessing writes a **new revision**. History is append-only and never rewritten.

## The invariant that matters

```text
Web Evidence
    ↓
GenLayer Validator Consensus
    ↓
Bounded Semantic Classification
    ↓
Deterministic Policy Evaluation
    ↓
APPROVED / REJECTED / REVIEW_REQUIRED
```

**The LLM does not directly choose the policy verdict.** Consensus produces a classification only.
The verdict is computed afterwards by ordinary contract code over a fixed set of fields.

This is enforced structurally, not by convention:

- The classification schema has **no verdict key**. Any output containing an extra field fails
  closed to `INSUFFICIENT` / `UNKNOWN` / `LOW`, a state that can never approve.
- `sources_ok` and `sources_failed` are counted by contract code, not reported by the model, and
  any model-supplied copy is discarded.
- Equivalence is decided in Python inside `gl.vm.run_nondet`; a node operator cannot loosen it with
  a prompt template.
- `satisfies()` recomputes the verdict from stored state, so a verdict is reproducible rather than
  merely asserted.

## Why GenLayer

A yield classification is a **semantic** judgement about a web page, and a policy decision is a
**deterministic** judgement about that classification. GenLayer is used for exactly the first half:
multiple validators independently retrieve the same evidence and must agree, with the comparison
performed in contract code. The second half is intentionally ordinary code, so the rule that gates
capital is auditable line by line and cannot be swayed by model output.

An off-chain classifier calling a single API would give one model's opinion with no agreement and
no on-chain record. That is not the property this product needs.

## Yield drift

Yield that is borrower interest can become token-subsidised. The desk keeps every assessment as an
append-only revision and shows the change between them, so drift is visible rather than silently
overwritten. A staleness window means an old reading can return `REVIEW_REQUIRED` without the
stored decision being altered.

## Architecture

```text
browser wallet
    → genlayer-js writeContract
        → GenLayer validators
            → YieldTruth contract (contracts/yield_truth.py)
                → gl.vm.run_nondet: render evidence, classify, compare in code
                → evaluate_policy: deterministic verdict
                → append-only assessment

read API + PostgreSQL index  →  desk
```

The contract is authoritative. PostgreSQL is a read index: if they disagree, finalized contract
reads win and the indexer repairs forward. The cursor never advances on a failed read.

Full detail: [docs/architecture.md](docs/architecture.md) ·
[docs/contract.md](docs/contract.md) · [docs/methodology.md](docs/methodology.md)

## Stack

| Layer | Choice |
|---|---|
| App | TanStack Start (SSR pages and `/api/v1` in one deployable) |
| Language | TypeScript strict, plus Python for the contract |
| Contract | GenLayer Intelligent Contract, `genlayer-js` 1.1.8 |
| Wallet | RainbowKit 2.2 + wagmi 2.19 + viem 2.56 |
| Data | PostgreSQL via Kysely; embedded PGlite when `DATABASE_URL` is unset |
| Tests | `node:test`, Playwright, GenLayer Direct Mode (`pytest`) |
| Contract schema | 20 public read methods, 5 owner-gated admin methods |

## Local development

```bash
cp .env.example .env
npm install
npm test
npm run dev          # http://127.0.0.1:8080
```

With `DATABASE_URL` unset the app uses embedded Postgres, so a local desk boots with no external
services. Set `GENLAYER_CONTRACT_ADDRESS` and `VITE_YIELDTRUTH_CONTRACT_ADDRESS` to the address
above to read live chain state; leave them empty and reads still work while the write buttons stay
closed.

**Never put a wallet private key in `.env`.** Contract writes are signed in the browser.

### Database

Migrations are applied automatically on build (`npm run db:migrate`). With `DATABASE_URL` set,
migrations run against that database; unset, the embedded database migrates itself.

### Tests

```bash
npm test          # unit, integration, contract-plugin and policy tests
npm run lint
npm run typecheck
npm run build

npx playwright test --config=playwright.config.ts   # desktop + mobile
```

### Verification tools

```bash
npm run verify:chain        # re-read all 20 readonly methods + deployed source hash
npm run verify:prod         # desktop/mobile render, console, CSP and 5xx checks
npm run verify:write-path   # drive the write path; record where it stops without a wallet
npm run release:manifest    # reproducible source fingerprint and secret scan
```

`verify:chain` compares the deployed contract source against `contracts/yield_truth.py`, so a
contract change that was never redeployed is caught immediately. All four are rate-limit aware against
the public Studionet RPC.

### Direct Mode vs Studio Mode

**Direct Mode** runs the contract locally under `genlayer-test` with no Docker, mocking the web
render and the model so assertions are deterministic:

```bash
pytest tests/direct -q
```

**Studio Mode** deploys to GenLayer Studionet for real validator consensus. The deployed
transaction, its consensus result, and every read method are recorded in
[docs/deployment.md](docs/deployment.md).

## Security model

- **Writes are signed in the browser.** RainbowKit → the user's wallet → `genlayer-js`. The server
  holds no user key and cannot sign. The backend's chain client is created with no account and no
  provider, so it is structurally incapable of writing.
- **A transaction hash is never treated as success.** The client waits for a finalized receipt and
  independently requires an agreed consensus result, a successful leader execution, and a finished
  contract execution.
- **Web evidence is data, not instructions.** Retrieved text is wrapped in untrusted-evidence
  markers, length-bounded, and cannot change the schema, the policy, or admin state.
- **Owner-gated administration.** Registering or disabling an evidence source requires the owner.
- **Fail closed.** Unknown enums, malformed JSON, extra fields, and unreadable evidence all
  degrade to a reviewable state. None of them can produce an approval.
- **The read API is rate limited**, keyed on a proxy-overwritten client address, with a bounded
  backoff against the public RPC's quota.

Current findings: [report/SECURITY_FINDINGS.md](report/SECURITY_FINDINGS.md) ·
[SECURITY.md](SECURITY.md)

## Documentation

[Overview](docs/overview.md) · [Architecture](docs/architecture.md) ·
[Contract](docs/contract.md) · [Methodology](docs/methodology.md) ·
[Security](docs/security.md) · [Testing](docs/testing.md) ·
[Deployment](docs/deployment.md) · [API](docs/api.md) · [Frontend](docs/frontend.md) ·
[Roadmap](docs/roadmap.md)

## Certification status

YieldTruth V1 is **production deployed and contract-certified**. Final end-to-end certification is
**pending one real user-wallet-signed production transaction**, which requires a human to approve a
signature in a browser wallet. Until that gate is executed, the certification status is **PARTIAL**
and is reported as such.

Everything else is verified from executed evidence: 20/20 deployed read methods, contract source
hash matching the deployed bytecode, backend and frontend state matching canonical contract state,
restart-safe indexing, and a green lint / typecheck / test / build / Playwright run. See
[report/FINAL_V1_REPORT.md](report/FINAL_V1_REPORT.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [specs/constitution.md](specs/constitution.md) first.
The short version: the verdict must stay deterministic, history stays append-only, the server never
signs, and a gate that was not executed is not reported as passed.

## License

[MIT](LICENSE) — see [LICENSE](LICENSE).
