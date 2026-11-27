/** Liste blanche MIME + magic bytes — fail closed hors liste. */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 Mo

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

export type MimeCheckResult = { ok: true; mime: AllowedMime } | { ok: false; reason: string };

function startsWith(buf: Uint8Array, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

/** Détection magic bytes (pas de confiance au Content-Type client). */
export function detectMimeFromMagic(buf: Uint8Array): AllowedMime | null {
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (
    startsWith(buf, [0x52, 0x49, 0x46, 0x46]) &&
    buf.length >= 12 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateUploadBuffer(buf: Uint8Array, claimedMime: string): MimeCheckResult {
  if (buf.byteLength === 0) return { ok: false, reason: "Fichier vide" };
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "Fichier trop volumineux (max 20 Mo)" };
  }
  const magic = detectMimeFromMagic(buf);
  if (!magic) {
    return { ok: false, reason: "Type de fichier non reconnu (magic bytes)" };
  }
  if (!ALLOWED_MIME.includes(claimedMime as AllowedMime)) {
    return { ok: false, reason: "MIME non autorisé" };
  }
  if (claimedMime !== magic) {
    return {
      ok: false,
      reason: `MIME incohérent (annoncé ${claimedMime}, détecté ${magic})`,
    };
  }
  return { ok: true, mime: magic };
}

/** EICAR standard (test antivirus) — toujours traité comme infecté. */
export const EICAR_SIGNATURE =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export function looksLikeEicar(buf: Uint8Array): boolean {
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return text.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
  } catch {
    return false;
  }
}
