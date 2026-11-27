import { customType } from "drizzle-orm/pg-core";
import { decryptAesGcm, encryptAesGcm } from "./envelope";
import { blindIndexHmac } from "./blind-index";
import { getTenantCrypto } from "./tenant-crypto-context";

/** Texte clair ↔ AES-256-GCM (nécessite runWithTenantCrypto). */
export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value: string): string {
    const { dek } = getTenantCrypto();
    return encryptAesGcm(dek, value ?? "");
  },
  fromDriver(value: unknown): string {
    if (value == null || value === "") return "";
    const { dek } = getTenantCrypto();
    return decryptAesGcm(dek, String(value));
  },
});

/** Index aveugle HMAC-SHA256 (hex) sur valeur normalisée. */
export const blindIndex = customType<{ data: string; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value: string): string {
    const { blindIndexKey } = getTenantCrypto();
    return blindIndexHmac(blindIndexKey, value);
  },
  fromDriver(value: string): string {
    return value;
  },
});
