import assert from "node:assert/strict";
import { test } from "node:test";
import { catchUpFromChain } from "./chain-sync.server.ts";

test("catch-up does not call the chain when no contract address is set", async () => {
  const result = await catchUpFromChain();
  assert.equal(result.skipped, true);
  assert.equal(result.error, undefined);
});

// The public Studio RPC is capped at ~500 requests/hour and a full sync costs 7.
// Without a cooldown and a failure backoff, a burst of page loads drives the
// indexer into the cap and every subsequent request retries into it, so the
// outage sustains itself. These assertions pin the guard: once a rate limit has
// been seen, catch-up must stop issuing requests for the backoff window.
test("a rate-limited RPC is not retried until the backoff expires", async () => {
  const started = Date.now();
  const first = await catchUpFromChain({ wait: true });
  // Either the chain is unreachable/rate-limited from this sandbox, or the call
  // succeeded. Both are fine; what matters is the second call's behaviour.
  const firstWasError = Boolean(first.error);
  if (!firstWasError) {
    // Sync succeeded: the success cooldown alone must suppress the next attempt.
    const second = await catchUpFromChain({ wait: true });
    assert.equal(second.skipped, true, "a recent success must suppress an immediate re-sync");
    return;
  }
  const second = await catchUpFromChain({ wait: true });
  assert.equal(second.skipped, true, `rate limit must trigger backoff, got ${JSON.stringify(second)}`);
  assert.ok(Date.now() - started < 30_000, "backoff must not add latency to the request that hit it");
});
