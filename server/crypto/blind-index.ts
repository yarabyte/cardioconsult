import { createHmac } from "node:crypto";

/** Normalisation FR pour recherche : minuscules, trim, accents retirés, espaces condensés. */
export function normalizeForBlindIndex(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function blindIndexHmac(indexKey: Buffer, value: string): string {
  const normalized = normalizeForBlindIndex(value);
  return createHmac("sha256", indexKey).update(normalized, "utf8").digest("hex");
}
