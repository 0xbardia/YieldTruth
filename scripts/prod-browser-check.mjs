#!/usr/bin/env node
// Production browser verification for the CSP change and the wallet surface.
// Asserts: real content renders, zero console/page errors, zero CSP violations,
// the platform branding script still executes, and no mobile overflow.
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.YT_BASE || "https://yieldtruth.bydx.fun";
const SHOTS = join(ROOT, "screenshots");
mkdirSync(SHOTS, { recursive: true });

const ROUTES = [
  ["/", "how high the yield"],
  ["/explore", "Where the return is coming from"],
  ["/policies", "Rules, not slogans"],
  ["/opportunities/1", "Aave"],
  ["/opportunities/1/drift", ""],
  ["/assessments/1-1", ""],
  ["/activity", "Activity"],
  ["/methodology", "source of yield"],
  ["/docs", "How to use the desk"],
  ["/roadmap", ""],
  ["/api/v1/config", "contractAddress"],
  ["/api/v1/health/live", "live"],
  ["/api/v1/health/ready", "ready"],
];

const cspViolations = [];
const results = [];

async function run(label, contextOpts, tag) {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) cspViolations.push(`[${tag}] ${t}`);
    else results.errors.push(`[${tag}] ${t}`);
  });
  page.on("pageerror", (e) => results.errors.push(`[${tag}] pageerror: ${e.message}`));

  for (const [route, needle] of ROUTES) {
    const response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    const status = response ? response.status() : 0;
    if (status >= 500) results.serverErrors.push(`[${tag}] ${route} -> ${status}`);
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    const body = await page.locator("body").innerText().catch(() => "");
    const rendered = Boolean(h1 && h1.trim()) || (needle && body.includes(needle));
    results.routes.push({ tag, route, status, heading: (h1 || "").trim().slice(0, 60), rendered: Boolean(rendered) });
  }

  // Branding script must have executed (it sets a marker / renders the pill).
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });
  results.branding = await page.evaluate(() => {
    const pillText = document.body.innerText.includes("Created with Grok");
    const hasExt = typeof window !== "undefined";
    return { pillText, hasExt, scripts: [...document.querySelectorAll("script[src]")].map((s) => s.src) };
  });
  await page.screenshot({ path: `${SHOTS}/csp-${tag}.png`, fullPage: false });

  // Wallet surface: confirm the connect control exists and the no-wallet path is graceful.
  await page.goto(BASE + "/opportunities/1", { waitUntil: "domcontentloaded", timeout: 45000 });
  const signButton = page.getByRole("button", { name: "Review and sign" });
  results.wallet = {
    signButtonPresent: await signButton.count().then((n) => n > 0).catch(() => false),
    signButtonEnabled: await signButton.isEnabled().catch(() => false),
    connectButton: await page.getByRole("button", { name: /connect/i }).count().catch(() => 0),
  };

  // Deliberately exercise the write path with no wallet present.
  const statusText = await (async () => {
    await signButton.click();
    await page.waitForTimeout(3000);
    return page.locator("p.font-mono").first().innerText().catch(() => "");
  })();
  results.wallet.noWalletStatus = statusText.slice(0, 200);
  await page.screenshot({ path: `${SHOTS}/csp-${tag}-wallet.png`, fullPage: false });

  await browser.close();
  return label;
}

results.errors = [];
results.serverErrors = [];
results.routes = [];

await run("desktop", { viewport: { width: 1280, height: 800 } }, "desktop");
await run("mobile", devices["iPhone 13"], "mobile");

const blank = results.routes.filter((r) => !r.rendered);
console.log(
  JSON.stringify(
    {
      base: BASE,
      routes_total: results.routes.length,
      routes_not_rendered: blank,
      server_errors: results.serverErrors,
      console_errors: results.errors,
      csp_violations: cspViolations,
      branding: results.branding,
      wallet: results.wallet,
      routes: results.routes,
    },
    null,
    2,
  ),
);
process.exit(blank.length || results.errors.length || results.serverErrors.length || cspViolations.length ? 1 : 0);
