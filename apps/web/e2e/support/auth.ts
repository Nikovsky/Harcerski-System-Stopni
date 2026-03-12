// @file: apps/web/e2e/support/auth.ts
import type { Page } from "@playwright/test";
import {
  getE2eEnv,
  requireProfileCredentials,
  type E2eProfile,
} from "./test-env";
const keycloakUsernameSelector =
  'input[name="username"], input#username, input[type="email"]';
const keycloakPasswordSelector =
  'input[name="password"], input#password, input[type="password"]';
const keycloakSubmitSelector = '#kc-login, button[type="submit"]';

function buildCommissionCallbackPath(): string {
  const { locale } = getE2eEnv();
  return `/${locale}/commission`;
}

function buildCommissionCallbackUrlPattern(locale: string): RegExp {
  return new RegExp(`/${locale}/commission(?:$|/)`);
}

async function waitForLoginFormOrCallback(page: Page, locale: string): Promise<"form" | "callback"> {
  const callbackUrlPattern = buildCommissionCallbackUrlPattern(locale);

  try {
    return await Promise.race([
      page
        .locator(keycloakUsernameSelector)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "form" as const),
      page.waitForURL(callbackUrlPattern, { timeout: 15_000 }).then(() => "callback" as const),
    ]);
  } catch {
    const bodyText = (await page.locator("body").textContent().catch(() => null))?.trim();

    throw new Error(
      `Unable to resolve Keycloak login state for ${page.url()}. Visible body: ${bodyText?.slice(0, 400) ?? "n/a"}`,
    );
  }
}

export async function loginByKeycloak(
  page: Page,
  profile: E2eProfile,
): Promise<void> {
  const { baseUrl, locale } = getE2eEnv();
  const credentials = requireProfileCredentials(profile);
  const loginUrl = new URL("/api/auth/login", baseUrl);
  const callbackUrlPattern = buildCommissionCallbackUrlPattern(locale);

  loginUrl.searchParams.set("locale", locale);
  loginUrl.searchParams.set("callbackPath", buildCommissionCallbackPath());

  await page.goto(loginUrl.toString(), { waitUntil: "networkidle" });
  const resolvedState = await waitForLoginFormOrCallback(page, locale);

  if (resolvedState === "callback") {
    await page.waitForLoadState("networkidle");
    return;
  }

  await page.locator(keycloakUsernameSelector).first().fill(credentials.username);
  await page.locator(keycloakPasswordSelector).first().fill(credentials.password);

  try {
    await Promise.all([
      page.waitForURL(callbackUrlPattern, {
        timeout: 30_000,
      }),
      page.locator(keycloakSubmitSelector).first().click(),
    ]);
  } catch (error) {
    const feedback =
      (await page
        .locator("#input-error, .alert-error, #kc-feedback-text")
        .first()
        .textContent()
        .catch(() => null)) ?? "Unknown login failure.";

    throw new Error(
      `Keycloak login failed for profile "${profile}": ${feedback}`,
      { cause: error },
    );
  }

  await page.waitForLoadState("networkidle");
}
