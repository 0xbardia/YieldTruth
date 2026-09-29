#!/usr/bin/env node
// Section 1 verification: drive the real production write path with NO wallet
// present and record exactly where it stops. Also proves the canonical state the
// frontend renders matches the contract read.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.YT_BASE || "https://yieldtruth.bydx.fun";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
const netlog = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("request", (r) => {
  const u = r.url();
  if (/studio\.genlayer\.com|grok\.com/.test(u)) netlog.push(`${r.method()} ${u.slice(0, 90)}`);
});

await page.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle", timeout: 45000 });

// Canonical state as rendered by the production frontend.
const rendered = await page.evaluate(() => {
  const t = document.body.innerText;
  const has = (s) => t.includes(s);
  return {
    approved: has("Approved"),
    sufficient: has("SUFFICIENT"),
    medium: has("MEDIUM"),
    lendingInterest: has("LENDING_INTEREST"),
    sources: (t.match(/2 ok \/ 0 failed/) || [])[0] || null,
    onChainIndex: has("On-chain index"),
  };
});

// Confirm what the browser itself believes about chain/wallet state.
const chainState = await page.evaluate(() => ({
  hasEthereum: typeof window.ethereum !== "undefined",
  walletConnectProjectIdPresent: Boolean(window.__YT_WC__),
}));

const section = page.locator("section.slip").filter({ hasText: "Ask GenLayer to assess" });
const signButton = section.getByRole("button", { name: "Review and sign" });
const policySelect = page.locator("#policy");
const policyValue = await policySelect.inputValue();
const policyLabel = await policySelect.locator(`option[value="${policyValue}"]`).textContent();

await signButton.scrollIntoViewIfNeeded();
await signButton.click();
await page.waitForTimeout(4000);

const status = await section.locator("p.font-mono").first().innerText().catch(() => "<none>");

console.log(
  JSON.stringify(
    {
      url: `${BASE}/opportunities/1`,
      rendered_canonical_state: rendered,
      chain_state: chainState,
      selected_policy: { id: policyValue, name: (policyLabel || "").trim() },
      write_box_status_after_click: status,
      wallet_signals_issued: netlog,
      errors,
    },
    null,
    2,
  ),
);
await page.screenshot({ path: ROOT + "/screenshots/writebox-nowallet.png", fullPage: false });
await browser.close();
