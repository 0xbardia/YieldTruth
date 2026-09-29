# YieldTruth — Production Deployment Report

- **Status:** LIVE
- **Public URL:** https://yieldtruth.bydx.fun
- **Date:** 2026-09-29

Paths in this document are shown as `<app>` and are the values used on the deploying host. The
deployment scripts derive every path from their own location, so a checkout works from any
directory.

## Services

| Piece | Detail |
|---|---|
| App process | PM2 app `yieldtruth`, single fork instance, running `scripts/serve-prod.sh` → `srvx serve --prod` on a **loopback-only** port (default `4330`) |
| Database | PostgreSQL database `yieldtruth_prod`, role `yieldtruth`, on loopback `127.0.0.1:5432` |
| Migrations | `migrations/0002_yieldtruth.sql`, tracked in the `_migrations` table |
| Tables | `yt_sync`, `yt_sources`, `yt_policies`, `yt_opportunities`, `yt_assessments`, `yt_activity` |
| Reverse proxy | nginx TLS vhost `yieldtruth.bydx.fun` proxying to the loopback port with `X-Forwarded-*` and WebSocket upgrade headers |
| TLS | Let's Encrypt certificate via webroot, HTTP → HTTPS 301 |
| PM2 persistence | `pm2 save`, restored on boot by `pm2-root.service` |

There is no separate backend process by design. The application is a single TanStack Start process
serving SSR pages and `/api/v1/*` from one entry point.

## Restart contract

`startup.sh` is the idempotent, non-blocking restart contract. It:

1. ensures nginx and PostgreSQL are active,
2. probes the **application port** rather than the process table, because a live process with a
   dead listener is still an outage,
3. starts or restarts the PM2 app only when the probe fails,
4. runs `pm2 save` so the registry survives a daemon restart,
5. reports, but never fails on, a slow public check.

Running it twice in a row is a no-op the second time. This exists because the app was once dropped
from the PM2 registry, which left the public URL returning `502` while the source and database were
intact.

## Environment

`<app>/.env` (mode `600`) follows `.env.example`. Production sets the public app URL, a production
`NODE_ENV`, a loopback host/port, a dedicated `DATABASE_URL`, and the GenLayer Studionet values
(chain `61999`, `https://studio.genlayer.com/api`, and the contract address).

`.env` is gitignored, is mode `600`, and is verified absent from the distributable source archive.
Server-only secrets are never exposed through `VITE_*` variables; only the app URL, RPC URL, chain
id, and contract address are public by design.

## GenLayer and wallet

- Network **Studionet**, chain id `61999`, RPC `https://studio.genlayer.com/api`
- Contract `0x23C029E1aB24f74b355EF05f7b540296BEdD6279`
- Writes are signed in the browser: RainbowKit → the user's wallet → `genlayer-js`
  `writeContract`. No user private key exists on the server, and the backend's chain client is
  created without an account or provider.

Browser-signed transactions on this address, each `FINALIZED` with `MAJORITY_AGREE`:

| Call | Hash |
|---|---|
| `create_policy` | `0x019077e53f0ce0bb6221da7db124f39febf092f20b1fd1038e56d1e986c258cf` |
| `submit_opportunity` | `0xf29bf7b8ad3994d87cbcc9049b661d1477f363d59cb8bcc532b43a132bfd2bb2` |
| `assess` | `0xacd5ffc84280b348e59d63707bdc0f89aa1e7b6ab7e79efb9e7e99dee06dbae7` |

The stored assessment read both evidence pages, named lending interest at medium confidence, and was
approved by the treasury policy. Full details in [docs/deployment.md](../docs/deployment.md).

## Indexer and the public RPC quota

`/api/v1/health/ready` reports `chain: ok` with live cursors (`policy_cursor`, `opportunity_cursor`),
meaning the desk synced finalized on-chain views.

The public Studionet RPC enforces a **500 requests per hour** quota on contract reads, and one full
catch-up costs 7 calls. Two defects were found and fixed here:

- the sync cooldown was 12 seconds, which under traffic implied far more than 500 calls per hour and
  exhausted the shared quota,
- a rate-limited response was retried on the very next request, so the outage sustained itself.

The cadence is now 5 minutes (about 84 calls/hour, roughly 17% of the shared budget) with a
120-second backoff after a rate-limited response. The error is still surfaced in `yt_sync.last_error`
and readiness still reports `degraded`, so nothing is hidden. Self-recovery was verified end to end:
after the quota reset, readiness returned to `ready` with the cursor preserved and the error
cleared.

**Operational consequence:** a freshly finalized assessment can take up to 5 minutes to appear in the
index. Supplying a dedicated RPC endpoint removes the shared cap and permits a much shorter
interval. This is a deployment decision, not a code change.

## Build and test results

| Gate | Result |
|---|---|
| `npm run lint` | PASS, 0 errors (2 pre-existing warnings in untouched files) |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 271 tests, 0 failures |
| `npm run build` | PASS |
| `npm audit --audit-level=high` | PASS, 0 high, 0 critical (22 moderate triaged) |
| Secret scan | PASS, 0 findings, `.env` excluded |
| Playwright desktop | PASS |
| Playwright mobile | PASS |
| Console errors | 0 |
| Production 5xx | 0 |

Direct Mode (`pytest tests/direct`, 14 tests) was **not re-run on the deployment host** because the
`genlayer-test` runner and its Python environment are not installed there. Those tests were last
executed against this exact contract source, and the deployed source hash is unchanged. This is
reported rather than implied to have passed on the deployment host.

## Dependency and code decisions

1. **`wagmi` pinned to `^2.12.0`** (resolves to 2.19.5). RainbowKit 2.2.11 declares peer
   `wagmi ^2.9.0`, so a `wagmi 3.x` resolution fails install with `ERESOLVE`. The wallet code uses
   only APIs present in both majors.
2. **`@x402/evm` added explicitly.** wagmi 2.x pulls `@wagmi/connectors` → `@base-org/account` →
   `@coinbase/cdp-sdk`, whose ESM build unconditionally imports the *optional* peer `@x402/evm`.
   Without it the production build failed with `MISSING_EXPORT toClientEvmSigner`. One explicit
   optional peer, no config workaround.

## Security posture

Content-Security-Policy is served on the TLS vhost. The inline hydration payload means
`script-src` must keep `'unsafe-inline'`; that residual is documented rather than hidden. The
directives that do the work are `connect-src` (pinned, so assessment data cannot be exfiltrated to
an arbitrary host), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, and
`form-action 'self'`.

Findings and their status: [SECURITY_FINDINGS.md](SECURITY_FINDINGS.md).

## Remaining limitations

1. The final certification gate — one real user-wallet-signed production transaction — requires a
   human signature. Status is `PARTIAL` until it is executed.
2. `VITE_WALLETCONNECT_PROJECT_ID` is empty, so only an injected browser wallet is offered and the
   write path is desktop-only. Obtain a project id from WalletConnect Cloud, set it in `.env`,
   rebuild, and restart. It is a public identifier, not a secret.
3. A finalized assessment can take up to 5 minutes to appear in the index while the public RPC quota
   is shared, as described above.
4. `script-src 'unsafe-inline'` remains in the CSP because of the inline hydration payload.
5. Direct Mode contract tests are not runnable on the deployment host.
