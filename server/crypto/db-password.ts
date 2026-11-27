import { hkdfSync } from "node:crypto";
import { decryptAesGcm, encryptAesGcm } from "./envelope";

function passwordKeyFromAppSecret(appSecret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", appSecret, "cc-db-password", "cardioconsult-db-pw", 32));
}

/** Chiffre le mot de passe du rôle PG (stockage control-plane). */
export function encryptDbPassword(appSecret: string, password: string): string {
  return encryptAesGcm(passwordKeyFromAppSecret(appSecret), password);
}

export function decryptDbPassword(appSecret: string, passwordEnc: string): string {
  return decryptAesGcm(passwordKeyFromAppSecret(appSecret), passwordEnc);
}
