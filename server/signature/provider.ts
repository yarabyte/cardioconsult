/**
 * Signature électronique e-CPS — interface uniquement.
 * Implémentation NotAvailable tant qu'aucune intégration homologuée.
 */

export type SignatureRequest = {
  documentId: string;
  documentVersion: number;
  actorId: string;
};

export type SignatureResult =
  | { ok: true; signedAt: string; providerRef: string }
  | { ok: false; code: "not_available" | "denied"; message: string };

export interface SignatureProvider {
  readonly id: string;
  sign(req: SignatureRequest): Promise<SignatureResult>;
}

export class NotAvailableSignatureProvider implements SignatureProvider {
  readonly id = "NotAvailable";
  async sign(_req: SignatureRequest): Promise<SignatureResult> {
    return {
      ok: false,
      code: "not_available",
      message:
        "Signature e-CPS non disponible — le document reste au statut « validé » uniquement.",
    };
  }
}

export function getSignatureProvider(): SignatureProvider {
  return new NotAvailableSignatureProvider();
}
