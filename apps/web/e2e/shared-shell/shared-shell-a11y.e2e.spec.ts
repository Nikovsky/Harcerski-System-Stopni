// @file: apps/web/e2e/shared-shell/shared-shell-a11y.e2e.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  getE2eEnv,
  hasProfileCredentials,
  requireProfileCredentials,
} from "../support/test-env";

const env = getE2eEnv();
const homeLinkPattern = /^HSS$/i;
const loginButtonPattern = /^Zaloguj$|^Login$/i;
const localeButtonPattern = /^Język$|^Language$/i;
const signedInAsPattern = /Zalogowano jako|Signed in as/i;
const profileHeadingPattern = /^Profil$|^Profile$/i;
const logoutButtonPattern = /^Wyloguj$|^Log out$/i;
const logoutDialogPattern = /^Wylogowanie$|^Sign out$/i;
const keycloakUsernameSelector =
  'input[name="username"], input#username, input[type="email"]';
const keycloakPasswordSelector =
  'input[name="password"], input#password, input[type="password"]';
const keycloakSubmitSelector = '#kc-login, button[type="submit"]';
const invalidCredentialsFeedbackPattern =
  /Nieprawidłowa nazwa użytkownika lub hasło|invalid username or password/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLocalizedPath(locale: string, suffix = ""): string {
  return suffix ? `/${locale}${suffix}` : `/${locale}`;
}

function buildCallbackUrlPattern(locale: string, suffix = ""): RegExp {
  return new RegExp(`${buildLocalizedPath(locale, suffix)}(?:$|[/?#])`, "i");
}

async function waitForLoginFormOrCallback(
  page: Page,
  callbackUrlPattern: RegExp,
): Promise<"form" | "callback"> {
  try {
    return await Promise.race([
      page
        .locator(keycloakUsernameSelector)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "form" as const),
      page
        .waitForURL(callbackUrlPattern, { timeout: 15_000 })
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

async function gotoHome(page: Page, locale: string): Promise<void> {
  await page.goto(new URL(buildLocalizedPath(locale), env.baseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await expect(page.getByRole("link", { name: homeLinkPattern })).toBeVisible();
}

async function loginFromNavbarToProfile(page: Page, locale: string): Promise<void> {
  const credentials = requireProfileCredentials("readonly");
  const callbackUrlPattern = buildCallbackUrlPattern(locale, "/profile");
  const loginUrl = new URL("/api/auth/login", env.baseUrl);

  loginUrl.searchParams.set("locale", locale);
  loginUrl.searchParams.set("callbackPath", buildLocalizedPath(locale, "/profile"));

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) {
      await page.context().clearCookies();
      await page.goto("about:blank");
      await page.waitForTimeout(300 * attempt);
    }

    await gotoHome(page, locale);
    await expect(getHeaderLoginButton(page)).toBeVisible();
    await page.goto(loginUrl.toString(), { waitUntil: "networkidle" });

    const resolvedState = await waitForLoginFormOrCallback(
      page,
      callbackUrlPattern,
    );

    if (resolvedState === "callback") {
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(callbackUrlPattern);
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
      page
        .waitForURL(callbackUrlPattern, { timeout: 15_000 })
        .then(() => "callback" as const),
      feedbackLocator
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "feedback" as const),
    ]);

    await page.locator(keycloakSubmitSelector).first().click();

    try {
      const outcome = await outcomePromise;

      if (outcome === "callback") {
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(callbackUrlPattern);
        return;
      }

      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";
      if (
        attempt < 3 &&
        invalidCredentialsFeedbackPattern.test(feedback)
      ) {
        continue;
      }

      throw new Error(`Keycloak login failed for shared shell a11y: ${feedback}`);
    } catch (error) {
      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";

      if (
        attempt < 3 &&
        invalidCredentialsFeedbackPattern.test(feedback)
      ) {
        continue;
      }

      throw new Error(`Keycloak login failed for shared shell a11y: ${feedback}`, {
        cause: error,
      });
    }
  }
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

function getHeaderLocaleSwitcherButton(page: Page) {
  return page
    .getByRole("banner")
    .getByRole("button", { name: localeButtonPattern })
    .first();
}

function getHeaderLoginButton(page: Page) {
  return page
    .getByRole("banner")
    .getByRole("button", { name: loginButtonPattern })
    .first();
}

function getLocaleSwitcherMenu(page: Page) {
  return page.getByRole("menu", { name: localeButtonPattern }).first();
}

function getAccountMenuDialog(page: Page) {
  return page.getByRole("dialog").filter({ hasText: signedInAsPattern }).first();
}

async function openLocaleSwitcher(page: Page): Promise<void> {
  await getHeaderLocaleSwitcherButton(page).click();
  await expect(getLocaleSwitcherMenu(page)).toBeVisible();
}

const hasReadonlyCredentials = hasProfileCredentials("readonly");

test.describe("shared shell accessibility", () => {
  test("should not expose serious a11y violations on the public home shell", async ({
    page,
  }) => {
    await gotoHome(page, env.locale);
    await expect(getHeaderLoginButton(page)).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("should not expose serious a11y violations with the locale switcher open on profile", async ({
    page,
  }) => {
    test.skip(!hasReadonlyCredentials, "Missing readonly browser credentials.");

    await loginFromNavbarToProfile(page, env.locale);
    await expect(
      page.getByRole("heading", { name: profileHeadingPattern }),
    ).toBeVisible();

    await openLocaleSwitcher(page);
    await expectNoSeriousA11yViolations(page);
  });

  test("should not expose serious a11y violations for account menu and logout dialog", async ({
    page,
  }) => {
    test.skip(!hasReadonlyCredentials, "Missing readonly browser credentials.");

    const readonlyCredentials = requireProfileCredentials("readonly");

    await loginFromNavbarToProfile(page, env.locale);
    await expect(
      page.getByRole("heading", { name: profileHeadingPattern }),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: new RegExp(`^${escapeRegExp(readonlyCredentials.username)}$`, "i"),
      })
      .click();
    await expect(getAccountMenuDialog(page)).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await page.getByRole("button", { name: logoutButtonPattern }).click();
    await expect(
      page.getByRole("dialog", { name: logoutDialogPattern }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });
});
