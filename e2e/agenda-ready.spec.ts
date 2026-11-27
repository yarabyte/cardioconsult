import { expect, test } from "@playwright/test";

test.describe("Agenda / IDE prêt", () => {
  test.skip(true, "MFA seed TOTP requis — connexion Better Auth + compte seed");

  test("médecin voit les créneaux agenda", async ({ page }) => {
    await page.goto("http://dr-martin.localhost:3000/agenda");
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
    await expect(page.getByText(/Liste d'attente/i)).toBeVisible();
  });

  test("IDE peut marquer prêt (constantes + poids)", async ({ page }) => {
    await page.goto("http://dr-martin.localhost:3000/infirmiere");
    await expect(page.getByRole("heading", { name: /Accueil cabinet/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Marquer prêt/i }).first()).toBeVisible();
  });
});
