import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = "encv1";
const SEP = ".";

export function encryptAesGcm(dek: Buffer, plaintext: string): string {
  if (dek.length !== 32) throw new Error("DEK invalide (32 octets requis).");
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(SEP);
}

export function decryptAesGcm(dek: Buffer, payload: string): string {
  if (dek.length !== 32) throw new Error("DEK invalide (32 octets requis).");
  const parts = payload.split(SEP);
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Payload chiffré invalide.");
  }
  const [, ivB64, dataB64, tagB64] = parts;
  // dataB64 peut être vide (clair vide → ciphertext 0 octet).
  if (!ivB64 || tagB64 == null || tagB64 === "") {
    throw new Error("Payload chiffré incomplet.");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const data = Buffer.from(dataB64 ?? "", "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("Payload chiffré corrompu.");
  }
  const decipher = createDecipheriv(ALGO, dek, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}

export function generateDek(): Buffer {
  return randomBytes(32);
}
