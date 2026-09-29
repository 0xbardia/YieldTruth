# Testing

## Direct Mode

```bash
pytest tests/direct -q
```

No Docker. `mock_web` and `mock_llm` stand in for render and `exec_prompt`. Covered cases include admin boundaries, URL rejection (including a public IP literal), policy immutability, lending approval, subsidy rejection, recursive and points and counterparty paths, injection, malformed JSON, unknown enums, zero sources, a single source capping high confidence, conflicting evidence, low confidence, leverage, organic fees, and a time warp that makes `satisfies` stale while the stored decision stays approved.

12 tests passed on 2026-09-26 with genlayer-test against the v0.2.12 runner.

`run_validator()` is not asserted. The runner returns no comparative validator result for `ExecPromptTemplate`.

## Application

```bash
npm test
npm run typecheck
npx eslint src/lib/yieldtruth src/routes/api/v1 src/components/yield
npx playwright test
```

`npm test` includes the policy mirror, indexer cursor behaviour, rate limit, and the catch-up skip when no contract address is set.

Playwright opens the running desk, reads an opportunity, the drift page, docs, and the health route, on a 1280 and a 390 viewport.

## Not run

Studio-mode tests with real validators. Deployment failed before a contract existed. See `docs/deployment.md`.
