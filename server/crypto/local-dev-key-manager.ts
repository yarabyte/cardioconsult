import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import type { KeyManager, WrappedDek } from "./types";

const ALGO = "aes-256-gcm";
const KEK_VERSION = "local-dev-v1";

/**
 * KEK locale dérivée de APP_SECRET (développement uniquement).
 * Ne pas utiliser en production réelle — remplacer par KmsKeyManager.
 */
export class LocalDevKeyManager implements KeyManager {
  private readonly kek: Buffer;

  constructor(secret: string) {
    if (secret.length < 32) {
      throw new Error("APP_SECRET trop court pour LocalDevKeyManager.");
    }
    this.kek = Buffer.from(hkdfSync("sha256", secret, "cc-local-kek", "cardioconsult-kek", 32));
  }

  async wrapDek(dek: Buffer): Promise<WrappedDek> {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, this.kek, iv);
    const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, tag, ciphertext]).toString("base64url");
    return { ciphertext: packed, kekVersion: KEK_VERSION, algorithm: "aes-256-gcm" };
  }

  async unwrapDek(wrapped: WrappedDek): Promise<Buffer> {
    const packed = Buffer.from(wrapped.ciphertext, "base64url");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const data = packed.subarray(28);
    const decipher = createDecipheriv(ALGO, this.kek, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  async rewrapDek(wrapped: WrappedDek): Promise<WrappedDek> {
    const dek = await this.unwrapDek(wrapped);
    return this.wrapDek(dek);
  }

  deriveBlindIndexKey(dek: Buffer): Buffer {
    return Buffer.from(hkdfSync("sha256", dek, "cc-blind-index", "cardioconsult-blind", 32));
  }
}

/** Helper tests : empreinte stable d'une KEK pour détecter une rotation. */
export function localKekFingerprint(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

export function hmacSelfTest(key: Buffer, msg: string): string {
  return createHmac("sha256", key).update(msg).digest("hex");
}
