import type { SesamVitaleAdapter, VitaleReadResult } from "./types";

/**
 * Carte Vitale / SESAM-Vitale non branché — aucune lecture ni FSE simulée (CDC §4.12, T-18).
 */
export class NotAvailableSesamVitaleAdapter implements SesamVitaleAdapter {
  readonly id = "NotAvailable";

  async readCard(): Promise<VitaleReadResult> {
    return {
      status: "unavailable",
      message:
        "Carte Vitale / télétransmission non disponible — aucun connecteur homologué n’est branché. Saisie manuelle obligatoire.",
    };
  }
}

export function getSesamVitaleAdapter(): SesamVitaleAdapter {
  return new NotAvailableSesamVitaleAdapter();
}
