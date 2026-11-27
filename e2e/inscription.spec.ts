import { expect, test } from "@playwright/test";

test.describe("Inscription cabinet", () => {
  test("assistant 4 étapes visible sur le domaine racine", async ({ page }) => {
    await page.goto("http://localhost:3000/inscription");
    await expect(
      page.getByRole("heading", { name: /Créez l'espace de votre cabinet/i }),
    ).toBeVisible();
    await expect(page.getByText("Étape 1 sur 4")).toBeVisible();
    await expect(page.getByLabel("Prénom")).toBeVisible();
  });

  test("refuse un sous-domaine réservé après navigation", async ({ page }) => {
    await page.goto("http://localhost:3000/inscription");
    await page.getByLabel("Prénom").fill("Claire");
    await page.getByLabel("Nom").fill("Martin");
    await page.getByLabel("Adresse e-mail professionnelle").fill("c.martin@cabinet-martin.fr");
    await page.getByLabel("Mot de passe").fill("MotDePasseLong1!");
    await page.getByRole("button", { name: "Suivant" }).click();

    await page.getByLabel("Nom du cabinet").fill("Cabinet Martin");
    await page.getByLabel("Numéro RPPS").fill("10001234567");
    await page.getByLabel("Adresse du cabinet").fill("12 rue des Lilas, 69003 Lyon");
    await page.getByRole("button", { name: "Suivant" }).click();

    await page.getByLabel("Sous-domaine").fill("console");
    await expect(page.getByText(/réservé/i)).toBeVisible({ timeout: 5000 });
  });
});
