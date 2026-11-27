import { z } from "zod";

export const CGU_VERSION = "2026.1";
export const DPA_VERSION = "2026.1";

export const inscriptionInputSchema = z
  .object({
    prenom: z.string().trim().min(1).max(80),
    nom: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
    cabinetName: z.string().trim().min(2).max(200),
    rpps: z.string().regex(/^\d{11}$/),
    adresse: z.string().trim().min(5).max(300),
    subdomain: z.string().trim().min(2).max(30),
    displayName: z.string().trim().min(2).max(200),
    /** Plan commercial forcé Solo côté serveur — le client ne choisit plus d’offre. */
    cgu: z.literal(true),
    dpa: z.literal(true),
    demoData: z.boolean().default(true),
    captchaToken: z.string().min(10),
    captchaAnswer: z.string().min(1).max(8),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export type InscriptionInput = z.infer<typeof inscriptionInputSchema>;
