# Security findings

Date: 2026-09-26  
Scope: `contracts/yield_truth.py`, YieldTruth API routes, wallet write path, dependency set used by the desk  
Commit: no git repository in this workspace  
Methodology: contract read, Direct Mode adversarial tests, TypeScript mirror tests, indexer tests, dependency versions as installed, one Studionet deploy attempt. Not a third-party audit. No Gold/Silver tier is claimed.

## Severity

| Level | Meaning |
|---|---|
| Critical | Remote loss of funds or a forged APPROVED from untrusted input |
| High | Auth bypass, stored verdict override, or SSRF that fetches arbitrary hosts |
| Medium | Defense weaker than the design, exploitable with conditions |
| Low | Hardening gap with limited impact |

## Findings

### YT-001

- Severity: Medium
- Component: Contract URL checks
- Description: Dotted public IPv4 hosts were treated as normal names, so an owner could register them.
- Exploit scenario: Owner registers `8.8.8.8` and users submit it as evidence, bypassing the name registry's intent.
- Fix: Any all-numeric hostname is rejected as an IP literal.
- Verification: Direct Mode `register_source("8.8.8.8")` reverts with `ip host rejected`.
- Status: FIXED

### YT-002

- Severity: Medium
- Component: Equivalence principle
- Description: Agreement on enums used to be an LLM vote via `prompt_comparative` and the operator-customizable `EqComparative` template.
- Exploit scenario: Validators could accept mismatched component sets if the template was looser than the principle text.
- Fix: `assess` uses `gl.vm.run_nondet`. The validator re-runs classification and compares schema version, evidence state, primary component, component set, risk-flag set, confidence, and source counts in Python. Extra keys, including a verdict, are not equivalent. Rationale wording may differ.
- Verification: Direct Mode `test_validator_compares_fields_in_code`. Studionet `assess` `0xacd5ffc84280b348e59d63707bdc0f89aa1e7b6ab7e79efb9e7e99dee06dbae7` finalized `MAJORITY_AGREE` on this source.
- Status: FIXED

### YT-003

- Severity: Low
- Component: API rate limit
- Description: The limiter is an in-memory map per process. It resets on restart and is not shared across instances.
- Exploit scenario: A client spreads requests across instances to exceed 120 per minute on one route.
- Fix: Not implemented. The routes are reads. Writes are chain transactions.
- Verification: `http.test.ts` covers a single process.
- Status: SUPERSEDED_BY_YT-007
- Note: the original description understated the exposure. See YT-007, which was found during
  the 2026-09-29 root-close certification and was a real, fully exploitable bypass. YT-003's
  "resets on restart" and "not shared across instances" notes are not separately exploitable:
  the deployment is a single PM2 instance (`instances: 1`), so there is no second process to
  spread requests across, and a restart is not attacker-triggerable.

### YT-007

- Severity: Low (was unrecorded; rated Low because the affected surface is the read-only API)
- Component: API rate limit key derivation
- Status: **FIXED** on 2026-09-29
- Description: `clientKey()` derived the rate-limit bucket from the **first** entry of the
  client-supplied `X-Forwarded-For` header. nginx forwards that header with
  `$proxy_add_x_forwarded_for`, which *appends* the real peer to whatever the client sent, so
  the leading entry was fully attacker-controlled.
- Exploit scenario: Rotating a spoofed `X-Forwarded-For` per request minted a fresh bucket
  every time. Reproduced against production before the fix: 130 consecutive requests with a
  rotating header returned 130 × 200 and 0 × 429, against a configured limit of 120/min.
  The same 130 requests without a header correctly returned 120 × 200 and 10 × 429, so the
  limiter was fully bypassable rather than merely loose.
- Fix: key on `X-Real-IP`, which nginx *overwrites* with `$remote_addr` and which cannot be
  supplied by a client. When that header is absent the key falls back to a single shared
  `unattributed` bucket, so the failure mode is stricter, never looser. The backend binds to
  `127.0.0.1:4330` and is only reachable through the nginx vhost, so the header is trustworthy
  in this topology.
- Verification: `http.test.ts` pins three properties — a rotating `X-Forwarded-For` collapses
  to one bucket, a missing trusted header fails closed to the shared bucket, and the guard
  refuses 10 of 130 requests under header rotation. Re-tested against production after the
  fix: 120 × 200 and 10 × 429 on a clean window.

### YT-008

- Severity: Low
- Component: Chain sync against a rate-limited public RPC
- Status: **FIXED** on 2026-09-29
- Description: `catchUpFromChain` used a 12-second success cooldown and no failure backoff.
  The public Studio RPC is capped at 500 requests/hour and a full catch-up costs 7, so a burst
  of page loads exhausted the shared window, and because the failure did not update
  `lastSuccessAt`, every subsequent request retried straight back into the cap.
- Exploit scenario: A modest burst of navigation (for example the QA walk, 17 pages) drove the
  app into the cap, after which `yt_sync.last_error` was stuck at "Rate limit exceeded: 500
  requests per hour" and readiness reported `chain: down`. The outage sustained itself.
- Fix: the success cooldown is now 60 seconds (60 syncs/hour × 7 calls = 420, inside the 500
  budget), and a rate-limited response sets a 120-second backoff during which catch-up issues no
  requests. The error is still returned to the caller and still recorded in `yt_sync`; nothing
  is swallowed.
- Verification: a 40-request burst against production produced 1 new rate-limit error (the first
  attempt) instead of one per request. `chain-sync.test.ts` pins that a rate-limited response
  causes the next call to be skipped.

### YT-005

- Severity: Low
- Component: Content security policy
- Description: API responses set `nosniff` and a referrer policy. There was no CSP on the HTML
  shell. The hosted shell loads a script from grok.com.
- Exploit scenario: XSS would not be blocked by CSP. The desk renders text, not HTML from
  assessments (`dangerouslySetInnerHTML` is not used).
- Fix: **FIXED** on 2026-09-29 — a CSP now ships on the TLS vhost. The inline hydration payload
  means `script-src` must keep `'unsafe-inline'`; that residual is stated rather than hidden.
  The directives that do real work are `connect-src` (pinned to `'self'`, the Studio RPC, and
  `grok.com`, so assessment data cannot be exfiltrated to an arbitrary host), `object-src 'none'`,
  `base-uri 'self'` (no base-tag hijack), `frame-ancestors 'none'`, and `form-action 'self'`.
- Verification: the first attempt broke the Google Fonts stylesheet and was caught by browser
  verification before shipping; `https://fonts.googleapis.com` was added to `style-src` and
  `https://fonts.gstatic.com` to `font-src`. A production browser run over 13 routes × desktop
  and mobile then reported 26/26 rendered, 0 console errors, 0 CSP violations, 0 5xx, and the
  `https://grok.com/grok-app-builder/extensions.js` branding script still present and unblocked.
- Status: FIXED (residual: `script-src 'unsafe-inline'`, which cannot be removed without a
  per-response nonce, and would require changing the platform-owned shell injector)

### YT-009

- Severity: Low
- Component: Fixture (teaching) records
- Status: **FIXED** on 2026-09-29
- Description: the two seeded fixture policies set `max_age_seconds: 604800` (7 days) while the
  fixture assessments carry a fixed `assessed_at` of `2026-09-20T12:00:00Z`. On 2026-09-27 every
  fixture aged past the window and silently became `REVIEW_REQUIRED` / `STALE_ASSESSMENT`, so the
  "Preview gate" control could no longer demonstrate an `APPROVED` outcome and the teaching
  records stopped teaching.
- Exploit scenario: None. This is a correctness defect in demo data, not an attack surface.
- Fix: the fixture policies now set `max_age_seconds: 0` ("age is not gated"), which is the honest
  setting for a record explicitly labelled "not a live reading". Chain policies are untouched and
  still gate on 7 days.
- Verification: the gate preview on opportunity 9003 against the subsidy-tolerant fixture policy
  returns `APPROVED` again, and the staleness gate remains enforced and unit-tested — including
  the exact 604800-second boundary against the real Policy 1 rules in `policy.test.ts`.

### YT-006

- Severity: Info
- Component: Indexer
- Description: Catch-up runs when a contract address is set. Explore, the opportunity list, and readiness call it with an 8 second timeout. Fixture rows cannot be overwritten (`origin <> 'fixture'`). A live read of policy and opportunity counts succeeded after deploy.
- Exploit scenario: A bad view payload throws and the cursor stays put. That is the intended fail-closed behaviour, unit-tested.
- Fix: `chain-sync.server.ts`.
- Verification: `indexer.test.ts`, `chain-sync.test.ts`, and a Studionet read of the deployed views.
- Status: CLOSED

## Open counts

Updated 2026-09-29 during the root-close certification.

| Severity | Open | Note |
|---|---|---|
| Critical | 0 | |
| High | 0 | |
| Medium | 0 | 22 Moderate dependency advisories are triaged in `FINAL_V1_REPORT.md`; both leaf causes are proven absent from every shipped artifact |
| Low | 1 | YT-005 residual: `script-src 'unsafe-inline'` |

All previously accepted Low findings were re-examined rather than carried forward:

- **YT-003** superseded by **YT-007**, which was a real reproducible bypass and is now fixed.
- **YT-005** (no CSP) fixed, with one documented residual.
- **YT-004** (empty WalletConnect project id) remains fixed; see YT-010 below for the
  functional consequence.

### YT-010

- Severity: Low (functional, not a vulnerability)
- Component: WalletConnect
- Description: `VITE_WALLETCONNECT_PROJECT_ID` is empty, so `wallet.tsx` builds the wagmi config
  with `connectors: [injected()]` and RainbowKit offers only the injected browser wallet.
- Impact: a visitor on a mobile browser with no injected EIP-1193 provider has no way to connect
  a wallet. The write path is desktop-only until a real project id is supplied.
- Why it is not fixed here: a WalletConnect Cloud project id is a third-party credential that
  must be issued and paid for by the project owner. It cannot be invented, and shipping a
  placeholder would be worse than shipping none.
- Status: ACCEPTED — requires an owner-supplied credential, not a code change.

