// @file: apps/web/e2e/meetings/meetings-a11y.e2e.spec.ts
import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";
import {
  getE2eEnv,
  hasProfileCredentials,
  requireProfileCredentials,
} from "../support/test-env";

const env = getE2eEnv();
const meetingsUrlPattern = new RegExp(`/${env.locale}/meetings(?:$|[/?])`);
const meetingNotOpenTextPattern =
  /To posiedzenie nie jest teraz otwarte na zapisy\.|This meeting is currently not open for registration\./i;
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
        .waitForURL(meetingsUrlPattern, { timeout: 15_000 })
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

async function loginByKeycloakForMeetings(page: Page): Promise<void> {
  const credentials = requireProfileCredentials("meetings");
  const loginUrl = new URL("/api/auth/login", env.baseUrl);

  loginUrl.searchParams.set("locale", env.locale);
  loginUrl.searchParams.set("callbackPath", `/${env.locale}/meetings`);

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
      page.waitForURL(meetingsUrlPattern, {
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

      throw new Error(`Keycloak login failed for meetings a11y: ${feedback}`);
    } catch (error) {
      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";

      if (
        attempt < 3 &&
        invalidCredentialsFeedbackPattern.test(feedback)
      ) {
        continue;
      }

      throw new Error(`Keycloak login failed for meetings a11y: ${feedback}`, {
        cause: error,
      });
    }
  }
}

function buildMeetingsPath(search = "view=list"): string {
  return search ? `/${env.locale}/meetings?${search}` : `/${env.locale}/meetings`;
}

async function expectMeetingsPageReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(meetingsUrlPattern);
  await expect(
    page.getByRole("heading", {
      name: /^Kalendarz posiedzeń$|^Meetings calendar$/i,
    }),
  ).toBeVisible();
}

async function gotoMeetings(
  page: Page,
  search = "view=list",
): Promise<void> {
  await page.goto(buildMeetingsPath(search), { waitUntil: "networkidle" });
  await expectMeetingsPageReady(page);
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

async function getFirstVisibleEnabledBookingButton(
  page: Page,
): Promise<Locator | null> {
  const bookingButtons = page.getByRole("button", {
    name: /Zarezerwuj|Book/i,
  });
  const count = await bookingButtons.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = bookingButtons.nth(index);
    const isVisible = await candidate.isVisible().catch(() => false);
    const isEnabled = await candidate.isEnabled().catch(() => false);

    if (isVisible && isEnabled) {
      return candidate;
    }
  }

  return null;
}

async function fulfillMeetingNotOpenRegistration(route: Route): Promise<void> {
  if (route.request().method() !== "POST") {
    await route.continue();
    return;
  }

  await route.fulfill({
    status: 409,
    contentType: "application/json",
    body: JSON.stringify({
      code: "MEETING_NOT_OPEN",
      message: "Meeting is not open for registration.",
      requestId: "e2e-meeting-not-open",
    }),
  });
}

const hasMeetingsCredentials = hasProfileCredentials("meetings");

test.describe("meetings accessibility", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasMeetingsCredentials, "Missing meetings browser credentials.");
    await loginByKeycloakForMeetings(page);
  });

  test("should not expose serious a11y violations on the meetings list view", async ({
    page,
  }) => {
    await gotoMeetings(page, "view=list");
    await expectNoSeriousA11yViolations(page);
  });

  test("should not expose serious a11y violations on the meetings calendar view", async ({
    page,
  }) => {
    await gotoMeetings(page, "view=calendar");
    await expect(
      page.getByRole("link", {
        name: /^Poprzedni miesiąc$|^Previous month$/i,
      }).first(),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("should surface the MEETING_NOT_OPEN booking message in the UI", async ({
    page,
  }) => {
    await gotoMeetings(page, "view=list&month=2026-04&commission=instructor");

    await expect
      .poll(async () => {
        const candidate = await getFirstVisibleEnabledBookingButton(page);
        return candidate !== null;
      })
      .toBe(true);

    const bookingButton = await getFirstVisibleEnabledBookingButton(page);
    expect(
      bookingButton,
      "Expected the deterministic meetings E2E profile to expose an actionable booking button.",
    ).not.toBeNull();

    await page.route(
      "**/api/backend/meetings/*/registrations",
      fulfillMeetingNotOpenRegistration,
    );

    const errorAlert = bookingButton!.locator("xpath=..").getByRole("alert");
    await bookingButton!.click();

    await expect(errorAlert).toContainText(meetingNotOpenTextPattern);
  });
});
