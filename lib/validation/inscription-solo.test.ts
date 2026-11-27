import { describe, expect, it } from "vitest";
import { inscriptionInputSchema } from "./inscription";

describe("Inscription — essai Solo forcé", () => {
  const base = {
    prenom: "Alice",
    nom: "Martin",
    email: "alice@cabinet.fr",
    password: "MotDePasseLong1!",
    cabinetName: "Cabinet Martin",
    rpps: "10003111111",
    adresse: "1 rue de la Paix, Paris",
    subdomain: "cabinet-martin",
    displayName: "Cabinet Martin",
    cgu: true as const,
    dpa: true as const,
    demoData: true,
    captchaToken: "x".repeat(20),
    captchaAnswer: "4",
  };

  it("accepte le payload sans champ plan", () => {
    const parsed = inscriptionInputSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("plan" in parsed.data).toBe(false);
    }
  });

  it("rejette un plan envoyé par le client (schéma strict)", () => {
    const parsed = inscriptionInputSchema.safeParse({ ...base, plan: "cabinet" });
    expect(parsed.success).toBe(false);
  });
});
