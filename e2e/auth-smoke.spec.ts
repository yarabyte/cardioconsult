import { expect, test } from "@playwright/test";

test.describe("Auth — fumée", () => {
  test("page connexion tenant accessible", async ({ page }) => {
    await page.goto("http://dr-martin.localhost:3000/connexion");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pro Santé Connect/i })).toBeDisabled();
  });
});
