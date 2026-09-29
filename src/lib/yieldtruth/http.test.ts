import assert from "node:assert/strict";
import test from "node:test";
import { clientKey, guard, rateLimitSize, readId, readPage, resetRateLimits, takeRateLimit } from "./http.ts";

function req(headers: Record<string, string>): Request {
  return new Request("https://desk.local/api/v1/opportunities", { headers });
}

test("rate limit identity ignores a spoofed X-Forwarded-For chain", () => {
  // nginx overwrites X-Real-IP; XFF is client-controlled and must not key buckets.
  const spoofed = Array.from({ length: 200 }, (_, i) =>
    clientKey(req({ "x-real-ip": "203.0.113.9", "x-forwarded-for": `198.51.${Math.floor(i / 256)}.${i % 256}, 203.0.113.9` })),
  );
  assert.equal(new Set(spoofed).size, 1, "rotated XFF must not create new buckets");
  assert.equal(spoofed[0], "203.0.113.9");
});

test("rate limit identity fails closed when no trusted header is present", () => {
  assert.equal(clientKey(req({})), "unattributed");
  assert.equal(clientKey(req({ "x-forwarded-for": "1.2.3.4" })), "unattributed");
});

test("the guard refuses a rotating-header flood instead of admitting it", () => {
  resetRateLimits();
  let refused = 0;
  for (let i = 0; i < 130; i += 1) {
    const response = guard(
      req({ "x-real-ip": "203.0.113.9", "x-forwarded-for": `198.51.${Math.floor(i / 256)}.${i % 256}` }),
    );
    if (response && response.status === 429) refused += 1;
  }
  assert.equal(refused, 10);
  resetRateLimits();
});

test("rate limit eventually refuses a key", () => {
  resetRateLimits();
  let allowed = 0;
  for (let i = 0; i < 130; i += 1) {
    if (takeRateLimit("tester", 1_000)) allowed += 1;
  }
  assert.equal(allowed, 120);
  assert.equal(takeRateLimit("other", 1_000), true);
});

test("a new window allows the key again", () => {
  resetRateLimits();
  assert.equal(takeRateLimit("window", 1_000), true);
  assert.equal(takeRateLimit("window", 1_000 + 60_000), true);
});

test("rate limit map stays bounded", () => {
  resetRateLimits();
  for (let i = 0; i < 2_500; i += 1) takeRateLimit(`k${i}`, 1_000);
  assert.ok(rateLimitSize() <= 2_000);
});

test("page query rejects fractions and huge offsets", () => {
  assert.deepEqual(readPage(new URL("https://desk.local/api?limit=20&offset=0")), { limit: 20, offset: 0 });
  assert.deepEqual(readPage(new URL("https://desk.local/api")), { limit: 20, offset: 0 });
  assert.deepEqual(readPage(new URL("https://desk.local/api?limit=20.5")), { error: "bad page" });
  assert.deepEqual(readPage(new URL("https://desk.local/api?offset=-1")), { error: "bad page" });
  assert.deepEqual(readPage(new URL("https://desk.local/api?limit=500")), { error: "bad page" });
});

test("ids are positive integers without padding", () => {
  assert.equal(readId("9001"), 9001);
  assert.equal(readId("01"), null);
  assert.equal(readId("1.2"), null);
  assert.equal(readId("-3"), null);
  assert.equal(readId("1e2"), null);
});
