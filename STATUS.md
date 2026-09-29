# STATUS

Updated: 2026-09-29

Certification status is **PARTIAL**: YieldTruth V1 is production deployed and contract-certified,
and final end-to-end certification is pending one real user-wallet-signed production transaction.
See [report/FINAL_V1_REPORT.md](report/FINAL_V1_REPORT.md) for the executed evidence.

## Now

YieldTruth is on a Studionet contract whose validators compare classifications in Python. `gl.eq_principle.prompt_comparative` is not on the assess path. A browser-signed assessment on this address finalized with majority agreement and stored a real reading: two pages read, lending interest, medium confidence, approved by the treasury policy.

## Gates

| Gate | Result |
|---|---|
| Direct Mode (`genlayer-test`, 14 tests) | PASS |
| Lint / typecheck / build | PASS |
| Unit and integration tests | PASS, 271 tests |
| Playwright desktop and mobile | PASS, 0 console errors, 0 5xx |
| Studionet deploy | PASS. `0x23C029E1aB24f74b355EF05f7b540296BEdD6279` |
| All 20 deployed read methods | PASS, including empty state before the writes |
| Contract source hash matches deployed source | PASS |
| Indexer restart recovery | PASS, cursor and rows identical after restart |
| Frontend policy, submit, assess | PASS through `writeContract`. The assessment below is the consensus proof |
| **Real user-wallet-signed production transaction** | **PENDING** — requires a human signature |

## Contract

Address: `0x23C029E1aB24f74b355EF05f7b540296BEdD6279`  
Deploy: `0x61a1d68664ddc707611eea2dc2221d95678bd5ad637351ba9ae0e8713b5f9d5f` (FINALIZED, MAJORITY_AGREE)  
Studio: https://studio.genlayer.com/contracts  
Source SHA-256: `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1`

Do not point the desk at `0xEeb187Db672ACc6e84792beDe64659b4e7Dcd30D`. That deployment still asks a model to decide equivalence.

Browser writes on this address, each finalized with `MAJORITY_AGREE`:

| Call | Hash |
|---|---|
| `create_policy` “Treasury desk” | `0x019077e53f0ce0bb6221da7db124f39febf092f20b1fd1038e56d1e986c258cf` |
| `submit_opportunity` “Aave supply interest” | `0xf29bf7b8ad3994d87cbcc9049b661d1477f363d59cb8bcc532b43a132bfd2bb2` |
| `assess` opportunity 1, policy 1 | `0xacd5ffc84280b348e59d63707bdc0f89aa1e7b6ab7e79efb9e7e99dee06dbae7` |

Stored assessment: `sources_ok` 2, `sources_failed` 0, primary `LENDING_INTEREST`, evidence `SUFFICIENT`, confidence `MEDIUM`, decision `APPROVED`, reason `POLICY_PASS`.

## Judge pass

Equivalence of schema version, evidence state, primary component, component set, risk flags, confidence, and source counts is contract code inside `gl.vm.run_nondet`. A node operator cannot loosen that with the comparative prompt template. The desk treats a finalized transaction as final only when the result is `AGREE` or `MAJORITY_AGREE` and the leader execution succeeded. An idle validator stopped because quorum was already reached is not a failed assessment. A thin or conflicting reading still cannot become an approval by itself. The model still does not assign the verdict.
