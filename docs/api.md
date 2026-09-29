# API

All routes are GET. Contract writes are not duplicated here.

| Route | Notes |
|---|---|
| `/api/v1/health/live` | Process up |
| `/api/v1/health/ready` | Database plus chain. `unconfigured` is still HTTP 200. A configured address with `last_error` is HTTP 503 |
| `/api/v1/config` | Network, chain id, contract address. No secrets |
| `/api/v1/opportunities?limit&offset` | Limit is clamped to 50. Triggers catch-up when a contract is configured |
| `/api/v1/opportunities/:id` | One row |
| `/api/v1/opportunities/:id/assessments` | History, oldest first |
| `/api/v1/assessments/:id` | Id shape `opportunityId-revision` |
| `/api/v1/policies` and `/api/v1/policies/:id` | Structured rules |
| `/api/v1/activity` | Recent desk events |
| `/api/v1/sources` | Host registry mirror |

Responses are JSON. `nosniff` and a strict referrer policy are set. CORS is off unless `CORS_ORIGINS` lists the request origin. Bodies over 16 KB and rates over `RATE_LIMIT_MAX` per window are rejected. The limiter is in-memory per process.

Errors are `{ "error": "..." }` without stack traces.
