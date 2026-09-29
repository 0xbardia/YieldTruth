#!/usr/bin/env node
// Mobile sweep at every width the QA brief names, checking overflow, nav, and
// the controls a user has to reach.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "screenshots", "qa");
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.YT_BASE || "https://yieldtruth.bydx.fun";

const WIDTHS = [
  [320, 640, "small phone"],
  [360, 780, "android phone"],
  [390, 844, "iphone"],
  [768, 1024, "tablet"],
  [1280, 800, "desktop"],
];
const ROUTES = ["/", "/explore", "/policies", "/policies/1", "/policies/new", "/opportunities/1", "/opportunities/1/drift", "/opportunities/new", "/assessments/1-1", "/activity", "/methodology", "/docs", "/roadmap"];

const b = await chromium.launch({ args: ["--no-sandbox"] });
const report = [];
for (const [w, h, label] of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  p.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  const rows = [];
  for (const route of ROUTES) {
    await p.goto(BASE + route, { waitUntil: "networkidle" });
    const overflow = await p.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("*")]
        .filter((n) => n.getBoundingClientRect().right > de.clientWidth + 2)
        .slice(0, 3)
        .map((n) => `${n.tagName.toLowerCase()}.${(n.className || "").toString().split(" ")[0]}`);
      return { scroll: de.scrollWidth > de.clientWidth + 1, wide };
    });
    const h1 = (await p.locator("h1").first().textContent().catch(() => "")) || "";
    rows.push({ route, h1: h1.trim().slice(0, 40), overflow: overflow.scroll, wide: overflow.wide });
  }
  // Mobile nav reachability
  let nav = "n/a (desktop width)";
  if (w < 700) {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    const menu = p.getByRole("button", { name: "Menu" });
    if (await menu.count()) {
      await menu.click();
      await p.waitForTimeout(400);
      nav = (await p.getByRole("navigation", { name: "Mobile" }).isVisible().catch(() => false)) ? "opened" : "FAILED to open";
    } else nav = "no Menu button";
  }
  await p.goto(BASE + "/opportunities/1", { waitUntil: "networkidle" });
  await p.screenshot({ path: join(SHOTS, `width-${w}.png`) });
  report.push({ label, width: w, nav, consoleErrors: errs, routes: rows, overflowCount: rows.filter((r) => r.overflow).length });
  await ctx.close();
}
console.log(JSON.stringify(report, null, 2));
await b.close();
