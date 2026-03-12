// @file: apps/web/e2e/commission/commission-smoke.e2e.spec.ts
import { expect, test, type Page } from "@playwright/test";
import { loginByKeycloak } from "../support/auth";
import { getE2eEnv, hasProfileCredentials } from "../support/test-env";

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

test.describe("commission workspace smoke", () => {
  test("should open the commission inbox and first application detail", async ({
    page,
  }) => {
    await loginByKeycloak(page, "commission");
    await page.goto(`/${env.locale}/commission`, { waitUntil: "networkidle" });

    const applicationPath = await getFirstApplicationPath(page);
    await page.goto(applicationPath, { waitUntil: "networkidle" });

    await expect(page).toHaveURL(
      new RegExp(
        `/${env.locale}/commission/[0-9a-f-]+/applications/[0-9a-f-]+`,
      ),
    );
    await expect(
      page.getByRole("button", { name: /Historia|History/i }),
    ).toBeVisible();
  });
});

if (hasProfileCredentials("readonly")) {
  test.describe("commission access boundary", () => {
    test("should render access denied for a user without commission role", async ({
      page,
    }) => {
      await loginByKeycloak(page, "readonly");
      await page.goto(`/${env.locale}/commission`, {
        waitUntil: "networkidle",
      });

      await expect(page).toHaveURL(new RegExp(`/${env.locale}/commission/?$`));
      await expect(
        page.getByRole("heading", { name: /^Komisja$|^Commission$/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: /Brak dostępu|Access denied/i,
        }),
      ).toBeVisible();
      await expect(
        page.locator(
          `a[href^='/${env.locale}/commission/'][href*='/applications/']`,
        ),
      ).toHaveCount(0);
    });
  });
}
