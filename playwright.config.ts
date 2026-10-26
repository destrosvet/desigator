import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  globalSetup: "./tests/e2e/auth-setup.ts",
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: process.env.E2E_SERVER_COMMAND || "npx next dev -p 3100",
    url: `${baseURL}/auth/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});