import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Set BASE_URL to run the smoke suite against a deployed site (e.g. https://qualty.ai).
const external = process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  // e2e/live runs against the real Supabase project; see playwright.live.config.ts.
  testIgnore: /live\//,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    geolocation: { latitude: 22.7441, longitude: 69.7042 },
    permissions: ["geolocation"],
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: external
    ? [{ name: "smoke", testMatch: /smoke\.spec\.ts/, use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "chromium", testIgnore: /smoke\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", testMatch: /(flows|smoke)\.spec\.ts/, use: { ...devices["Pixel 7"] } },
        { name: "smoke-local", testMatch: /smoke\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
      ],
  webServer: external
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
