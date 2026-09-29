# Contributing

## Before you change the contract

1. Read `contracts/yield_truth.py` and `docs/contract.md`.
2. Keep the `# { "Depends": ... }` line as the first line.
3. Do not let the model emit `APPROVED`, `REJECTED`, or `REVIEW_REQUIRED`. Those strings belong only to `evaluate_policy`.
4. Keep evidence inside `UNTRUSTED_EVIDENCE` delimiters. Do not add a user-supplied system prompt.
5. Run Direct Mode before you claim a contract change works:

```bash
pytest tests/direct -q
```

If you change `evaluate_policy`, change `src/lib/yieldtruth/policy.ts` in the same commit and extend `policy.test.ts`. The TypeScript function is a labelled preview, not a second source of truth.

## Application changes

```bash
npm run typecheck
npm test
npm run lint
```

Do not add a server-held user key, a private-key form, or an off-chain classifier that the UI presents as GenLayer consensus.

Fixture data stays labelled. Do not invent APYs, TVL, or testimonials.

## Reviews

Security-sensitive changes need a note in `report/SECURITY_FINDINGS.md` or a new finding id. Unresolved critical and high findings block a release claim.
