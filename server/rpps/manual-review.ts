import type { RppsVerifier, RppsVerificationResult } from "./types";

/** Clé de contrôle RPPS (11 chiffres) — algorithme Luhn adapté. */
export function isValidRppsChecksum(rpps: string): boolean {
  if (!/^\d{11}$/.test(rpps)) return false;
  const digits = rpps.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let n = digits[i]!;
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === digits[10];
}

/**
 * Implémentation provisoire : pas d'appel à l'annuaire santé.
 * Le cabinet reste en essai ; export / abonnement payant bloqués tant que non validé support.
 */
export class ManualReviewRppsVerifier implements RppsVerifier {
  async verify(rpps: string): Promise<RppsVerificationResult> {
    if (!isValidRppsChecksum(rpps)) {
      return {
        status: "rejected",
        rpps,
        message: "Numéro RPPS invalide (format ou clé de contrôle).",
      };
    }
    return {
      status: "pending_manual_review",
      rpps,
      message:
        "RPPS enregistré — vérification manuelle par le support. L'essai est possible ; export et abonnement payant restent bloqués.",
    };
  }
}

export function getRppsVerifier(): RppsVerifier {
  return new ManualReviewRppsVerifier();
}
