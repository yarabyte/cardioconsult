import { expect, test } from "@playwright/test";

test.describe("RBAC gates", () => {
  test.skip(true, "MFA seed TOTP requis — connexion Better Auth + compte seed");

  test("infirmière refusée sur paramètres équipe", async ({ page }) => {
    await page.goto("http://dr-martin.localhost:3000/parametres/equipe");
    await expect(page).not.toHaveURL(/parametres\/equipe/);
  });
});
