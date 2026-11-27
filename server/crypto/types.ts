export interface WrappedDek {
  /** DEK chiffrée (enveloppe), base64url. */
  ciphertext: string;
  /** Version / id de la KEK utilisée. */
  kekVersion: string;
  algorithm: "aes-256-gcm";
}

export interface KeyManager {
  wrapDek(dek: Buffer): Promise<WrappedDek>;
  unwrapDek(wrapped: WrappedDek): Promise<Buffer>;
  /** Ré-enveloppe toutes les DEK après rotation de KEK (LocalDev / KMS). */
  rewrapDek(wrapped: WrappedDek): Promise<WrappedDek>;
  /** Clé HMAC dédiée index aveugle (dérivée, distincte de la DEK contenu). */
  deriveBlindIndexKey(dek: Buffer): Buffer;
}
