import { expect, test } from "playwright/test";

test("allocator can read the desk", async ({ page }) => {
  // Ten navigations plus API round-trips. Against a remote origin this runs ~26s,
  // which overruns the 30s default as soon as the desktop and mobile projects
  // contend. walk.spec sets an explicit budget for the same reason.
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("how high the yield");
  await page.getByRole("link", { name: "Inspect a market" }).click();
  await expect(page.getByRole("heading", { name: "Where the return is coming from" })).toBeVisible();
  await page.getByRole("row").filter({ hasText: "Fixture" }).getByRole("link", { name: "Aave v3 WETH supply" }).click();
  await expect(page.getByText("Borrower interest").first()).toBeVisible();
  await expect(page.getByText("Fixture", { exact: false }).first()).toBeVisible();
  await page.getByRole("link", { name: "Yield drift" }).click();
  await expect(page.getByRole("heading", { name: "Aave v3 WETH supply" })).toBeVisible();
  await page.goto("/policies");
  await expect(page.getByRole("link", { name: "Desk conservative" })).toBeVisible();
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "How to use the desk" })).toBeVisible();
  await page.goto("/roadmap");
  await expect(page.getByText("Planned").first()).toBeVisible();
  await page.goto("/api/v1/health/live");
  await expect(page.getByText("live")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile layout does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  await page.goto("/explore");
  const tableOverflowPage = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(tableOverflowPage).toBe(false);
});

test("mobile menu and sign form behave", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Docs" })).toBeVisible();
  await page.goto("/opportunities/new");
  await expect(page.getByRole("heading", { name: "Sign a submission" })).toBeVisible();
  const config = await page.request.get("/api/v1/config");
  const body = await config.json();
  const sign = page.getByRole("button", { name: "Review and sign" });
  if (body.contractConfigured) await expect(sign).toBeEnabled();
  else await expect(sign).toBeDisabled();
  const urls = page.getByLabel("Evidence URLs, one per line");
  await expect(urls).toBeVisible();
  await urls.fill("http://docs.aave.com/insecure");
  await expect(page.getByText("Add one to four https evidence URLs before signing.")).toBeVisible();
  await expect(sign).toBeDisabled();
});

test("read api rejects bad ids and serves labelled records", async ({ request }) => {
  const live = await request.get("/api/v1/health/live");
  expect(live.ok()).toBeTruthy();
  expect(live.headers()["x-request-id"]).toBeTruthy();
  expect(await live.json()).toMatchObject({ status: "live" });

  const badPage = await request.get("/api/v1/opportunities?limit=20.5");
  expect(badPage.status()).toBe(400);

  const badId = await request.get("/api/v1/policies/01");
  expect(badId.status()).toBe(400);

  const policies = await request.get("/api/v1/policies");
  expect(policies.ok()).toBeTruthy();
  const policyBody = await policies.json();
  expect(policyBody.policies.some((row: { name: string; origin: string }) => row.name === "Desk conservative" && row.origin === "fixture")).toBe(true);

  const market = await request.get("/api/v1/opportunities/9001");
  expect(market.ok()).toBeTruthy();
  const marketBody = await market.json();
  expect(marketBody.origin).toBe("fixture");
  expect(marketBody.label).toContain("Aave");
});
