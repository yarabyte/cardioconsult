/**
 * Contrat SESAM-Vitale / lecture Carte Vitale.
 * Aucune implémentation homologuée branchée : seul NotAvailable remplit ce contrat.
 */

export type VitaleSex = "F" | "H" | "Autre" | "NonRenseigne";

/** Identité assurée telle qu’exposée par un futur connecteur homologué. */
export type VitaleIdentity = {
  lastName: string;
  firstName: string;
  birthName: string | null;
  birthDate: string;
  sex: VitaleSex;
  /** Bénéficiaires listés sur la carte — jamais peuplés par le stub. */
  beneficiaries: Array<{
    lastName: string;
    firstName: string;
    birthDate: string;
    sex: VitaleSex;
  }>;
};

export type VitaleReadResult =
  { status: "unavailable"; message: string } | { status: "ok"; identity: VitaleIdentity };

export interface SesamVitaleAdapter {
  readonly id: string;
  readCard(): Promise<VitaleReadResult>;
}
