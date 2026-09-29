import { defineConfig } from "playwright/test";
export default defineConfig({
  testDir: "/root/YieldTruth/tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: { baseURL: "https://yieldtruth.bydx.fun" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
