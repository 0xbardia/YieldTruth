#!/usr/bin/env node
// Failure-path QA. A stub EIP-1193 provider stands in for a wallet so the
// reject / wrong-network / slow-consensus / no-consensus branches can be driven
// for real. It is a test double in this browser only: nothing is submitted to
// Studionet and no production state is touched.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "screenshots", "qa");
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.YT_BASE || "https://yieldtruth.bydx.fun";
const out = {};

const b = await chromium.launch({ args: ["--no-sandbox"] });

// --- Wallet rejects the signature (error 4001) ---
{
  const p = await b.newPage();
  await p.addInitScript(() => {
    const provider = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts")
          return ["0x1111111111111111111111111111111111111111"];
        if (method === "eth_chainId") return "0xf22f";
        if (method === "eth_sendTransaction") {
          const e = new Error("User rejected the request.");
          e.code = 4001;
          throw e;
        }
        return null;
      },
      on: () => {},
      removeListener: () => {},
    };
    Object.defineProperty(window, "ethereum", { value: provider, configurable: true });
  });
  await p.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
  const btn = p.getByRole("button", { name: "Review and sign" });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await p.waitForTimeout(2500);
  out.wallet_reject = await p.evaluate(() => {
    const t = document.body.innerText;
    return {
      status: t.match(/Status:\s*[a-z]+[^\n]*/i)?.[0]?.trim() ?? null,
      actionable: /reject|declin|cancel/i.test(t),
      blank: t.trim().length < 50,
    };
  });
  await p.screenshot({ path: join(SHOTS, "fail-wallet-reject.png") });
  await p.close();
}

// --- Wallet on the wrong network ---
{
  const p = await b.newPage();
  await p.addInitScript(() => {
    let chain = "0x1";
    const provider = {
      isMetaMask: true,
      request: async ({ method, params }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts")
          return ["0x1111111111111111111111111111111111111111"];
        if (method === "eth_chainId") return chain;
        if (method === "wallet_switchEthereumChain") {
          chain = params[0].chainId;
          return null;
        }
        return null;
      },
      on: () => {},
      removeListener: () => {},
    };
    Object.defineProperty(window, "ethereum", { value: provider, configurable: true });
  });
  await p.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
  const btn = p.getByRole("button", { name: "Review and sign" });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await p.waitForTimeout(2000);
  out.wrong_network = await p.evaluate(() => {
    const t = document.body.innerText;
    return { mentionsSwitch: /switch/i.test(t), status: t.match(/Status:\s*[a-z]+[^\n]*/i)?.[0]?.trim() ?? null, text: t.slice(-400) };
  });
  await p.screenshot({ path: join(SHOTS, "fail-wrong-network.png") });
  await p.close();
}

// --- Double click / double submit protection ---
{
  const p = await b.newPage();
  await p.addInitScript(() => {
    const provider = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts")
          return ["0x1111111111111111111111111111111111111111"];
        if (method === "eth_chainId") return "0xf22f";
        if (method === "eth_sendTransaction") {
          window.__sendCount = (window.__sendCount || 0) + 1;
          await new Promise((r) => setTimeout(r, 3000));
          return "0x" + "11".repeat(32);
        }
        return null;
      },
      on: () => {},
      removeListener: () => {},
    };
    Object.defineProperty(window, "ethereum", { value: provider, configurable: true });
  });
  await p.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
  const btn = p.getByRole("button", { name: "Review and sign" });
  await btn.scrollIntoViewIfNeeded();
  await Promise.all([btn.click({ force: true }), btn.click({ force: true }), btn.click({ force: true })]);
  await p.waitForTimeout(6000);
  out.double_submit = {
    eth_sendTransaction_calls: await p.evaluate(() => window.__sendCount || 0),
    buttonDisabled: await btn.isDisabled(),
    note: "three forced clicks must produce exactly one wallet request",
  };
  await p.screenshot({ path: join(SHOTS, "fail-double-submit.png") });
  await p.close();
}

// --- API failure: intercept the readiness/config endpoints ---
{
  const p = await b.newPage();
  await p.route("**/api/v1/**", (r) => r.fulfill({ status: 503, body: '{"error":"unavailable"}' }));
  await p.goto(`${BASE}/opportunities/1`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await p.waitForTimeout(3000);
  out.api_failure = await p.evaluate(() => {
    const t = document.body.innerText;
    return {
      hasContent: t.trim().length > 80,
      showsStack: /at\s+\w+\s+\(|node_modules|Error:|undefined is not/i.test(t),
      snippet: t.slice(0, 300),
    };
  });
  await p.screenshot({ path: join(SHOTS, "fail-api.png") });
  await p.close();
}

console.log(JSON.stringify(out, null, 2));
await b.close();
