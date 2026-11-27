import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Patient } from "@/types/domain";

export const EXPORT_SCHEMA_VERSION = "1.0.0";
export const EXPORT_LINK_TTL_MS = 24 * 60 * 60 * 1000;

export type ExportManifest = {
  schemaVersion: string;
  tenantId: string;
  exportedAt: string;
  scope: "tenant" | "patient";
  patientIds: string[];
  files: Array<{ path: string; sha256: string }>;
};

export type TenantExportPayload = {
  manifest: ExportManifest;
  patients: Patient[];
  /** Contenu TipDoc / métadonnées docs — synthétique en démo. */
  documents: Array<{ id: string; patientId: string; title: string; status: string }>;
};

export function buildTenantExport(
  tenantId: string,
  patients: Patient[],
  scope: "tenant" | "patient",
  documents: TenantExportPayload["documents"] = [],
): TenantExportPayload {
  const files = patients.map((p) => {
    const body = JSON.stringify(p);
    return {
      path: `patients/${p.id}.json`,
      sha256: createHash("sha256").update(body).digest("hex"),
    };
  });
  return {
    manifest: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      tenantId,
      exportedAt: new Date().toISOString(),
      scope,
      patientIds: patients.map((p) => p.id),
      files,
    },
    patients,
    documents,
  };
}

/** Chiffre l'archive (JSON) avec une DEK — usage limité, audité. */
export function sealExportArchive(
  dek: Buffer,
  payload: TenantExportPayload,
): { ciphertext: string; contentSha256: string } {
  const plain = JSON.stringify(payload);
  const contentSha256 = createHash("sha256").update(plain).digest("hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ciphertext = [
    "expv1",
    iv.toString("base64url"),
    enc.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
  return { ciphertext, contentSha256 };
}

export function openExportArchive(dek: Buffer, ciphertext: string): TenantExportPayload {
  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== "expv1") {
    throw new Error("Archive invalide");
  }
  const [, ivB64, dataB64, tagB64] = parts;
  if (!ivB64 || !dataB64 || !tagB64) throw new Error("Archive incomplète");
  const decipher = createDecipheriv("aes-256-gcm", dek, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plain) as TenantExportPayload;
}

/** Réimport démo : reconstruit la liste patients sans perte d'IDs. */
export function reimportTenantExport(payload: TenantExportPayload): {
  patientCount: number;
  ids: string[];
  schemaVersion: string;
} {
  return {
    patientCount: payload.patients.length,
    ids: payload.patients.map((p) => p.id),
    schemaVersion: payload.manifest.schemaVersion,
  };
}
