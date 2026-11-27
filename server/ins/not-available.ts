import type { InsProvider, InsLookupResult } from "./types";

/**
 * Téléservice INSi non branché — aucune qualification simulée.
 */
export class NotAvailableInsProvider implements InsProvider {
  async lookup(_input: {
    firstName: string;
    lastName: string;
    birthDate: string;
    sex: string;
  }): Promise<InsLookupResult> {
    return {
      status: "unavailable",
      message:
        "INS non qualifiée — téléservice INSi non disponible. Aucune qualification n'est simulée.",
    };
  }
}

export function getInsProvider(): InsProvider {
  return new NotAvailableInsProvider();
}
