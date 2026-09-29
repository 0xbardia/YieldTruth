#!/usr/bin/env node
// First-time-user QA session. Drives the production site the way a person would:
// no developer hints, no knowledge of the architecture. Records what the page
// actually says at each step so friction can be judged from evidence.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "screenshots", "qa");
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.YT_BASE || "https://yieldtruth.bydx.fun";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const consoleErrors = [];
const netFailures = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 400) netFailures.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

const step = {};
const shot = async (n) => page.screenshot({ path: join(SHOTS, `${n}.png`), fullPage: false });

// 1. First impression: what does a newcomer actually see above the fold?
await page.goto(BASE, { waitUntil: "networkidle" });
step.landing_above_fold = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    h1: document.querySelector("h1")?.innerText ?? null,
    firstScreenText: t.slice(0, 700),
    links: [...document.querySelectorAll("a")].slice(0, 12).map((a) => a.innerText.trim()).filter(Boolean),
    buttons: [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean),
    isThereAnApyNumber: /APY|\d+(\.\d+)?%/.test(t),
  };
});
await shot("01-landing");

// 2. Explore: does a user reach opportunities without being told?
await page.getByRole("link", { name: "Inspect a market" }).click();
await page.waitForLoadState("networkidle");
step.explore = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("tr, article, li")].filter((n) => /Aave|Lido|USDC|APY/i.test(n.innerText));
  return {
    h1: document.querySelector("h1")?.innerText ?? null,
    visibleText: document.body.innerText.slice(0, 1200),
    rowCount: rows.length,
  };
});
await shot("02-explore");

// 3. Opportunity detail
await page.getByRole("link", { name: /Aave/i }).first().click();
await page.waitForLoadState("networkidle");
step.opportunity = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    url: location.pathname,
    h1: document.querySelector("h1")?.innerText ?? null,
    body: t.slice(0, 2000),
    mentionsApyMeaning: /advertised|not a quality score|variable/i.test(t),
    explainsClassificationVsVerdict: /policy|deterministic|consensus|classif/i.test(t),
  };
});
await shot("03-opportunity");

// 4. Evidence section visibility
step.evidence = await page.evaluate(() => {
  const t = document.body.innerText;
  const urls = [...document.querySelectorAll("a")].map((a) => a.href).filter((h) => /^https?:\/\//.test(h));
  return {
    evidenceHeading: /Evidence/i.test(t),
    externalUrls: urls,
    hasSourceCount: /2 ok \/ 0 failed|sources? read/i.test(t),
    hasAssessedAt: /assessed|revision|ago|2026-/i.test(t),
    snippet: t.slice(0, 1600),
  };
});

// 5. Policy page: can a user answer "what would this reject?"
await page.goto(`${BASE}/policies`, { waitUntil: "networkidle" });
step.policies_index = await page.evaluate(() => ({
  h1: document.querySelector("h1")?.innerText ?? null,
  text: document.body.innerText.slice(0, 900),
}));
await shot("05-policies");
const policyLink = page.getByRole("link", { name: /Treasury desk/i }).first();
const hasPolicyLink = (await policyLink.count()) > 0;
if (hasPolicyLink) {
  await policyLink.click();
  await page.waitForLoadState("networkidle");
  step.policy_detail = await page.evaluate(() => ({
    url: location.pathname,
    h1: document.querySelector("h1")?.innerText ?? null,
    text: document.body.innerText.slice(0, 1500),
  }));
  await shot("06-policy-detail");
}

// 6. Create policy form
await page.goto(`${BASE}/policies/new`, { waitUntil: "networkidle" });
step.create_policy = await page.evaluate(() => ({
  url: location.pathname,
  labels: [...document.querySelectorAll("label")].map((l) => l.innerText.trim()).filter(Boolean),
  inputs: [...document.querySelectorAll("input,select,textarea")].map((i) => ({
    type: i.type,
    name: i.name || i.id,
    checked: i.checked,
  })),
  text: document.body.innerText.slice(0, 1800),
}));
await shot("07-create-policy");

// 7. Assessment preparation on opportunity 1
await page.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
step.assessment_prep = await page.evaluate(() => {
  const sel = document.querySelector("#policy");
  return {
    policyOptions: sel ? [...sel.options].map((o) => ({ value: o.value, label: o.textContent.trim() })) : null,
    selected: sel ? sel.value : null,
    hasWriteBox: /Ask GenLayer to assess/i.test(document.body.innerText),
    writeBoxIntent: document.body.innerText.slice(0, 1800),
  };
});
await shot("08-assessment");

// 8. Wallet flow with no wallet
const signBtn = page.getByRole("button", { name: "Review and sign" });
await signBtn.scrollIntoViewIfNeeded();
await signBtn.click();
await page.waitForTimeout(2500);
step.wallet_flow = await page.evaluate(() => {
  const t = document.body.innerText;
  const m = t.match(/Status:\s*([a-z]+)\s*(?:—|--)?\s*([^\n]*)/i);
  return { statusLine: m ? m[0].trim() : null, hasEthereum: typeof window.ethereum !== "undefined" };
});
await shot("09-wallet-nowallet");

// 11. Failure behaviours
step.no_policy_route = await page.evaluate(() => ({ url: location.pathname, h1: document.querySelector("h1")?.innerText ?? null }));
await page.goto(`${BASE}/opportunities/999999`, { waitUntil: "networkidle" });
step.not_found = await page.evaluate(() => ({
  status: document.body.innerText.slice(0, 400),
  hasStack: /at\s+\w+\s+\(|node_modules|stack/i.test(document.body.innerText),
}));
await shot("10-notfound");

step.back_forward = await page.evaluate(() => history.length);
await page.goBack();
await page.waitForLoadState("networkidle");
step.after_back = { url: page.url(), h1: await page.locator("h1").first().textContent().catch(() => null) };

// Direct route refresh
await page.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
await page.reload({ waitUntil: "networkidle" });
step.after_reload = { url: page.url(), h1: await page.locator("h1").first().textContent().catch(() => null) };
await shot("11-after-reload");

// 10. Yield drift
await page.goto(`${BASE}/opportunities/1/drift`, { waitUntil: "networkidle" });
step.drift = await page.evaluate(() => ({
  h1: document.querySelector("h1")?.innerText ?? null,
  text: document.body.innerText.slice(0, 1200),
  hasChangedLabel: /changed from|revision/i.test(document.body.innerText),
}));
await shot("12-drift");

console.log(JSON.stringify({ step, consoleErrors, netFailures }, null, 2));
await browser.close();
