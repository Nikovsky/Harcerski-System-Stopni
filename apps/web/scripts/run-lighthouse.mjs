// @file: apps/web/scripts/run-lighthouse.mjs
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";

const keycloakUsernameSelector =
  'input[name="username"], input#username, input[type="email"]';
const keycloakPasswordSelector =
  'input[name="password"], input#password, input[type="password"]';
const keycloakSubmitSelector = '#kc-login, button[type="submit"]';
const applicationsHeadingPattern = /^Moje wnioski$|^My Applications$/i;
const meetingsHeadingPattern = /^Kalendarz posiedzeń$|^Meetings calendar$/i;
const selectTemplateHeadingPattern = /^Wybierz wniosek$|^Select template$/i;
const activeApplicationAlertPattern =
  /Masz już aktywny wniosek|already have an active application/i;
const requirementsStepPattern = /^Wymagania$|^Requirements$/i;
const commissionHistoryPattern = /^Historia$|^History$/i;
const profileHeadingPattern = /^Profil$|^Profile$/i;
const profileEditLinkPattern = /^Edytuj$|^Edit$/i;
const sharedShellLoginPattern = /^Zaloguj$|^Login$/i;
const dashboardHeadingPattern = /^Panel$|^Dashboard$/i;
const dashboardUpcomingMeetingEyebrowPattern =
  /^Najbliższe posiedzenie$|^Upcoming meeting$/i;

function parseBoolean(value, defaultValue = true) {
  if (!value) {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function resolveScopedCredential(target, suffix) {
  if (target === "commission") {
    return requireEnv(`HSS_E2E_COMMISSION_${suffix}`);
  }

  if (target === "meetings") {
    const meetingsValue = process.env[`HSS_E2E_MEETINGS_${suffix}`]?.trim();
    if (meetingsValue) {
      return meetingsValue;
    }

    return requireEnv(`HSS_E2E_READONLY_${suffix}`);
  }

  return requireEnv(`HSS_E2E_READONLY_${suffix}`);
}

function resolveLighthouseTarget(value) {
  const normalized = value?.trim();
  if (!normalized || normalized === "commission") {
    return "commission";
  }

  if (normalized === "instructor-application") {
    return normalized;
  }

  if (normalized === "meetings") {
    return normalized;
  }

  if (normalized === "shared-shell") {
    return normalized;
  }

  if (normalized === "dashboard") {
    return normalized;
  }

  throw new Error(
    `Unsupported HSS_E2E_LIGHTHOUSE_TARGET: ${value}. Expected "commission", "instructor-application", "meetings", "shared-shell", or "dashboard".`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        if (!port) {
          reject(new Error("Could not resolve a free TCP port."));
          return;
        }

        resolve(port);
      });
    });
  });
}

async function loginByKeycloak(
  page,
  { baseUrl, locale, username, password, callbackPath },
) {
  const loginUrl = new URL("/api/auth/login", baseUrl);
  const callbackUrlPattern = new RegExp(
    `${escapeRegExp(callbackPath)}(?:$|[/?])`,
    "i",
  );

  loginUrl.searchParams.set("locale", locale);
  loginUrl.searchParams.set("callbackPath", callbackPath);

  await page.goto(loginUrl.toString(), { waitUntil: "networkidle" });

  try {
    const loginState = await Promise.race([
      page
        .locator(keycloakUsernameSelector)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "form"),
      page.waitForURL(callbackUrlPattern, { timeout: 15_000 }).then(
        () => "callback",
      ),
    ]);

    if (loginState !== "callback") {
      await page.locator(keycloakUsernameSelector).first().fill(username);
      await page.locator(keycloakPasswordSelector).first().fill(password);
      await Promise.all([
        page.waitForURL(callbackUrlPattern, {
          timeout: 30_000,
        }),
        page.locator(keycloakSubmitSelector).first().click(),
      ]);
    }
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 400);

    throw new Error(
      `Unable to complete Keycloak login at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }

  await page.waitForLoadState("networkidle");
}

async function resolveLighthouseReport(auditResult, reportDir, reportName) {
  const inMemoryReport = auditResult?.lhr ?? auditResult?.results?.lhr ?? null;
  if (inMemoryReport) {
    return inMemoryReport;
  }

  const reportPath = path.join(reportDir, `${reportName}.json`);
  const raw = await fs.readFile(reportPath, "utf8");
  return JSON.parse(raw);
}

async function ensureAuthenticatedAuditUrl({
  auditResult,
  reportDir,
  reportName,
  expectedUrl,
  expectedHost,
  label,
}) {
  const report = await resolveLighthouseReport(auditResult, reportDir, reportName);
  const finalUrl = report?.finalUrl ?? report?.finalDisplayedUrl ?? null;
  const requestedUrl = report?.requestedUrl ?? null;

  if (!finalUrl) {
    throw new Error(
      `Lighthouse did not expose finalUrl for ${label}. Requested URL: ${expectedUrl}.`,
    );
  }

  const final = new URL(finalUrl);

  if (final.host !== expectedHost) {
    throw new Error(
      `Lighthouse audited ${label} outside the app host. Requested: ${requestedUrl ?? expectedUrl}. Final: ${finalUrl}.`,
    );
  }
}

async function runAudit({
  page,
  port,
  thresholds,
  reportDir,
  reportName,
  expectedHost,
  label,
}) {
  const auditResult = await playAudit({
    page,
    port,
    thresholds,
    reports: {
      directory: reportDir,
      formats: {
        html: true,
        json: true,
      },
      name: reportName,
    },
  });

  await ensureAuthenticatedAuditUrl({
    auditResult,
    reportDir,
    reportName,
    expectedUrl: page.url(),
    expectedHost,
    label,
  });
}

async function stabilizeProtectedRoute(page, assertReady, label) {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (attempt > 0) {
        await page.goto(page.url(), { waitUntil: "networkidle" });
      }

      await assertReady(page);
      await page.waitForTimeout(400);
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }

  throw new Error(
    `${label} did not stabilize before Lighthouse audit at ${page.url()}.`,
    { cause: lastError },
  );
}

function extractApplicationRouteParts(url, { baseUrl, locale }) {
  const parsedUrl = url.startsWith("http") ? new URL(url) : new URL(url, baseUrl);
  const match = parsedUrl.pathname.match(
    new RegExp(`^/${locale}/applications/([0-9a-f-]+)/edit$`, "i"),
  );

  if (!match) {
    throw new Error(`Expected edit application URL, received: ${url}`);
  }

  const id = match[1];
  return {
    id,
    detailPath: `/${locale}/applications/${id}`,
    editPath: `/${locale}/applications/${id}/edit`,
  };
}

function buildApplicationListUrlPattern(locale) {
  return new RegExp(`/${locale}/applications(?:$|[/?])`, "i");
}

function buildApplicationEditUrlPattern(locale) {
  return new RegExp(`/${locale}/applications/[0-9a-f-]+/edit(?:$|\\?)`, "i");
}

function buildNewApplicationUrlPattern(locale) {
  return new RegExp(`/${locale}/applications/new(?:$|\\?)`, "i");
}

async function assertApplicationsListReady(page, locale) {
  await page.waitForURL(buildApplicationListUrlPattern(locale), { timeout: 15_000 });
  await page
    .getByRole("heading", { name: applicationsHeadingPattern })
    .waitFor({ state: "visible", timeout: 10_000 });
}

async function getFirstEditableApplication(page, locale, baseUrl) {
  const editLink = page
    .locator(`a[href^='/${locale}/applications/'][href$='/edit']`)
    .first();

  if ((await editLink.count()) === 0) {
    return null;
  }

  const href = await editLink.getAttribute("href");
  return href ? extractApplicationRouteParts(href, { baseUrl, locale }) : null;
}

async function waitForEditableApplicationFromList(page, locale, baseUrl) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto(new URL(`/${locale}/applications`, baseUrl).toString(), {
      waitUntil: "networkidle",
    });
    await assertApplicationsListReady(page, locale);

    const existingApplication = await getFirstEditableApplication(
      page,
      locale,
      baseUrl,
    );
    if (existingApplication) {
      return existingApplication;
    }

    await page.waitForTimeout(500);
  }

  throw new Error("Expected an editable application to appear on the list.");
}

async function waitForEditRouteOrCreateAlert(page, locale) {
  const createAlert = page.locator("main [role='alert']").first();
  const editUrlPattern = buildApplicationEditUrlPattern(locale);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (editUrlPattern.test(page.url())) {
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

async function ensureDraftApplication(page, { baseUrl, locale, templateIndex = 0 }) {
  const existingApplication = await waitForEditableApplicationFromList(
    page,
    locale,
    baseUrl,
  ).catch(() => null);

  if (existingApplication) {
    return existingApplication;
  }

  await page.getByRole("link", { name: /^Nowy wniosek$|^New Application$/i }).click();
  await page.waitForURL(buildNewApplicationUrlPattern(locale), { timeout: 15_000 });
  await page
    .getByRole("heading", { name: selectTemplateHeadingPattern })
    .waitFor({ state: "visible", timeout: 10_000 });

  const templateButtons = page.locator("button").filter({
    has: page.locator("h3"),
  });
  const templateCount = await templateButtons.count();

  if (templateCount === 0) {
    throw new Error("Expected at least one application template button.");
  }

  const selectedTemplateIndex = Math.min(templateIndex, templateCount - 1);
  await templateButtons.nth(selectedTemplateIndex).click();

  const outcome = await waitForEditRouteOrCreateAlert(page, locale);
  if (outcome === "edit") {
    await page.waitForLoadState("networkidle");
    return extractApplicationRouteParts(page.url(), { baseUrl, locale });
  }

  const alertText =
    (await page.locator("main [role='alert']").first().textContent().catch(() => null))?.trim() ??
    "";
  if (activeApplicationAlertPattern.test(alertText)) {
    return await waitForEditableApplicationFromList(page, locale, baseUrl);
  }

  throw new Error(`Unexpected application create alert: ${alertText || "n/a"}`);
}

async function assertInstructorApplicationDetailReady(page) {
  try {
    await page.locator("[role='tablist']").first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Instructor application detail is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function assertInstructorApplicationEditReady(page) {
  try {
    await page
      .getByRole("button", { name: requirementsStepPattern })
      .waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Instructor application edit is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function assertMeetingsReady(page, locale, expectedView) {
  try {
    const currentUrl = new URL(page.url());
    const expectedPath = `/${locale}/meetings`;

    if (currentUrl.pathname !== expectedPath) {
      throw new Error(
        `Expected meetings pathname ${expectedPath}, received ${currentUrl.pathname}.`,
      );
    }

    if (currentUrl.searchParams.get("view") !== expectedView) {
      throw new Error(
        `Expected meetings view "${expectedView}", received "${currentUrl.searchParams.get("view") ?? ""}".`,
      );
    }

    await page
      .getByRole("heading", { name: meetingsHeadingPattern })
      .waitFor({ state: "visible", timeout: 10_000 });

    const pageLevelAlert = page.locator("main [role='alert']").first();
    if (await pageLevelAlert.isVisible().catch(() => false)) {
      const alertText = (await pageLevelAlert.textContent().catch(() => null))
        ?.trim()
        ?.slice(0, 500);
      const debugStatus =
        (await pageLevelAlert.getAttribute("data-fetch-error-status").catch(() => null)) ??
        "n/a";
      const debugCode =
        (await pageLevelAlert.getAttribute("data-fetch-error-code").catch(() => null)) ?? "n/a";
      const debugRequestId =
        (await pageLevelAlert.getAttribute("data-fetch-request-id").catch(() => null)) ??
        "n/a";
      throw new Error(
        `Meetings ${expectedView} view rendered a blocking alert: ${alertText ?? "n/a"}. Debug status=${debugStatus}, code=${debugCode}, requestId=${debugRequestId}.`,
      );
    }

    if (expectedView === "list") {
      await page
        .locator("button[aria-expanded]")
        .first()
        .waitFor({ state: "visible", timeout: 10_000 });
    } else {
      await page
        .getByRole("link", {
          name: /^Poprzedni miesiąc$|^Previous month$/i,
        })
        .first()
        .waitFor({ state: "visible", timeout: 10_000 });
    }
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Meetings ${expectedView} view is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function assertSharedShellHomeReady(page, locale) {
  try {
    const currentUrl = new URL(page.url());
    const expectedPath = `/${locale}`;

    if (currentUrl.pathname !== expectedPath) {
      throw new Error(
        `Expected shared shell home pathname ${expectedPath}, received ${currentUrl.pathname}.`,
      );
    }

    await page
      .getByRole("link", { name: /^HSS$/i })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .getByRole("button", { name: sharedShellLoginPattern })
      .waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Shared shell home is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function assertSharedShellProfileReady(page, locale) {
  try {
    const currentUrl = new URL(page.url());
    const expectedPath = `/${locale}/profile`;

    if (currentUrl.pathname !== expectedPath) {
      throw new Error(
        `Expected shared shell profile pathname ${expectedPath}, received ${currentUrl.pathname}.`,
      );
    }

    await page
      .getByRole("heading", { name: profileHeadingPattern })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .getByRole("link", { name: profileEditLinkPattern })
      .waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Shared shell profile is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function assertDashboardReady(page, locale) {
  try {
    const currentUrl = new URL(page.url());
    const expectedPath = `/${locale}/dashboard`;

    if (currentUrl.pathname !== expectedPath) {
      throw new Error(
        `Expected dashboard pathname ${expectedPath}, received ${currentUrl.pathname}.`,
      );
    }

    await page
      .getByRole("heading", { name: dashboardHeadingPattern })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .getByText(dashboardUpcomingMeetingEyebrowPattern)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    await page
      .locator(`a[href^='/${locale}/meetings']`)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Dashboard is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function getFirstCommissionApplicationPath(page, locale) {
  const firstApplicationLink = page
    .locator(`a[href^='/${locale}/commission/'][href*='/applications/']`)
    .first();
  const href = await firstApplicationLink.getAttribute("href");

  if (!href) {
    throw new Error("Expected commission inbox to expose an application link.");
  }

  return href;
}

async function assertCommissionInboxReady(page, locale) {
  const firstApplicationLink = page
    .locator(`a[href^='/${locale}/commission/'][href*='/applications/']`)
    .first();

  try {
    await firstApplicationLink.waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Commission inbox is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function assertCommissionDetailReady(page) {
  const historyTab = page.getByRole("link", { name: commissionHistoryPattern });

  try {
    await historyTab.waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = (
      await page.locator("body").textContent().catch(() => null)
    )
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Commission detail is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function runCommissionLighthouse({
  page,
  baseUrl,
  locale,
  port,
  thresholds,
  reportDir,
  expectedHost,
}) {
  await stabilizeProtectedRoute(
    page,
    () => assertCommissionInboxReady(page, locale),
    "Commission inbox",
  );
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "commission-inbox",
    expectedHost,
    label: "commission inbox",
  });

  const firstApplicationPath = await getFirstCommissionApplicationPath(page, locale);
  await page.goto(new URL(firstApplicationPath, baseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await stabilizeProtectedRoute(page, () => assertCommissionDetailReady(page), "Commission detail");

  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "commission-application-detail",
    expectedHost,
    label: "commission application detail",
  });
}

async function runInstructorApplicationLighthouse({
  page,
  baseUrl,
  locale,
  port,
  thresholds,
  reportDir,
  expectedHost,
}) {
  await stabilizeProtectedRoute(
    page,
    () => assertApplicationsListReady(page, locale),
    "Instructor application list",
  );
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "instructor-application-list",
    expectedHost,
    label: "instructor application list",
  });

  const application = await ensureDraftApplication(page, { baseUrl, locale });

  await page.goto(new URL(application.detailPath, baseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await stabilizeProtectedRoute(
    page,
    () => assertInstructorApplicationDetailReady(page),
    "Instructor application detail",
  );
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "instructor-application-detail",
    expectedHost,
    label: "instructor application detail",
  });

  await page.goto(
    new URL(`${application.editPath}?step=requirements`, baseUrl).toString(),
    {
      waitUntil: "networkidle",
    },
  );
  await stabilizeProtectedRoute(
    page,
    () => assertInstructorApplicationEditReady(page),
    "Instructor application edit",
  );
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "instructor-application-edit",
    expectedHost,
    label: "instructor application edit",
  });
}

async function runMeetingsLighthouse({
  page,
  baseUrl,
  locale,
  port,
  thresholds,
  reportDir,
  expectedHost,
}) {
  const listPath = `/${locale}/meetings?view=list&month=2026-04&commission=instructor`;
  const calendarPath = `/${locale}/meetings?view=calendar&month=2026-04&commission=instructor`;

  async function stabilizeMeetingsRoute(pathname, expectedView, label) {
    let lastError = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await page.goto(new URL(pathname, baseUrl).toString(), {
          waitUntil: "networkidle",
        });
        await assertMeetingsReady(page, locale, expectedView);
        await page.waitForTimeout(800);
        return;
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(1500 * (attempt + 1));
      }
    }

    throw new Error(`${label} did not stabilize before Lighthouse audit.`, {
      cause: lastError,
    });
  }

  await stabilizeMeetingsRoute(listPath, "list", "Meetings list");
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "meetings-list",
    expectedHost,
    label: "meetings list",
  });

  await stabilizeMeetingsRoute(calendarPath, "calendar", "Meetings calendar");
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "meetings-calendar",
    expectedHost,
    label: "meetings calendar",
  });
}

async function runSharedShellLighthouse({
  page,
  baseUrl,
  locale,
  port,
  thresholds,
  reportDir,
  expectedHost,
  username,
  password,
}) {
  await page.goto(new URL(`/${locale}`, baseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await stabilizeProtectedRoute(
    page,
    () => assertSharedShellHomeReady(page, locale),
    "Shared shell home",
  );
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "shared-shell-home",
    expectedHost,
    label: "shared shell home",
  });

  await loginByKeycloak(page, {
    baseUrl,
    locale,
    username,
    password,
    callbackPath: `/${locale}/profile`,
  });

  await page.goto(new URL(`/${locale}/profile`, baseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await stabilizeProtectedRoute(
    page,
    () => assertSharedShellProfileReady(page, locale),
    "Shared shell profile",
  );
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "shared-shell-profile",
    expectedHost,
    label: "shared shell profile",
  });
}

async function runDashboardLighthouse({
  page,
  baseUrl,
  locale,
  port,
  thresholds,
  reportDir,
  expectedHost,
}) {
  await page.goto(new URL(`/${locale}/dashboard`, baseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await stabilizeProtectedRoute(
    page,
    () => assertDashboardReady(page, locale),
    "Dashboard",
  );
  await runAudit({
    page,
    port,
    thresholds,
    reportDir,
    reportName: "dashboard-page",
    expectedHost,
    label: "dashboard page",
  });
}

const baseUrl = process.env.HSS_E2E_BASE_URL?.trim() || "https://hss.local";
const locale = process.env.HSS_E2E_LOCALE?.trim() || "pl";
const target = resolveLighthouseTarget(process.env.HSS_E2E_LIGHTHOUSE_TARGET);
const ignoreHttpsErrors = parseBoolean(
  process.env.HSS_E2E_IGNORE_HTTPS_ERRORS,
  true,
);
const reportDir = path.resolve(
  process.cwd(),
  process.env.HSS_E2E_LIGHTHOUSE_REPORT_DIR?.trim() ||
    "generated/lighthouse-report",
);
const username = resolveScopedCredential(target, "USERNAME");
const password = resolveScopedCredential(target, "PASSWORD");
const callbackPath =
  target === "commission"
    ? `/${locale}/commission`
    : target === "meetings"
      ? `/${locale}/meetings`
      : target === "dashboard"
        ? `/${locale}/dashboard`
      : target === "shared-shell"
        ? `/${locale}/profile`
      : `/${locale}/applications`;
const tmpRootDir = path.join(os.tmpdir(), "hss-playwright-lighthouse");
const thresholds = {
  performance: Number(process.env.HSS_E2E_LIGHTHOUSE_MIN_PERFORMANCE ?? "20"),
  accessibility: Number(
    process.env.HSS_E2E_LIGHTHOUSE_MIN_ACCESSIBILITY ?? "80",
  ),
  "best-practices": Number(
    process.env.HSS_E2E_LIGHTHOUSE_MIN_BEST_PRACTICES ?? "80",
  ),
  seo: Number(process.env.HSS_E2E_LIGHTHOUSE_MIN_SEO ?? "50"),
};

await fs.mkdir(reportDir, { recursive: true });
await fs.mkdir(tmpRootDir, { recursive: true });

const port = await getFreePort();
const userDataDir = path.join(
  tmpRootDir,
  `${target}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
);
const expectedHost = new URL(baseUrl).host;
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  ignoreHTTPSErrors: ignoreHttpsErrors,
  args: [`--remote-debugging-port=${port}`],
});

try {
  const page = context.pages()[0] ?? (await context.newPage());

  if (target === "shared-shell") {
    await runSharedShellLighthouse({
      page,
      baseUrl,
      locale,
      port,
      thresholds,
      reportDir,
      expectedHost,
      username,
      password,
    });
  } else {
    await loginByKeycloak(page, {
      baseUrl,
      locale,
      username,
      password,
      callbackPath,
    });
  }

  if (target === "commission") {
    await runCommissionLighthouse({
      page,
      baseUrl,
      locale,
      port,
      thresholds,
      reportDir,
      expectedHost,
    });
  } else if (target === "meetings") {
    await runMeetingsLighthouse({
      page,
      baseUrl,
      locale,
      port,
      thresholds,
      reportDir,
      expectedHost,
    });
  } else if (target === "dashboard") {
    await runDashboardLighthouse({
      page,
      baseUrl,
      locale,
      port,
      thresholds,
      reportDir,
      expectedHost,
    });
  } else if (target === "instructor-application") {
    await runInstructorApplicationLighthouse({
      page,
      baseUrl,
      locale,
      port,
      thresholds,
      reportDir,
      expectedHost,
    });
  }
} finally {
  await context.close();
  await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}
