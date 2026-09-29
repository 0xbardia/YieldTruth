# Architecture

```
browser wallet
    -> genlayer-js writeContract
        -> GenLayer validators
            -> YieldTruth contract
                -> classification via run_nondet, equivalence in code
                -> evaluate_policy
                -> append-only assessment

read API + Postgres index  ->  desk
```

The contract is the authority for policies, opportunities, assessments, and verdicts. Postgres is a read index. If they disagree, finalized contract reads win and the indexer repairs forward. The cursor does not advance when a read fails.

The UI "preview gate" calls the TypeScript mirror of `evaluate_policy` and says so. It is not a new consensus vote.

## Why one process

The shipping application is TanStack Start: pages and `/api/v1` routes in one deployable. A second Fastify service was not added. There is no Redis, queue, or ORM. Indexing runs on read when a contract address is configured, in bounded batches, and is idempotent.

## Config

`src/lib/yieldtruth/config.ts` is the server config. `public-config.ts` is the browser subset (`VITE_` only). Unknown `GENLAYER_NETWORK` values throw. Studionet must be chain id 61999.

## Auth

Desk rows are public and unowned. There is no wallet-session API. A connected address is not treated as proof of anything except the signature on a contract write.
