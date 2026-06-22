// @file: apps/web/playwright.config.ts
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { getE2eEnv } from "./e2e/support/test-env";

const env = getE2eEnv();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: path.join("generated", "playwright-report"),
      },
    ],
  ],
  outputDir: path.join("generated", "test-results"),
  use: {
    baseURL: env.baseUrl,
    ignoreHTTPSErrors: env.ignoreHttpsErrors,
    locale: env.locale,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-smoke",
      testIgnore: ["**/*a11y*.e2e.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium-a11y",
      testMatch: ["**/*a11y*.e2e.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
