"use server";

import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { getSesamVitaleAdapter } from "@/server/vitale/not-available";

/**
 * Tentative de lecture Carte Vitale.
 * Avec NotAvailable : toujours `not_available` — jamais de préremplissage identité.
 * Permission `patient.read` : accueil IDE et médecin (écriture patient = action séparée).
 */
export async function readCarteVitaleAction() {
  try {
    const ctx = await requireContext({
      permission: "patient.read",
      redirectOnFail: false,
    });
    if (!ctx.tenant) {
      return {
        ok: false as const,
        error: { code: "tenant" as const, message: "Cabinet requis" },
      };
    }

    const result = await getSesamVitaleAdapter().readCard();
    if (result.status === "unavailable") {
      return {
        ok: false as const,
        error: { code: "not_available" as const, message: result.message },
      };
    }

    return { ok: true as const, identity: result.identity };
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      return {
        ok: false as const,
        error: { code: "access_denied" as const, message: "Accès refusé" },
      };
    }
    return {
      ok: false as const,
      error: {
        code: "not_available" as const,
        message:
          "Carte Vitale / télétransmission non disponible — aucun connecteur homologué n’est branché.",
      },
    };
  }
}
