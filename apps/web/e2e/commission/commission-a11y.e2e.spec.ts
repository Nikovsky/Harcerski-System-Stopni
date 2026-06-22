// @file: apps/web/e2e/commission/commission-a11y.e2e.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginByKeycloak } from "../support/auth";
import { getE2eEnv } from "../support/test-env";

const env = getE2eEnv();

async function getFirstApplicationPath(page: Page): Promise<string> {
  const firstApplicationLink = page
    .locator(
      `a[href^='/${env.locale}/commission/'][href*='/applications/']`,
    )
    .first();

  await expect(firstApplicationLink).toBeVisible();
  const href = await firstApplicationLink.getAttribute("href");

  if (!href) {
    throw new Error("Expected commission inbox to expose an application link.");
  }

  return href;
}

async function expectCommissionInboxReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`/${env.locale}/commission(?:$|/)`));
  await expect(
    page
      .locator(`a[href^='/${env.locale}/commission/'][href*='/applications/']`)
      .first(),
  ).toBeVisible();
}

async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );

  expect(
    seriousViolations,
    seriousViolations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n"),
  ).toEqual([]);
}

test.describe("commission accessibility", () => {
  test("should not expose serious a11y violations on the commission inbox", async ({
    page,
  }) => {
    await loginByKeycloak(page, "commission");
    await page.goto(`/${env.locale}/commission`, { waitUntil: "networkidle" });
    await expectCommissionInboxReady(page);
    await expectNoSeriousA11yViolations(page);
  });

  test("should not expose serious a11y violations on the commission detail page", async ({
    page,
  }) => {
    await loginByKeycloak(page, "commission");
    await page.goto(`/${env.locale}/commission`, { waitUntil: "networkidle" });
    await expectCommissionInboxReady(page);

    const applicationPath = await getFirstApplicationPath(page);
    await page.goto(applicationPath, { waitUntil: "networkidle" });
    await expect(
      page.getByRole("link", { name: /Historia|History/i }),
    ).toBeVisible();

    await expectNoSeriousA11yViolations(page);
  });
});
