# Security model

## Invariants

1. Policy verdicts are computed in `evaluate_policy` after consensus.
2. Invalid model output becomes `INSUFFICIENT` / `UNKNOWN` / `LOW`, which the policy maps to `REVIEW_REQUIRED`, never `APPROVED`.
3. Web content cannot change the owner, the registry, a policy, or transfer value. Assessment is the only state the classification path writes, and only after coercion.
4. URL checks run before any render.
5. One dead source does not erase other sources. Zero live sources cannot be approved. One live source cannot be high confidence.

## Prompt injection

Direct Mode feeds injection text through the mocked model and through extra JSON fields (`APPROVED`, action, policy changes). The stored decision stays review or reject, and the policy document is unchanged. See `tests/direct/test_yield_truth.py`.

## Residual

Validators re-run classification inside `gl.vm.run_nondet` and compare schema version, evidence state, primary component, component set, risk-flag set, confidence, and source counts in Python. Rationale wording may differ. Direct Mode captures that validator; `test_validator_compares_fields_in_code` accepts reordered components and a rewritten rationale, and rejects a different primary component, an extra verdict field, a boolean schema version, and a leader error. A fetch-count mismatch is also a disagreement.

A browser-signed `assess` on `0x23C029E1aB24f74b355EF05f7b540296BEdD6279` finalized as `MAJORITY_AGREE` (`0xacd5ffc84280b348e59d63707bdc0f89aa1e7b6ab7e79efb9e7e99dee06dbae7`). The stored reading has two readable sources and a policy verdict computed after consensus.
