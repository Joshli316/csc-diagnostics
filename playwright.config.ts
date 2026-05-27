import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 5"] } },
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
