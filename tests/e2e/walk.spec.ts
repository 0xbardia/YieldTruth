import { expect, test, type Page } from "playwright/test";

const PAGES = [
  ["/", "how high the yield"],
  ["/explore", "Where the return is coming from"],
  ["/policies", "Rules, not slogans"],
  ["/policies/9001", "Desk conservative"],
  ["/policies/9002", ""],
  ["/policies/new", "Create a policy"],
  ["/opportunities/new", "Sign a submission"],
  ["/opportunities/9001", "Aave v3 WETH supply"],
  ["/opportunities/9002", ""],
  ["/opportunities/9003", ""],
  ["/opportunities/9003/drift", ""],
  ["/opportunities/9004", ""],
  ["/assessments/9003-2", "Token incentives"],
  ["/activity", "Activity"],
  ["/docs", "How to use the desk"],
  ["/methodology", "source of yield"],
  ["/roadmap", "Build the record"],
] as const;

async function collect(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  let expecting404 = false;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // This spec deliberately visits a missing opportunity at the end. The browser
    // logs that navigation as a console error, which would make the closing
    // `expect(errors).toEqual([])` contradict the 404 assertion above it. Ignore
    // exactly that one expected message and nothing else.
    if (expecting404 && /Failed to load resource.*\b404\b/.test(text)) return;
    errors.push(text);
  });
  page.on("response", (response) => {
    const url = response.url();
    // Origin-agnostic: matching the dev host made this check dead under any other
    // baseURL, so a real 4xx/5xx on a real page went unnoticed.
    if (response.status() >= 400 && !url.includes("/999999")) {
      failed.push(`${response.status()} ${url}`);
    }
  });
  return { errors, failed, expect404: (on: boolean) => void (expecting404 = on) };
}

test("a user can walk every desk surface", async ({ page }) => {
  // 17 page loads plus 9 interaction steps against a remote origin. Under the
  // dev-server setup this was near-instant; over the network it needs a real budget.
  // The timeout is a harness budget only — every assertion below still has to pass.
  test.setTimeout(300_000);
  const { errors, failed, expect404 } = await collect(page);
  for (const [path, heading] of PAGES) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBeLessThan(400);
    if (heading) await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    const broken = await page.evaluate(() =>
      [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
    );
    expect(broken, path).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, path).toBe(false);
  }

  await page.goto("/opportunities/9003");
  await page.getByLabel("Recompute against a policy").selectOption({ label: "Subsidy-tolerant research" });
  await page.getByRole("button", { name: "Preview gate" }).click();
  await expect(page.getByText("Fits the selected policy.")).toBeVisible();

  await page.goto("/opportunities/9003/drift");
  await expect(page.getByText("Changed from").first()).toBeVisible();
  await page.getByRole("link", { name: "Back to the opportunity" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/opportunities/new");
  await page.getByLabel("Evidence URLs, one per line").fill("http://docs.aave.com/nope");
  await expect(page.getByText("Add one to four https evidence URLs before signing.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review and sign" })).toBeDisabled();

  await page.goto("/policies/new");
  await page.getByLabel("Name").fill("");
  await expect(page.getByText("Name the policy before signing.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review and sign" })).toBeDisabled();
  await page.getByLabel("Name").fill("Treasury desk");
  await page.getByRole("button", { name: "Review and sign" }).click();
  await expect(page.getByText("No browser wallet is available.")).toBeVisible();

  await page.goto("/opportunities/new");
  await page.getByLabel("Evidence URLs, one per line").fill("https://docs.aave.com/a\nhttps://docs.aave.com/b");
  await expect(page.getByText("Each evidence URL must use a different host.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review and sign" })).toBeDisabled();

  await page.goto("/explore");
  const links = page.getByRole("link");
  await expect(links.filter({ hasText: "Aave" }).first()).toBeVisible();

  expect404(true);
  const missing = await page.goto("/opportunities/999999");
  expect(missing?.status()).toBeGreaterThanOrEqual(400);
  expect404(false);

  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
