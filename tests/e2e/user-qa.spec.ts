import { expect, test, type Page } from "playwright/test";

/**
 * Behaviours a first-time user depends on, added after the 2026-09-29 QA pass.
 * Each one covers a defect that was found by driving the production site, not by
 * reading the implementation.
 */

/** A stub EIP-1193 provider, so wallet branches can be driven without a wallet. */
async function stubWallet(
  page: Page,
  options: { chainId?: string; hang?: boolean; failWith?: { message: string; code?: number } } = {},
) {
  const { chainId = "0xf22f", hang = false, failWith } = options;
  await page.addInitScript(
    ({ chainId, hang, failWith }) => {
      (window as unknown as { __sent: number }).__sent = 0;
      const provider = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts")
            return ["0x1111111111111111111111111111111111111111"];
          if (method === "eth_chainId") return chainId;
          // genlayer-js reads a nonce, a gas price, and a gas estimate before it
          // ever reaches the wallet. A stub that only answers eth_sendTransaction
          // never gets that far, so answer the reads too.
          if (method === "eth_getTransactionCount") return "0x0";
          if (method === "eth_gasPrice") return "0x1";
          if (method === "eth_blockNumber") return "0x1";
          if (method === "eth_estimateGas") return "0x100000";
          if (method === "eth_getBalance") return "0x0";
          if (method === "eth_getCode") return "0x";
          if (method === "eth_sendTransaction") {
            (window as unknown as { __sent: number }).__sent += 1;
            // A hanging wallet keeps the button locked, which is the state a user
            // actually sees while their wallet is open.
            if (hang) return new Promise(() => {});
            if (failWith) {
              const error = new Error(failWith.message) as Error & { code?: number };
              if (failWith.code !== undefined) error.code = failWith.code;
              throw error;
            }
            return "0x" + "ab".repeat(32);
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
      Object.defineProperty(window, "ethereum", { value: provider, configurable: true });
    },
    { chainId, hang, failWith },
  );
}

/** Main content only, so assertions never match the site header. */
const main = (page: Page) => page.locator("main#content").first();

const writeBox = (page: Page) =>
  page.locator("section.slip").filter({ hasText: "Ask GenLayer to assess" });

test("a first-time user can tell what they are signing before they sign it", async ({ page }) => {
  await page.goto("/opportunities/1");
  const box = writeBox(page);
  await expect(box.getByRole("heading", { name: "Ask GenLayer to assess" })).toBeVisible();

  // Names the specific action, not "sign a transaction".
  await expect(box.getByText(/Assess “Aave supply interest” against/)).toBeVisible();
  // Permanence, expected wait, and an explicit lack of guarantee.
  await expect(box.getByText(/permanent record/i)).toBeVisible();
  await expect(box.getByText(/minute or two/i)).toBeVisible();
  await expect(box.getByText(/does not guarantee an approval/i)).toBeVisible();

  // No implementation jargon in the user-facing panel.
  const text = await box.innerText();
  expect(text).not.toMatch(/writeContract/);
  expect(text).not.toMatch(/genlayer-js/);
});

test("two policies sharing a name are distinguishable", async ({ page }) => {
  // The chain holds two rule-identical policies both named "Treasury desk".
  // Identical labels made the selector unusable, so the id is appended.
  await page.goto("/policies");
  const treasury = page.getByRole("link", { name: /^Treasury desk \(#\d+\)$/ });
  expect(await treasury.count()).toBeGreaterThanOrEqual(2);

  await page.goto("/opportunities/1");
  const options = await page.locator("#policy option").allTextContents();
  const treasuryOptions = options.filter((o) => /^Treasury desk/.test(o.trim()));
  expect(new Set(treasuryOptions.map((o) => o.trim())).size).toBe(treasuryOptions.length);
});

test("a policy page answers what it would reject without decoding booleans", async ({ page }) => {
  await page.goto("/policies/1");
  await expect(page.getByRole("heading", { name: "Treasury desk" })).toBeVisible();
  await expect(page.getByText("Token incentives")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What this policy does" })).toBeVisible();
  // A user must not have to read raw booleans or a seconds count.
  const text = await page.locator("article").innerText();
  expect(text).not.toMatch(/Max age \(seconds\)/);
  expect(text).not.toMatch(/\b604800\b/);
});

test("assessment metadata is plain language with a readable time", async ({ page }) => {
  await page.goto("/opportunities/1");
  const text = await main(page).innerText();
  // No raw contract enums or raw ISO instants in the narrative.
  expect(text).not.toMatch(/Components:\s*[A-Z_]{4,}/);
  expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  expect(text).toMatch(/Assessed \d{4}-\d{2}-\d{2} at \d{2}:\d{2} UTC/);
  expect(text).toMatch(/Also counted: Borrower interest/);
});

test("a rejected signature is explained and offers a retry", async ({ page }) => {
  await stubWallet(page, { failWith: { message: "User rejected the request.", code: 4001 } });
  await page.goto("/opportunities/1");
  const sign = page.getByRole("button", { name: "Review and sign" });
  await sign.scrollIntoViewIfNeeded();
  await sign.click();
  const box = writeBox(page);
  await expect(box.getByText(/rejected the signature/i)).toBeVisible();
  await expect(box.getByText(/nothing was sent/i)).toBeVisible();
  // No library internals leak to the user.
  await expect(box).not.toContainText("viem@");
  // And the control is usable again.
  await expect(sign).toBeEnabled();
});

test("the sign control is reachable and operable by keyboard", async ({ page }) => {
  await page.goto("/opportunities/1");
  const sign = page.getByRole("button", { name: "Review and sign" });
  await sign.scrollIntoViewIfNeeded();
  await sign.focus();
  await expect(sign).toBeFocused();
  // Enter must activate it; with no wallet this surfaces the honest message.
  await page.keyboard.press("Enter");
  await expect(writeBox(page).getByText(/No browser wallet is available/i)).toBeVisible();
});

test("repeated clicks cannot submit twice", async ({ page }) => {
  await stubWallet(page, { hang: true });
  await page.goto("/opportunities/1");
  const sign = page.getByRole("button", { name: "Review and sign" });
  await sign.scrollIntoViewIfNeeded();
  for (let i = 0; i < 3; i += 1) await sign.click({ force: true });
  // Poll rather than sleep: the counter is the invariant, not the clock.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __sent: number }).__sent), { timeout: 10_000 })
    .toBe(1);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { __sent: number }).__sent)).toBe(1);
  // And the control stays locked while the wallet is open.
  await expect(sign).toBeDisabled();
});

test("drift explains itself when there is only one assessment", async ({ page }) => {
  await page.goto("/opportunities/1/drift");
  await expect(page.getByText(/one assessment so far/i)).toBeVisible();
  const text = await main(page).innerText();
  expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  expect(text).not.toMatch(/entered the set/);
});

test("an unknown route is a real page, not a stack trace", async ({ page }) => {
  const response = await page.goto("/opportunities/999999");
  expect(response?.status()).toBeGreaterThanOrEqual(400);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/at\s+\w+\s+\(|node_modules/);
});

test("no horizontal overflow at a narrow phone width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of ["/", "/policies", "/policies/1", "/opportunities/1", "/opportunities/1/drift"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, route).toBe(false);
  }
});
