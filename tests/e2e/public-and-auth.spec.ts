import { expect, test } from "@playwright/test";

test("registration form does not expose privileged roles", async ({ page }) => {
  await page.goto("/cs/auth/register");
  await expect(page.getByText("Registrace", { exact: true })).toBeVisible();
  await expect(page.getByText(/ADMIN|Administrátor|Učitel|Hodnotitel/)).toHaveCount(0);
  await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  await expect(page.getByLabel(/heslo/i)).toBeVisible();
});

test("protected dashboard redirects an anonymous user to login", async ({ page }) => {
  await page.goto("/cs/dashboard");
  await expect(page).toHaveURL(/\/cs\/auth\/login/);
  await expect(page.getByLabel(/e-mail/i)).toBeVisible();
});
