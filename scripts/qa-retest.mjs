#!/usr/bin/env node
// Retest of the exact user flows that failed, against production.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "screenshots", "qa");
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.YT_BASE || "https://yieldtruth.bydx.fun";
const b = await chromium.launch({ args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const out = {};

// FINDING: two on-chain policies both named "Treasury desk" were indistinguishable
await p.goto(`${BASE}/policies`, { waitUntil: "networkidle" });
out.policy_links = await p.evaluate(() =>
  [...document.querySelectorAll("a")]
    .map((a) => ({ t: a.innerText.trim(), h: a.getAttribute("href") }))
    .filter((x) => /Treasury/i.test(x.t)),
);

// Policy detail now answers "what would this reject?" in words
await p.goto(`${BASE}/policies/1`, { waitUntil: "networkidle" });
out.policy_detail = await p.evaluate(() => ({
  h1: document.querySelector("h1")?.innerText ?? null,
  text: document.body.innerText.slice(0, 1400),
  rawBooleans: /\btrue\b|\bfalse\b/.test(document.body.innerText),
  rawSeconds: /Max age \(seconds\)|\b604800\b/.test(document.body.innerText),
}));
await p.screenshot({ path: join(SHOTS, "fix-policy-detail.png") });

// Opportunity detail: plain-language metadata + assessment time
await p.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
out.opportunity = await p.evaluate(() => {
  const t = document.body.innerText;
  return {
    rawEnums: /Components:\s*[A-Z_]{4,}|Flags:\s*[A-Z_]{4,}/.test(t),
    rawIsoTime: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(t),
    hasAssessedWhen: /Assessed \d{4}-\d{2}-\d{2} at \d{2}:\d{2} UTC/.test(t),
    sourceCountPlain: /\d of \d pages/.test(t),
    text: t.slice(0, 1500),
  };
});
await p.screenshot({ path: join(SHOTS, "fix-opportunity.png") });

// Pre-signature explanation
out.pre_signature = await p.evaluate(() => {
  const box = [...document.querySelectorAll("section")].find((s) => /Ask GenLayer to assess/i.test(s.innerText));
  const t = box ? box.innerText : "";
  return {
    namesOpportunity: /Assess “Aave supply interest”/.test(t),
    namesPolicy: /Treasury desk \(#\d\)/.test(t),
    saysPermanent: /permanent record/i.test(t),
    saysConsensusTakesTime: /validator|minute|two/i.test(t),
    saysNotGuaranteed: /does not guarantee/i.test(t),
    text: t,
  };
});
await p.screenshot({ path: join(SHOTS, "fix-presignature.png") });

// Policy selector is now unambiguous
out.selector = await p.evaluate(() => {
  const s = document.querySelector("#policy");
  return s ? [...s.options].map((o) => o.textContent.trim()) : null;
});

// Drift: raw enum in a sentence, raw ISO, and single-assessment explanation
await p.goto(`${BASE}/opportunities/1/drift`, { waitUntil: "networkidle" });
out.drift = await p.evaluate(() => {
  const t = document.body.innerText;
  return {
    rawEnumInSentence: /entered the set|LENDING_INTEREST entered/.test(t),
    rawIso: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(t),
    singleAssessmentExplained: /one assessment so far/i.test(t),
    showsReason: /Rejected|no forbidden|evidence/i.test(t),
    text: t.slice(0, 1100),
  };
});
await p.screenshot({ path: join(SHOTS, "fix-drift.png") });

console.log(JSON.stringify(out, null, 2));
await b.close();
