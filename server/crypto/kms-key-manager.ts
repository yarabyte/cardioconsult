import type { KeyManager, WrappedDek } from "./types";

/**
 * Emplacement pour KMS/Vault en production.
 * Toute tentative d'usage lève une erreur explicite tant que non configuré.
 */
export class KmsKeyManager implements KeyManager {
  async wrapDek(_dek: Buffer): Promise<WrappedDek> {
    throw new Error("KmsKeyManager non configuré — utiliser un KMS/Vault HDS en production.");
  }

  async unwrapDek(_wrapped: WrappedDek): Promise<Buffer> {
    throw new Error("KmsKeyManager non configuré — utiliser un KMS/Vault HDS en production.");
  }

  async rewrapDek(_wrapped: WrappedDek): Promise<WrappedDek> {
    throw new Error("KmsKeyManager non configuré — utiliser un KMS/Vault HDS en production.");
  }

  deriveBlindIndexKey(_dek: Buffer): Buffer {
    throw new Error("KmsKeyManager non configuré.");
  }
}
