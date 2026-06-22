// @file: apps/web/e2e/meetings/meetings-smoke.e2e.spec.ts
import { expect, test, type Page } from "@playwright/test";
import {
  getE2eEnv,
  hasProfileCredentials,
  requireProfileCredentials,
} from "../support/test-env";

const env = getE2eEnv();
const meetingsUrlPattern = new RegExp(`/${env.locale}/meetings(?:$|[/?])`);
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
  const credentials = requireProfileCredentials("readonly");
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

      throw new Error(`Keycloak login failed for meetings smoke: ${feedback}`);
    } catch (error) {
      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";

      if (
        attempt < 3 &&
        invalidCredentialsFeedbackPattern.test(feedback)
      ) {
        continue;
      }

      throw new Error(`Keycloak login failed for meetings smoke: ${feedback}`, {
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

const hasReadonlyCredentials = hasProfileCredentials("readonly");

test.describe("meetings smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasReadonlyCredentials, "Missing readonly browser credentials.");
    await loginByKeycloakForMeetings(page);
  });

  test("should switch list, calendar and mine views without losing URL state", async ({
    page,
  }) => {
    await gotoMeetings(page, "view=list");

    const listLink = page.getByRole("link", { name: /^Lista$|^List$/i });
    const calendarLink = page.getByRole("link", {
      name: /^Kalendarz$|^Calendar$/i,
    });
    const mineLink = page.getByRole("link", {
      name: /^Moje zapisy$|^My registrations$/i,
    });

    await expect(listLink).toHaveAttribute("aria-current", "page");

    await Promise.all([
      page.waitForURL(/view=calendar/i),
      calendarLink.click(),
    ]);
    await expect(calendarLink).toHaveAttribute("aria-current", "page");

    await Promise.all([page.waitForURL(/view=mine/i), mineLink.click()]);
    await expect(mineLink).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", {
        name: /^Moje zapisy$|^My registrations$/i,
      }),
    ).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expectMeetingsPageReady(page);
    await expect(page).toHaveURL(/view=mine/i);
    await expect(mineLink).toHaveAttribute("aria-current", "page");
  });

  test("should keep list filters in the URL after interaction and refresh", async ({
    page,
  }) => {
    await gotoMeetings(page, "view=list");

    await Promise.all([
      page.waitForURL(/open=1/i),
      page.getByRole("link", { name: /^Otwarte$|^Open$/i }).click(),
    ]);
    await Promise.all([
      page.waitForURL(/available=1/i),
      page.getByRole("link", { name: /^Dostępne$|^Available$/i }).click(),
    ]);
    await Promise.all([
      page.waitForURL(/commission=instructor/i),
      page
        .getByRole("link", { name: /^Instruktorska$|^Instructor$/i })
        .click(),
    ]);

    await expect(page).toHaveURL(/view=list/i);
    await expect(page).toHaveURL(/open=1/i);
    await expect(page).toHaveURL(/available=1/i);
    await expect(page).toHaveURL(/commission=instructor/i);
    await expect(
      page.getByRole("link", { name: /^Wyczyść filtry$|^Clear filters$/i }),
    ).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expectMeetingsPageReady(page);
    await expect(page).toHaveURL(/view=list/i);
    await expect(page).toHaveURL(/open=1/i);
    await expect(page).toHaveURL(/available=1/i);
    await expect(page).toHaveURL(/commission=instructor/i);
  });
});
