# Plan

## Chosen shape

One TanStack Start application, one Python contract, Postgres (embedded when no `DATABASE_URL`). No Fastify sidecar, no queue, no ORM. Ponytail's rule here is the small path: the indexer is a function called from reads, not a worker fleet.

## Contract

Pin the docs runner `1jb45aa8…` because that is what Direct Mode on genlayer-test 0.29.2 executes. Studio's GitHub examples use a newer pin (`9b8kjyda…`). Both pins were rejected by Studionet as `invalid_contract` from genlayer-js 1.1.8, so changing the pin would not have produced a certified deployment and would have broken Direct Mode.

## Verification order

Direct Mode, unit tests, typecheck, production build, browser smoke, one Studionet deploy. Stop the deploy loop after the upstream control contract fails the same way.
