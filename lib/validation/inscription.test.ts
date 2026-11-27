import { describe, expect, it } from "vitest";
import { inscriptionInputSchema } from "./inscription";

describe("inscriptionInputSchema", () => {
  const base = {
    prenom: "Claire",
    nom: "Martin",
    email: "c.martin@cabinet-martin.fr",
    password: "MotDePasseLong1!",
    cabinetName: "Cabinet Martin",
    rpps: "10001234567",
    adresse: "12 rue des Lilas, Lyon",
    subdomain: "cabinet-martin",
    displayName: "Cabinet Martin",
    cgu: true as const,
    dpa: true as const,
    demoData: true,
    captchaToken: "a".repeat(20),
    captchaAnswer: "7",
  };

  it("accepte une saisie valide", () => {
    expect(inscriptionInputSchema.safeParse(base).success).toBe(true);
  });

  it("refuse CGU non acceptées", () => {
    expect(inscriptionInputSchema.safeParse({ ...base, cgu: false }).success).toBe(false);
  });

  it("refuse mot de passe trop court", () => {
    expect(inscriptionInputSchema.safeParse({ ...base, password: "court" }).success).toBe(false);
  });
});
