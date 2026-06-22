// @file: apps/web/e2e/dashboard/dashboard-smoke.e2e.spec.ts
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
const upcomingMeetingTitlePattern = /^Twój najbliższy termin$|^Your next date$/i;
const upcomingMeetingEmptyPattern =
  /^Nie masz jeszcze aktywnych zapisów\.?$|^You do not have any active registrations yet\.?$/i;
const upcomingMeetingUnavailablePattern =
  /^Nie udało się pobrać Twoich zapisów\.?$|^Your registrations could not be loaded\.?$/i;
const viewAllPattern = /^Przejdź do moich zapisów$|^Open my registrations$/i;
const browsePattern = /^Przejdź do terminów$|^Browse meeting dates$/i;
const keycloakUsernameSelector =
  'input[name="username"], input#username, input[type="email"]';
const keycloakPasswordSelector =
  'input[name="password"], input#password, input[type="password"]';
const keycloakSubmitSelector = '#kc-login, button[type="submit"]';
const invalidCredentialsFeedbackPattern =
  /Nieprawidłowa nazwa użytkownika lub hasło|invalid username or password/i;

type DashboardCardVariant = "registration" | "empty" | "unavailable";

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

      throw new Error(`Keycloak login failed for dashboard smoke: ${feedback}`);
    } catch (error) {
      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";

      if (
        attempt < 3 &&
        invalidCredentialsFeedbackPattern.test(feedback)
      ) {
        continue;
      }

      throw new Error(`Keycloak login failed for dashboard smoke: ${feedback}`, {
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

async function resolveDashboardCardVariant(
  page: Page,
): Promise<DashboardCardVariant> {
  const registrationHeading = page.getByRole("heading", {
    name: upcomingMeetingTitlePattern,
    level: 2,
  });
  if (await registrationHeading.isVisible().catch(() => false)) {
    return "registration";
  }

  const emptyHeading = page.getByRole("heading", {
    name: upcomingMeetingEmptyPattern,
    level: 2,
  });
  if (await emptyHeading.isVisible().catch(() => false)) {
    return "empty";
  }

  const unavailableHeading = page.getByRole("heading", {
    name: upcomingMeetingUnavailablePattern,
    level: 2,
  });
  if (await unavailableHeading.isVisible().catch(() => false)) {
    return "unavailable";
  }

  const bodyText = (await page.locator("main").textContent().catch(() => null))
    ?.trim()
    ?.slice(0, 500);
  throw new Error(
    `Unable to resolve dashboard card variant at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
  );
}

function isMeetingsViewUrl(url: URL, view: "list" | "mine"): boolean {
  return (
    url.pathname === `/${env.locale}/meetings` &&
    url.searchParams.get("view") === view
  );
}

const hasReadonlyCredentials = hasProfileCredentials("readonly");

test.describe("dashboard smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasReadonlyCredentials, "Missing readonly browser credentials.");
    await loginByKeycloakForDashboard(page);
  });

  test("should render dashboard with a supported upcoming meeting state", async ({
    page,
  }) => {
    await expectDashboardReady(page);

    const variant = await resolveDashboardCardVariant(page);

    if (variant === "registration") {
      await expect(page.getByRole("link", { name: viewAllPattern })).toBeVisible();
      await expect(page.getByRole("link", { name: browsePattern })).toBeVisible();
      return;
    }

    if (variant === "empty") {
      await expect(page.getByRole("link", { name: browsePattern })).toBeVisible();
      return;
    }

    await expect(page.getByRole("link", { name: viewAllPattern })).toBeVisible();
  });

  test("should navigate from dashboard card to the correct meetings view", async ({
    page,
  }) => {
    await expectDashboardReady(page);

    const variant = await resolveDashboardCardVariant(page);

    if (variant === "empty") {
      await Promise.all([
        page.waitForURL((url) => isMeetingsViewUrl(url, "list")),
        page.getByRole("link", { name: browsePattern }).click(),
      ]);
      expect(isMeetingsViewUrl(new URL(page.url()), "list")).toBe(true);
      return;
    }

    await Promise.all([
      page.waitForURL((url) => isMeetingsViewUrl(url, "mine")),
      page.getByRole("link", { name: viewAllPattern }).click(),
    ]);
    expect(isMeetingsViewUrl(new URL(page.url()), "mine")).toBe(true);
  });
});
