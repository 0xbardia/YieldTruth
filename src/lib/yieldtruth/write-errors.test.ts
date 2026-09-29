import assert from "node:assert/strict";
import test from "node:test";
import { explainWriteError } from "./write-errors.ts";

// This copy is a trust boundary. A first-time user who is shown
// "Details: … Version: viem@2.56.9" concludes the product is broken. Pin both the
// translation and the guarantee that no library internals survive.
const viemNoise = /Version:\s*viem@|Details:|viem@[\d.]+|node_modules|at Object\./;

test("a rejected signature says what happened and offers a retry", () => {
  for (const error of [
    Object.assign(new Error("User rejected the request."), { code: 4001 }),
    new Error("User denied transaction signature."),
  ]) {
    const out = explainWriteError(error);
    assert.match(out, /rejected the signature/i);
    assert.match(out, /nothing was sent/i);
    assert.match(out, /try again/i);
    assert.doesNotMatch(out, viemNoise);
  }
});

test("a pending wallet request is distinguished from a rejection", () => {
  const out = explainWriteError(Object.assign(new Error("Request of type eth_sendTransaction already pending"), { code: -32002 }));
  assert.match(out, /already has a request waiting/i);
  assert.doesNotMatch(out, /rejected the signature/i);
  assert.doesNotMatch(out, viemNoise);
});

test("a wrong network names the network to switch to", () => {
  const out = explainWriteError(new Error("Chain id 1 is not supported, call switch"));
  assert.match(out, /GenLayer Studionet/);
  assert.doesNotMatch(out, viemNoise);
});

test("rate limiting and connectivity read as backpressure, not failure", () => {
  const limited = explainWriteError(new Error("Rate limit exceeded: 500 requests per hour\nVersion: viem@2.56.9"));
  assert.match(limited, /rate-limited/i);
  assert.match(limited, /nothing was sent/i);
  assert.doesNotMatch(limited, viemNoise);

  const offline = explainWriteError(new Error("failed to fetch"));
  assert.match(offline, /connection to GenLayer failed/i);
  assert.doesNotMatch(offline, viemNoise);
});

test("a missing transaction does not claim the write failed outright", () => {
  const out = explainWriteError(new Error("Transaction null not found Version: viem@2.56.9"));
  assert.match(out, /could not find/i);
  assert.match(out, /may still be propagating/i);
  assert.doesNotMatch(out, viemNoise);
});

test("our own already-human messages pass through unchanged", () => {
  const ours = "Transaction 0x1234…abcd reached the chain but the validators did not all agree, so nothing was stored.";
  assert.equal(explainWriteError(new Error(ours)), ours);
  const switched = "GenLayer Studionet is not in your wallet and the switch was declined.";
  assert.equal(explainWriteError(new Error(switched)), switched);
  const sent = "Sent as 0x1234…abcd. Waiting for GenLayer validators to agree.";
  assert.equal(explainWriteError(new Error(sent)), sent);
});

test("an unrecognised error is still summarised without internals", () => {
  const out = explainWriteError(new Error("Something odd happened\nVersion: viem@2.56.9"));
  assert.match(out, /Something odd happened/);
  assert.doesNotMatch(out, /Version:/);
  assert.doesNotMatch(out, viemNoise);
});

test("a missing or empty error still yields an actionable sentence", () => {
  for (const input of [undefined, null, new Error("")]) {
    const out = explainWriteError(input);
    assert.ok(out.length > 0);
    assert.doesNotMatch(out, viemNoise);
  }
});
