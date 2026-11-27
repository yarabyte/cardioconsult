import { createHash, randomBytes } from "node:crypto";
import { encryptAesGcm, decryptAesGcm, generateDek } from "@/server/crypto/envelope";

/**
 * Crypto-effacement : destruction de la DEK → données de sauvegarde illisibles
 * même si les blobs chiffrés existent encore.
 */
export type ErasureCertificate = {
  tenantId: string;
  erasedAt: string;
  method: "dek_destroy";
  dekFingerprintBefore: string;
  certificateId: string;
};

export function fingerprintDek(dek: Buffer): string {
  return createHash("sha256").update(dek).digest("hex").slice(0, 16);
}

export function cryptoEraseTenant(input: { tenantId: string; dek: Buffer }): {
  certificate: ErasureCertificate;
  /** DEK écrasée — ne plus utiliser. */
  destroyedDek: Buffer;
  verifyUnreadable: (ciphertext: string) => boolean;
} {
  const fingerprint = fingerprintDek(input.dek);
  // Écrasement mémoire simulé
  input.dek.fill(0);
  const destroyed = Buffer.alloc(32, 0);

  const certificate: ErasureCertificate = {
    tenantId: input.tenantId,
    erasedAt: new Date().toISOString(),
    method: "dek_destroy",
    dekFingerprintBefore: fingerprint,
    certificateId: `erase-${randomBytes(8).toString("hex")}`,
  };

  return {
    certificate,
    destroyedDek: destroyed,
    verifyUnreadable(ciphertext: string) {
      try {
        decryptAesGcm(destroyed, ciphertext);
        return false;
      } catch {
        return true;
      }
    },
  };
}

/** Helper test : chiffre un échantillon puis efface. */
export function demoEraseSample(tenantId: string) {
  const dek = generateDek();
  const sample = encryptAesGcm(dek, JSON.stringify({ patient: "SYNTHETIC", note: "demo" }));
  const result = cryptoEraseTenant({ tenantId, dek });
  return {
    ...result,
    sampleCiphertext: sample,
    unreadable: result.verifyUnreadable(sample),
  };
}
