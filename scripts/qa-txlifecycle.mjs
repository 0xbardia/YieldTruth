#!/usr/bin/env node
// Transaction-lifecycle UX with a stubbed wallet. Nothing reaches Studionet.
// The point is whether a normal user can tell, at each moment, what is happening.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "screenshots", "qa");
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.YT_BASE || "https://yieldtruth.bydx.fun";
// A real, finalized, agreed transaction on Studionet. Returning it from the stub
// wallet means the app's genuine receipt-reading code runs against genuine chain
// data, so the waiting and final states observed here are the real ones.
const TX = process.env.YT_TX || "0xacd5ffc84280b348e59d63707bdc0f89aa1e7b6ab7e79efb9e7e99dee06dbae7";

const stub = (opts) => `
  const p = {
    isMetaMask: true,
    request: async ({ method }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return ["0x1111111111111111111111111111111111111111"];
      if (method === "eth_chainId") return "0xf22f";
      if (method === "eth_sendTransaction") { window.__sent = (window.__sent||0)+1; ${opts}; }
      return null;
    },
    on: () => {}, removeListener: () => {},
  };
  Object.defineProperty(window, "ethereum", { value: p, configurable: true });
`;

const readStatus = (p) =>
  p.evaluate(() => {
    const box = [...document.querySelectorAll("section")].find((s) => /Ask GenLayer to assess/i.test(s.innerText));
    const t = box ? box.innerText : document.body.innerText;
    const btn = [...document.querySelectorAll("button")].find((x) => /Review and sign/.test(x.innerText));
    return {
      status: t.match(/Status:\s*[a-z]+[^\n]*/i)?.[0]?.trim() ?? null,
      buttonDisabled: btn ? btn.disabled : null,
      hasHash: /0xacd5ffc8|0x[a-f0-9]{6,}/i.test(t),
      mentionsWaiting: /Waiting for GenLayer validators/i.test(t),
      mentionsNotApproved: /not the same as approved|Final is not/i.test(t),
      hasStudioLink: /studio\.genlayer\.com/.test(t),
    };
  });

const b = await chromium.launch({ args: ["--no-sandbox"] });
const out = {};

// --- Long consensus wait: the hash exists, finality does not arrive ---
{
  const p = await b.newPage();
  await p.addInitScript(stub(`return "${TX}";`));
  await p.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
  const btn = p.getByRole("button", { name: "Review and sign" });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await p.waitForTimeout(2500);
  out.consensus_waiting = await readStatus(p);
  await p.screenshot({ path: join(SHOTS, "tx-waiting.png") });
  // The stub returns a hash that does not exist, so the receipt poll keeps waiting.
  await p.waitForTimeout(6000);
  out.consensus_still_waiting = await readStatus(p);
  // Now let it reach finality so the success UI can be observed.
  await p.waitForFunction(() => /Status:\s*final/i.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
  out.consensus_final = await readStatus(p);
  out.consensus_final_text = await p.evaluate(() => {
    const box = [...document.querySelectorAll("section")].find((s) => /Ask GenLayer to assess/i.test(s.innerText));
    return box ? box.innerText : null;
  });
  await p.screenshot({ path: join(SHOTS, "tx-final.png") });
  await p.close();
}

// --- Finalized but not agreed: must NOT read as success ---
{
  const p = await b.newPage();
  await p.route("**/api/**", (r) => r.continue());
  await p.addInitScript(stub(`return "${TX}";`));
  // Intercept the receipt poll: pretend the transaction is final but not agreed.
  await p.route("**studio.genlayer.com/api", async (route) => {
    const req = route.request();
    const body = req.postData() || "";
    if (body.includes("gen_getTransactionByHash")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            status: "FINALIZED",
            result: "NOT_AGREED",
            consensus_data: { leader_receipt: [{ vote: null, result: "NOT_AGREED", execution_result: "SUCCESS" }] },
            tx_execution_result: "SUCCESS",
          },
        }),
      });
    }
    return route.continue();
  });
  await p.goto(`${BASE}/opportunities/1`, { waitUntil: "networkidle" });
  const btn = p.getByRole("button", { name: "Review and sign" });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await p.waitForTimeout(6000);
  out.not_agreed = await readStatus(p);
  out.not_agreed_raw = await p.evaluate(() => document.body.innerText.match(/Status:\s*failed[^\n]*/i)?.[0] ?? null);
  await p.screenshot({ path: join(SHOTS, "tx-not-agreed.png") });
  await p.close();
}

console.log(JSON.stringify(out, null, 2));
await b.close();
