// @file: apps/web/e2e/dashboard/dashboard-a11y.e2e.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  getE2eEnv,
  hasProfileCredentials,
  requireProfileCredentials,
} from "../support/test-env";

const env = getE2eEnv();
const dashboardUrlPattern = new RegExp(`/${env.locale}/dashboard(?:$|[/?#])`, "i");
const dashboardHeadingPattern = /^Panel$|^Dashboard$/i;
const upcomingMeetingEyebrowPattern = /^Najbliższe posiedzenie$|^Upcoming meeting$/i;
const keycloakUsernameSelector =
  'input[name="username"], input#username, input[type="email"]';
const keycloakPasswordSelector =
  'input[name="password"], input#password, input[type="password"]';
const keycloakSubmitSelector = '#kc-login, button[type="submit"]';
const invalidCredentialsFeedbackPattern =
  /Nieprawidłowa nazwa użytkownika lub hasło|invalid username or password/i;

async function waitForLoginFormOrCallback(
  page: Page,
): Promise<"form" | "callback"> {
  try {
    return await Promise.race([
      page
        .locator(keycloakUsernameSelector)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "form" as const),
      page
        .waitForURL(dashboardUrlPattern, { timeout: 15_000 })
        .then(() => "callback" as const),
    ]);
  } catch {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )?.trim();

    throw new Error(
      `Unable to resolve Keycloak login state for ${page.url()}. Visible body: ${bodyText?.slice(0, 400) ?? "n/a"}`,
    );
  }
}

async function getKeycloakFeedback(page: Page): Promise<string | null> {
  return (
    (await page
      .locator("#input-error, .alert-error, #kc-feedback-text")
      .first()
      .textContent()
      .catch(() => null))?.trim() ?? null
  );
}

async function loginByKeycloakForDashboard(page: Page): Promise<void> {
  const credentials = requireProfileCredentials("readonly");
  const loginUrl = new URL("/api/auth/login", env.baseUrl);

  loginUrl.searchParams.set("locale", env.locale);
  loginUrl.searchParams.set("callbackPath", `/${env.locale}/dashboard`);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) {
      await page.context().clearCookies();
      await page.goto("about:blank");
      await page.waitForTimeout(300 * attempt);
    }

    await page.goto(loginUrl.toString(), { waitUntil: "networkidle" });
    const resolvedState = await waitForLoginFormOrCallback(page);

    if (resolvedState === "callback") {
      await page.waitForLoadState("networkidle");
      return;
    }

    await page.locator(keycloakUsernameSelector).first().fill("");
    await page.locator(keycloakUsernameSelector).first().fill(credentials.username);
    await page.locator(keycloakPasswordSelector).first().fill("");
    await page.locator(keycloakPasswordSelector).first().fill(credentials.password);

    const feedbackLocator = page
      .locator("#input-error, .alert-error, #kc-feedback-text")
      .first();
    const outcomePromise = Promise.race([
      page.waitForURL(dashboardUrlPattern, {
        timeout: 15_000,
      }).then(() => "callback" as const),
      feedbackLocator
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "feedback" as const),
    ]);

    await page.locator(keycloakSubmitSelector).first().click();

    try {
      const outcome = await outcomePromise;

      if (outcome === "callback") {
        await page.waitForLoadState("networkidle");
        return;
      }

      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";
      if (
        attempt < 3 &&
        invalidCredentialsFeedbackPattern.test(feedback)
      ) {
        continue;
      }

      throw new Error(`Keycloak login failed for dashboard a11y: ${feedback}`);
    } catch (error) {
      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";

      if (
        attempt < 3 &&
        invalidCredentialsFeedbackPattern.test(feedback)
      ) {
        continue;
      }

      throw new Error(`Keycloak login failed for dashboard a11y: ${feedback}`, {
        cause: error,
      });
    }
  }
}

async function expectDashboardReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(dashboardUrlPattern);
  await expect(
    page.getByRole("heading", { name: dashboardHeadingPattern }),
  ).toBeVisible();
  await expect(
    page.getByText(upcomingMeetingEyebrowPattern).first(),
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

const hasReadonlyCredentials = hasProfileCredentials("readonly");

test.describe("dashboard accessibility", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasReadonlyCredentials, "Missing readonly browser credentials.");
    await loginByKeycloakForDashboard(page);
  });

  test("should not expose serious a11y violations on dashboard", async ({
    page,
  }) => {
    await expectDashboardReady(page);
    await expectNoSeriousA11yViolations(page);
  });
});
