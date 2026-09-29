# YieldTruth V1 — Final User QA

Date: 2026-09-29 UTC
Method: first-time-user session against production, with source/network/server inspection
after each problem, immediate fixes, and a re-run of the exact failed flow.

## Environment

| | |
|---|---|
| URL | https://yieldtruth.bydx.fun |
| Commit under test | `3e4c1c3` (plus this session's QA fixes) |
| Browser | Chromium 1280×900, plus 320/360/390/768 widths |
| Contract | `0x23C029E1aB24f74b355EF05f7b540296BEdD6279` |
| Network | GenLayer Studionet, chain id `61999` |
| Contract source SHA-256 | `eef7fa511d79141f8da4786db777c86fba4c26082a71599833b8bdfb238c22f1` (unchanged) |

## User Journey

| Flow | Result |
|---|---|
| First impression | PASS — headline states the position, the two CTAs are "Inspect a market" and "How your wallet signs" |
| Explore | PASS — market table gives protocol, asset, APY, primary source, gate, and record type |
| Opportunity detail | FIXED — plain language; classification and verdict are explicitly separated |
| Evidence | FIXED — "2 of 2 pages", readable assessment time |
| Policy | FIXED — "what this policy does" answers what is rejected, without booleans |
| Create policy | PASS — live policy sentence, freshness help added |
| Assessment preparation | FIXED — the subject, permanence, wait, and no-guarantee are stated before signing |
| Wallet | FIXED — rejection, wrong network, and rate limiting are explained and retryable |
| Consensus | FIXED (regression) — final state keeps the full hash and the Studio link |
| Yield Drift | FIXED — explains that one assessment has nothing to compare against |
| Failures/recovery | FIXED — no raw library text, no dead buttons, no blank pages |

## Findings

### QA-001 — Two policies with identical names were indistinguishable
- **Severity:** HIGH
- **Flow:** Assessment preparation (step 7)
- **User expected:** one "Treasury desk" policy
- **Actual:** the selector and the policy list both showed **two** entries named "Treasury desk", with no way to tell them apart. The user cannot know which one they are signing against.
- **Root cause:** the first build created two on-chain policies with the same name. Ids 1 and 2 are rule-identical, differing only in `creator` and `created_at`. The UI rendered `policy.name` with no disambiguation.
- **Fix:** `policyLabels()` appends the id only when a name is ambiguous, so unique names are untouched. Applied to the policy list, the policy detail heading, and the assessment selector.
- **Verification:** list now shows "Treasury desk (#1)" and "(#2)"; selector options are distinct. Covered by `user-qa.spec.ts` and by a `policy.test.ts` unit test.

### QA-002 — Signing without being told what was being signed
- **Severity:** HIGH
- **Flow:** Assessment preparation (step 7)
- **User expected:** before approving a wallet prompt, to know the action, the subject, and the outcome
- **Actual:** the panel said only "Validators render the registered evidence… You sign this from your wallet." It never named the opportunity or the policy, never said the record is permanent, never mentioned that consensus takes time, and never said approval is not guaranteed. The user would be signing an opaque transaction.
- **Root cause:** the `WriteBox` intent string was written as a mechanism description, not a disclosure.
- **Fix:** added a four-row disclosure above the button: what you are signing (named opportunity and policy), what this will do (permanent, cannot be undone), what happens next (validators read and agree; usually a minute or two), and not a promise (approval is not guaranteed).
- **Verification:** re-read from production; all four rows present. Protected by `user-qa.spec.ts`, which also asserts no `writeContract` / `genlayer-js` leaks into the panel.

### QA-003 — Raw library internals shown as the user-facing error
- **Severity:** HIGH
- **Flow:** Wallet failure
- **User expected:** a sentence explaining what happened and what to do
- **Actual:** `Status: failed — User rejected the request. Details: User rejected the request. Version: viem@2.56.9`
- **Root cause:** `WriteBox` passed `error.message` straight through. viem appends `Details:` and `Version: viem@…` to its messages, and the status line was rendered in a monospace debug style.
- **Fix:** `explainWriteError()` translates the known cases (4001 rejection, -32002 pending, wrong network, rate limit, connectivity, missing transaction), passes our own already-human messages through, and strips library versions from anything else. The status line is now prose, and a failed write says explicitly that nothing was written and that the button is ready to retry.
- **Verification:** rejection now reads "You rejected the signature in your wallet, so nothing was sent. You can change your mind and try again." Eight unit tests pin the mapping and assert no `viem@`, `Details:`, or `node_modules` ever reaches the user.

### QA-004 — Contract enums and raw timestamps in plain-language prose
- **Severity:** MEDIUM
- **Flow:** Opportunity detail, assessment, drift
- **User expected:** to read the page
- **Actual:** "Components: LENDING_INTEREST. Flags: SINGLE_SOURCE." and `2026-09-26T08:39:40Z`. The page had just explained the same thing in plain words ("Borrower interest") and then printed the raw code.
- **Root cause:** the narrative pages interpolated the stored record directly.
- **Fix:** `componentList()`, `flagList()`, `assessedWhen()`, plus `EVIDENCE_COPY` and `CONFIDENCE_COPY`. "2 ok / 0 failed" became "2 of 2 pages", and the assessment line reads "Assessed 2026-09-26 at 08:39 UTC · policy 1 · revision 1". The raw codes remain available on the record and via the API.
- **Verification:** no raw enum or ISO instant remains on the narrative pages. Covered by `copy.test.ts` and `user-qa.spec.ts`.

### QA-005 — Policy page required decoding booleans and a seconds count
- **Severity:** MEDIUM
- **Flow:** Policy inspection (step 5)
- **User expected:** to answer "what would this reject?"
- **Actual:** a list of `true`/`false` values and "Max age (seconds) 604800". A user cannot answer the question without knowing that a missing allow flag means rejection.
- **Root cause:** the page rendered the stored fields.
- **Fix:** rows now state the outcome — "rejected", "allowed", "sent to review" — with rejections emphasised, and the freshness row reads "7 days". Added a lead paragraph stating that this policy decides whether a market may pass and does not decide where the yield comes from.
- **Verification:** `user-qa.spec.ts` asserts no `Max age (seconds)` and no `604800` on the page.

### QA-006 — Drift page printed a raw enum inside a sentence
- **Severity:** MEDIUM
- **Flow:** Yield Drift (step 10)
- **User expected:** to see what changed
- **Actual:** "Changed from Borrower interest. LENDING_INTEREST entered the set." and a raw ISO date.
- **Root cause:** raw record interpolation, same as QA-004.
- **Fix:** "Changed from X to Y. That is the drift." and a readable timestamp plus the policy id.
- **Verification:** `user-qa.spec.ts` asserts neither pattern appears.

### QA-007 — Drift page said nothing when there was nothing to compare
- **Severity:** MEDIUM
- **Flow:** Yield Drift (step 10)
- **User expected:** to understand the single-assessment state
- **Actual:** one assessment rendered with no indication that reassessment had never happened. A user cannot tell whether they are looking at a complete history or a truncated one.
- **Root cause:** the empty-state branch only fired at zero assessments.
- **Fix:** a dedicated single-assessment explanation: "This market has one assessment so far, so there is nothing to compare it against yet." Each revision now also shows its reason in plain language.
- **Verification:** `user-qa.spec.ts` asserts the explanation is present.

### QA-008 — Assessment timestamp was absent from the opportunity page
- **Severity:** MEDIUM
- **Flow:** Evidence (step 4)
- **User expected:** to know when the reading was taken, since the product gates on staleness
- **Actual:** the opportunity page never showed a time. The raw time existed only on the drift page, in ISO form.
- **Root cause:** the field was rendered on the history page only.
- **Fix:** added "Assessed … · policy … · revision …" beneath the evidence block.
- **Verification:** `user-qa.spec.ts` asserts the readable form is present.

### QA-009 — Regression I introduced: the final state lost its hash and Studio link
- **Severity:** MEDIUM
- **Flow:** Transaction lifecycle (step 9)
- **User expected:** the transaction hash and a way to look it up
- **Actual:** after improving the status copy, the "Final is not the same as approved… GenLayer Studio" block stopped rendering entirely.
- **Root cause:** `WriteBox` recovered the hash by testing the whole status string against `/^0x[0-9a-f]{64}$/`. My new status text is a sentence with a *shortened* hash, so the match failed and the block was suppressed. The copy improvement silently broke the link to the transaction.
- **Fix:** the hash is now its own state, captured from the submitted phase and retained, rather than re-derived from display text.
- **Verification:** driven against a real finalized transaction; the full hash and Studio link render, and the text now states that final is not the same as approved. Covered by `qa-txlifecycle.mjs`.

### QA-010 — Wrong-network handling was silent and could fall through
- **Severity:** MEDIUM
- **Flow:** Wallet failure
- **User expected:** to be told the wallet is on the wrong network
- **Actual:** the status said "Switching to GenLayer Studionet." and then, if `wallet_addEthereumChain` also failed, the raw error surfaced instead. The user was never asked to act.
- **Root cause:** the switch message was a passive statement, and a declined add fell through to a signing attempt.
- **Fix:** the message now asks the user to approve the switch, and a declined switch/add throws a plain "GenLayer Studionet is not in your wallet… Nothing was sent."

### QA-011 — Freshness window had no explanation
- **Severity:** LOW
- **Flow:** Create policy (step 6)
- **User expected:** to know what 0 means
- **Actual:** a bare "Freshness window (days)" number input; 0 silently means "no limit".
- **Fix:** helper text explaining that older readings go to review and that 0 means no time limit.

### QA-012 — Regression in my own test, not the product
- **Severity:** not a product defect
- The `walk.spec.ts` collector excluded the deliberate 404 from `failed` but not from `errors`, and its `failed` filter was pinned to a dev origin so it was dead elsewhere. Both fixed, making the check stricter rather than weaker.

## Not defects

- **Policy detail appeared to render the index.** My first probe read the DOM before the client-side route transition. A re-test with an explicit wait confirmed the page renders correctly. No change made.
- **`Sign` in the nav** is the submit flow and is consistent with the page it leads to. Left alone.

## Technical Evidence

| Check | Result |
|---|---|
| Console errors | **0** across 26 route renders, all interactive flows, and every failure path |
| CSP violations | 0 |
| Failed assets / hydration errors | 0 |
| Unhandled promise rejections | 0 |
| Production 5xx | **0** across 20 routes and the full E2E suite |
| Backend health / readiness | `ready`, `database ok`, `migrations applied`, `chain ok` |
| Indexer cursor | 2 / 1, no error, matches the chain counts |
| Duplicate activity | 0 duplicate groups |
| Stale index vs chain | no divergence; backend, frontend, and contract all report the same revision 1 |
| Double submit | three forced clicks produce exactly one wallet request |
| Keyboard | first tab stop is "Skip to content"; the sign control focuses with a visible 2px outline and activates with Enter |
| Accessibility | 0 issues over 8 routes: every control labelled, one `h1` per page, no heading-level jumps, `lang` set |
| Overflow | none at 320, 360, 390, 768, or 1280 px across 13 routes |
| Mobile nav | opens at every phone width |
| Playwright | **30/30** (desktop + mobile) |

## Real Wallet

| | |
|---|---|
| Connected wallet | **none** — no injected EIP-1193 provider is available in this environment |
| Action | `assess(1, 1)` from `/opportunities/1` |
| Tx | none submitted by this session |
| Consensus | n/a |
| Finality | n/a |
| Canonical state | unchanged: assessment count 1, revision 1, `APPROVED` / `POLICY_PASS` |

The signing path was driven with a **stub provider in the test browser only**. Nothing was sent to
Studionet and no production state changed — verified by re-reading the assessment count (1) and the
contract hash after the run. The stub exercised rejection, wrong network, a hanging wallet, and a
real finalized transaction returned to the receipt-reading path. It is **not** evidence of a real
signature, and none is claimed.

## Result

**PARTIAL.** All UX defects found are fixed and re-verified against production. The one gate that
remains is a real user-wallet-signed production transaction.
