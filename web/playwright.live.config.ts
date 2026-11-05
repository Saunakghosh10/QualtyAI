import { defineConfig, devices } from "@playwright/test";

// Runs the real flow against the Qualty Supabase project. Needs SUPABASE_SECRET_KEY in the
// environment (to create and delete throwaway test users) and a build made with the public keys.
// Not part of CI. Run: SUPABASE_SECRET_KEY=... npx playwright test -c playwright.live.config.ts
const PORT = 3102;

export default defineConfig({
  testDir: "./e2e/live",
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.BASE_URL ?? `http://localhost:${PORT}`,
    geolocation: { latitude: 22.7441, longitude: 69.7042 },
    permissions: ["geolocation"],
  },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: true, timeout: 120_000 },
});
