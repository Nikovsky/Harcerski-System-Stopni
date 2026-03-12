// @file: apps/web/scripts/run-lighthouse.mjs
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";

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

async function loginByKeycloak(page, { baseUrl, locale, username, password }) {
  const loginUrl = new URL("/api/auth/login", baseUrl);
  const callbackUrlPattern = new RegExp(`/${locale}/commission(?:$|/)`);
  const usernameSelector =
    'input[name="username"], input#username, input[type="email"]';
  const passwordSelector =
    'input[name="password"], input#password, input[type="password"]';
  const submitSelector = '#kc-login, button[type="submit"]';

  loginUrl.searchParams.set("locale", locale);
  loginUrl.searchParams.set("callbackPath", `/${locale}/commission`);

  await page.goto(loginUrl.toString(), { waitUntil: "networkidle" });

  try {
    const loginState = await Promise.race([
      page
        .locator(usernameSelector)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "form"),
      page.waitForURL(callbackUrlPattern, { timeout: 15_000 }).then(
        () => "callback",
      ),
    ]);

    if (loginState !== "callback") {
      await page.locator(usernameSelector).first().fill(username);
      await page.locator(passwordSelector).first().fill(password);
      await Promise.all([
        page.waitForURL(callbackUrlPattern, {
          timeout: 30_000,
        }),
        page.locator(submitSelector).first().click(),
      ]);
    }
  } catch (error) {
    const bodyText = (await page.locator("body").textContent().catch(() => null))
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

async function getFirstApplicationPath(page, locale) {
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
    const bodyText = (await page.locator("body").textContent().catch(() => null))
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Commission inbox is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

async function assertCommissionDetailReady(page) {
  const historyTab = page.getByRole("link", { name: /Historia|History/i });

  try {
    await historyTab.waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = (await page.locator("body").textContent().catch(() => null))
      ?.trim()
      ?.slice(0, 500);

    throw new Error(
      `Commission detail is not ready at ${page.url()}. Visible body: ${bodyText ?? "n/a"}`,
      { cause: error },
    );
  }
}

const baseUrl = process.env.HSS_E2E_BASE_URL?.trim() || "https://hss.local";
const locale = process.env.HSS_E2E_LOCALE?.trim() || "pl";
const ignoreHttpsErrors = parseBoolean(
  process.env.HSS_E2E_IGNORE_HTTPS_ERRORS,
  true,
);
const username = requireEnv("HSS_E2E_COMMISSION_USERNAME");
const password = requireEnv("HSS_E2E_COMMISSION_PASSWORD");
const reportDir = path.resolve(process.cwd(), "generated", "lighthouse-report");
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
  `commission-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
);
const expectedHost = new URL(baseUrl).host;
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  ignoreHTTPSErrors: ignoreHttpsErrors,
  args: [`--remote-debugging-port=${port}`],
});

try {
  const page = context.pages()[0] ?? (await context.newPage());

  await loginByKeycloak(page, {
    baseUrl,
    locale,
    username,
    password,
  });
  await assertCommissionInboxReady(page, locale);

  const inboxReportName = "commission-inbox";
  const inboxAudit = await playAudit({
    page,
    port,
    thresholds,
    reports: {
      directory: reportDir,
      formats: {
        html: true,
        json: true,
      },
      name: inboxReportName,
    },
  });
  await ensureAuthenticatedAuditUrl({
    auditResult: inboxAudit,
    reportDir,
    reportName: inboxReportName,
    expectedUrl: page.url(),
    expectedHost,
    label: "commission inbox",
  });

  const firstApplicationPath = await getFirstApplicationPath(page, locale);
  await page.goto(new URL(firstApplicationPath, baseUrl).toString(), {
    waitUntil: "networkidle",
  });
  await assertCommissionDetailReady(page);

  const detailReportName = "commission-application-detail";
  const detailAudit = await playAudit({
    page,
    port,
    thresholds,
    reports: {
      directory: reportDir,
      formats: {
        html: true,
        json: true,
      },
      name: detailReportName,
    },
  });
  await ensureAuthenticatedAuditUrl({
    auditResult: detailAudit,
    reportDir,
    reportName: detailReportName,
    expectedUrl: page.url(),
    expectedHost,
    label: "commission application detail",
  });
} finally {
  await context.close();
  await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}
