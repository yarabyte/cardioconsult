/**
 * Catalogue des offres — sièges et modules en code métier ;
 * montants HT uniquement via variables d'environnement (jamais en dur).
 */

import { env } from "@/env";
import type { PlanKey } from "@/lib/rbac";

export type PlanCatalogEntry = {
  key: PlanKey;
  label: string;
  seats: number;
  modules: string[];
  /** Prix HT mensuel (€) — null = sur devis / non publié. */
  priceHtEur: number | null;
  stripePriceId: string | null;
};

export function getPlanCatalog(): PlanCatalogEntry[] {
  return [
    {
      key: "solo",
      label: "Solo",
      seats: 2,
      modules: ["consultation", "dossier", "ordonnances"],
      priceHtEur: env.STRIPE_PRICE_SOLO_EUR ?? null,
      stripePriceId: env.STRIPE_PRICE_ID_SOLO ?? null,
    },
    {
      key: "cabinet",
      label: "Cabinet",
      seats: 6,
      modules: ["consultation", "dossier", "ordonnances", "statistiques"],
      priceHtEur: env.STRIPE_PRICE_CABINET_EUR ?? null,
      stripePriceId: env.STRIPE_PRICE_ID_CABINET ?? null,
    },
    {
      key: "clinique",
      label: "Clinique",
      seats: 50,
      modules: ["consultation", "dossier", "ordonnances", "statistiques", "hospitalisation"],
      priceHtEur: null,
      stripePriceId: env.STRIPE_PRICE_ID_CLINIQUE ?? null,
    },
  ];
}

export function getPlanEntry(key: PlanKey): PlanCatalogEntry {
  const entry = getPlanCatalog().find((p) => p.key === key);
  if (!entry) throw new Error(`Offre inconnue: ${key}`);
  return entry;
}

export function formatPriceHt(price: number | null): string {
  if (price == null) return "Sur devis";
  return `${price} € HT / mois`;
}
