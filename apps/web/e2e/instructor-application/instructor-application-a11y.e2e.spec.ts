// @file: apps/web/e2e/instructor-application/instructor-application-a11y.e2e.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  getE2eEnv,
  hasProfileCredentials,
  requireProfileCredentials,
  type E2eProfile,
} from "../support/test-env";

const env = getE2eEnv();
const keycloakUsernameSelector =
  'input[name="username"], input#username, input[type="email"]';
const keycloakPasswordSelector =
  'input[name="password"], input#password, input[type="password"]';
const keycloakSubmitSelector = '#kc-login, button[type="submit"]';
const applicationListUrlPattern = new RegExp(`/${env.locale}/applications(?:$|[/?])`);
const applicationEditUrlPattern = new RegExp(
  `/${env.locale}/applications/[0-9a-f-]+/edit(?:$|\\?)`,
  "i",
);
const newApplicationUrlPattern = new RegExp(
  `/${env.locale}/applications/new(?:$|\\?)`,
);
const activeApplicationAlertPattern =
  /Masz już aktywny wniosek|already have an active application/i;
const invalidCredentialsFeedbackPattern =
  /Nieprawidłowa nazwa użytkownika lub hasło|invalid username or password/i;
const keycloakSubmitOutcomeTimeoutMs = 15_000;

type ApplicationRouteParts = {
  detailPath: string;
  editPath: string;
  id: string;
};

function buildApplicationsCallbackPath(): string {
  return `/${env.locale}/applications`;
}

function extractApplicationRouteParts(url: string): ApplicationRouteParts {
  const parsedUrl = url.startsWith("http") ? new URL(url) : new URL(url, env.baseUrl);
  const match = parsedUrl.pathname.match(
    new RegExp(`^/${env.locale}/applications/([0-9a-f-]+)/edit$`, "i"),
  );

  if (!match) {
    throw new Error(`Expected edit application URL, received: ${url}`);
  }

  const id = match[1];
  return {
    id,
    detailPath: `/${env.locale}/applications/${id}`,
    editPath: `/${env.locale}/applications/${id}/edit`,
  };
}

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
        .waitForURL(applicationListUrlPattern, { timeout: 15_000 })
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

async function fillKeycloakCredentials(
  page: Page,
  credentials: ReturnType<typeof requireProfileCredentials>,
): Promise<void> {
  const usernameInput = page.locator(keycloakUsernameSelector).first();
  const passwordInput = page.locator(keycloakPasswordSelector).first();

  await usernameInput.fill("");
  await usernameInput.fill(credentials.username);
  await expect(usernameInput).toHaveValue(credentials.username);

  await passwordInput.fill("");
  await passwordInput.fill(credentials.password);
  await expect(passwordInput).toHaveValue(credentials.password);
}

async function waitForKeycloakSubmitOutcome(
  page: Page,
): Promise<"callback" | "feedback" | "stalled"> {
  const feedbackLocator = page
    .locator("#input-error, .alert-error, #kc-feedback-text")
    .first();
  const outcomePromise = Promise.race([
    page.waitForURL(applicationListUrlPattern, {
      timeout: keycloakSubmitOutcomeTimeoutMs,
    }).then(() => "callback" as const),
    feedbackLocator
      .waitFor({ state: "visible", timeout: keycloakSubmitOutcomeTimeoutMs })
      .then(() => "feedback" as const),
  ]);

  await page.locator(keycloakSubmitSelector).first().click();

  try {
    return await outcomePromise;
  } catch {
    return "stalled";
  }
}

async function loginByKeycloakForApplications(
  page: Page,
  profile: E2eProfile = "readonly",
): Promise<void> {
  const credentials = requireProfileCredentials(profile);
  const loginUrl = new URL("/api/auth/login", env.baseUrl);

  loginUrl.searchParams.set("locale", env.locale);
  loginUrl.searchParams.set("callbackPath", buildApplicationsCallbackPath());

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

    await fillKeycloakCredentials(page, credentials);

    try {
      const outcome = await waitForKeycloakSubmitOutcome(page);

      if (outcome === "callback") {
        await page.waitForLoadState("networkidle");
        return;
      }

      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";
      const shouldRetry =
        attempt < 3 &&
        (invalidCredentialsFeedbackPattern.test(feedback) || outcome === "stalled");

      if (shouldRetry) {
        continue;
      }

      throw new Error(`Keycloak login failed for profile "${profile}": ${feedback}`);
    } catch (error) {
      const feedback = (await getKeycloakFeedback(page)) ?? "Unknown login failure.";
      const shouldRetry =
        attempt < 3 && invalidCredentialsFeedbackPattern.test(feedback);

      if (shouldRetry) {
        continue;
      }

      throw new Error(
        `Keycloak login failed for profile "${profile}": ${feedback}`,
        { cause: error },
      );
    }
  }
}

async function expectNoSeriousA11yViolations(
  page: Page,
  include?: string,
): Promise<void> {
  const builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  const results = include ? await builder.include(include).analyze() : await builder.analyze();
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

async function expectApplicationsListReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(applicationListUrlPattern);
  await expect(
    page.getByRole("heading", { name: /^Moje wnioski$|^My Applications$/i }),
  ).toBeVisible();
}

async function getFirstEditableApplication(
  page: Page,
): Promise<ApplicationRouteParts | null> {
  const editLink = page
    .locator(`a[href^='/${env.locale}/applications/'][href$='/edit']`)
    .first();

  if ((await editLink.count()) === 0) {
    return null;
  }

  const href = await editLink.getAttribute("href");
  return href ? extractApplicationRouteParts(href) : null;
}

async function waitForEditableApplicationFromList(
  page: Page,
): Promise<ApplicationRouteParts> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto(`/${env.locale}/applications`, { waitUntil: "networkidle" });
    await expectApplicationsListReady(page);

    const existingApplication = await getFirstEditableApplication(page);
    if (existingApplication) {
      return existingApplication;
    }

    await page.waitForTimeout(500);
  }

  throw new Error("Expected an editable application to appear on the list.");
}

async function waitForEditRouteOrCreateAlert(
  page: Page,
): Promise<"edit" | "alert"> {
  const createAlert = page.locator("main [role='alert']").first();

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (applicationEditUrlPattern.test(page.url())) {
      return "edit";
    }

    const alertText = (await createAlert.textContent().catch(() => null))?.trim() ?? "";
    if (alertText.length > 0) {
      return "alert";
    }

    await page.waitForTimeout(250);
  }

  throw new Error(
    `Expected navigation to an application edit page or a create alert. Current URL: ${page.url()}`,
  );
}

async function ensureDraftApplication(
  page: Page,
  templateIndex: number,
  profile: E2eProfile = "readonly",
): Promise<ApplicationRouteParts> {
  await loginByKeycloakForApplications(page, profile);
  const existingApplication = await waitForEditableApplicationFromList(page).catch(
    () => null,
  );

  if (existingApplication) {
    return existingApplication;
  }

  await page.getByRole("link", { name: /^Nowy wniosek$|^New Application$/i }).click();
  await expect(page).toHaveURL(newApplicationUrlPattern);
  await expect(
    page.getByRole("heading", { name: /^Wybierz wniosek$|^Select template$/i }),
  ).toBeVisible();

  const templateButtons = page.locator("button").filter({
    has: page.locator("h3"),
  });
  const templateCount = await templateButtons.count();

  if (templateCount === 0) {
    throw new Error("Expected at least one application template button.");
  }

  const selectedTemplateIndex = Math.min(templateIndex, templateCount - 1);
  await templateButtons.nth(selectedTemplateIndex).click();

  const outcome = await waitForEditRouteOrCreateAlert(page);
  if (outcome === "edit") {
    await page.waitForLoadState("networkidle");
    return extractApplicationRouteParts(page.url());
  }

  const alertText =
    (await page.locator("main [role='alert']").first().textContent().catch(() => null))?.trim() ??
    "";
  if (activeApplicationAlertPattern.test(alertText)) {
    return waitForEditableApplicationFromList(page);
  }

  throw new Error(`Unexpected application create alert: ${alertText || "n/a"}`);
}

test.describe("instructor application accessibility", () => {
  test.skip(
    !hasProfileCredentials("commission"),
    "Requires HSS_E2E_COMMISSION_USERNAME and HSS_E2E_COMMISSION_PASSWORD.",
  );

  test("should not expose serious a11y violations on the application list", async ({
    page,
  }) => {
    await loginByKeycloakForApplications(page, "commission");
    await page.goto(`/${env.locale}/applications`, { waitUntil: "networkidle" });
    await expectApplicationsListReady(page);

    await expectNoSeriousA11yViolations(page);
  });

  test("should not expose serious a11y violations on the application detail", async ({
    page,
  }) => {
    const application = await ensureDraftApplication(page, 1, "commission");

    await page.goto(`${application.detailPath}?tab=attachments`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("tab", {
        name: /^Załączniki i podsumowanie$|^Attachments & Summary$/i,
      }),
    ).toHaveAttribute("aria-selected", "true");

    await expectNoSeriousA11yViolations(page);
  });

  test("should expose an accessible delete draft dialog", async ({ page }) => {
    await ensureDraftApplication(page, 1, "commission");

    await page.goto(`/${env.locale}/applications`, { waitUntil: "networkidle" });
    await expectApplicationsListReady(page);

    const deleteButton = page
      .getByRole("button", { name: /^Usuń szkic$|^Delete draft$/i })
      .first();
    await expect(deleteButton).toBeVisible();

    await deleteButton.focus();
    await deleteButton.click();

    const dialog = page.getByRole("dialog", {
      name: /^Potwierdzenie usunięcia$|^Confirm deletion$/i,
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        /^Czy na pewno chcesz usunąć ten szkic wniosku\?$|^Are you sure you want to delete this draft\?$/i,
      ),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /^Anuluj$|^Cancel$/i }),
    ).toBeFocused();

    await expectNoSeriousA11yViolations(page, '[role="dialog"]');

    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    await expect(deleteButton).toBeFocused();
  });
});
