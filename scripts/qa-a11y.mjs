#!/usr/bin/env node
// Accessibility and keyboard pass over the flows a user must complete.
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

const a11y = async (route) => {
  await p.goto(BASE + route, { waitUntil: "networkidle" });
  return p.evaluate(() => {
    const issues = [];
    // images
    for (const img of document.querySelectorAll("img")) {
      if (!img.hasAttribute("alt")) issues.push(`img without alt: ${img.src.slice(0, 50)}`);
    }
    // form controls must have an accessible name
    for (const el of document.querySelectorAll("input,select,textarea")) {
      const id = el.id;
      const labelled =
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        el.closest("label") ||
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby");
      if (!labelled) issues.push(`unlabelled ${el.tagName.toLowerCase()}${id ? "#" + id : ""}`);
    }
    // buttons must have a discernible name
    for (const btn of document.querySelectorAll("button")) {
      const name = (btn.innerText || "").trim() || btn.getAttribute("aria-label") || btn.title;
      if (!name) issues.push("button without accessible name");
    }
    // one h1
    const h1 = document.querySelectorAll("h1").length;
    if (h1 !== 1) issues.push(`h1 count = ${h1}`);
    // lang
    if (!document.documentElement.getAttribute("lang")) issues.push("html without lang");
    // heading order (no skipped levels)
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) issues.push(`heading jump h${levels[i - 1]} -> h${levels[i]}`);
    }
    return { issues, h1, headings: levels.join(",") };
  });
};

out.a11y = {};
for (const r of ["/", "/explore", "/policies", "/policies/1", "/policies/new", "/opportunities/1", "/opportunities/1/drift", "/opportunities/new"]) {
  out.a11y[r] = await a11y(r);
}

// Keyboard: tab to the sign button and activate with Enter
await p.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
const sign = p.getByRole("button", { name: "Review and sign" });
await sign.scrollIntoViewIfNeeded();
await sign.focus();
out.signFocus = await p.evaluate(() => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  return { tag: el.tagName, text: (el.innerText || "").trim().slice(0, 40), outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle };
});
await p.keyboard.press("Enter");
await p.waitForTimeout(2000);
out.keyboardActivate = await p.evaluate(() => {
  const t = document.body.innerText;
  const m = t.match(/Status:\s*([a-z]+)[^\n]*/i);
  return m ? m[0].trim() : null;
});
await p.screenshot({ path: join(SHOTS, "a11y-keyboard.png") });

// Skip link should be the first tab stop
await p.goto(BASE + "/", { waitUntil: "networkidle" });
await p.keyboard.press("Tab");
out.firstTabStop = await p.evaluate(() => ({ text: (document.activeElement.innerText || "").trim().slice(0, 30), tag: document.activeElement.tagName }));

// Entering a number in the freshness field
await p.goto(`${BASE}/policies/new`, { waitUntil: "networkidle" });
const age = p.locator("#age");
await age.fill("0");
out.ageZero = await p.evaluate(() => document.body.innerText.match(/age is not gated[^.]*\./i)?.[0] ?? null);
await age.fill("7");
out.ageSeven = await p.evaluate(() => document.body.innerText.match(/older than 7 days need review/i)?.[0] ?? null);

console.log(JSON.stringify(out, null, 2));
await b.close();
