import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { env } from "@/env";
import { fileObjects } from "@/db/tenant/schema";
import { looksLikeEicar, validateUploadBuffer, type AllowedMime } from "@/lib/files/mime";
import { createPresignedToken, verifyPresignedToken } from "@/lib/files/presign";
import { withTenantDb, type TenantDb } from "@/server/db/tenant-db";
import { getObjectStorage } from "./object-storage";
import { scanBuffer, setClamScanner, demoClamScanner, createNetworkClamScanner } from "./clamav";

export { setClamScanner, demoClamScanner };

export type FileLifecycleStatus = "en_analyse" | "disponible" | "rejete";
export type FileVirusScanStatus = "pending" | "clean" | "infected" | "error";

export type FileObjectRecord = {
  id: string;
  patientId: string;
  encounterId: string | null;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  status: FileLifecycleStatus;
  virusScanStatus: FileVirusScanStatus;
  rejectReason: string | null;
  uploadedBy: string;
  uploadedAt: string;
  originalNameSanitized: string;
};

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "fichier";
}

const testFileRows = new Map<string, FileObjectRecord>();

export function resetUploadTestStore(): void {
  testFileRows.clear();
}

function isInMemoryUploadStore(): boolean {
  return process.env.NODE_ENV === "test";
}

async function withFileDb<T>(tenantId: string, fn: (db: TenantDb) => Promise<T>): Promise<T> {
  if (isInMemoryUploadStore()) {
    return fn(null as unknown as TenantDb);
  }
  return withTenantDb(tenantId, fn);
}

function mapRow(row: typeof fileObjects.$inferSelect): FileObjectRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    checksumSha256: row.checksumSha256,
    status: row.lifecycleStatus as FileLifecycleStatus,
    virusScanStatus: row.virusScanStatus as FileVirusScanStatus,
    rejectReason: row.rejectReason,
    uploadedBy: row.uploadedBy ?? "",
    uploadedAt: row.uploadedAt.toISOString(),
    originalNameSanitized: row.originalNameSanitized,
  };
}

async function getFileRow(db: TenantDb, id: string): Promise<FileObjectRecord | null> {
  if (isInMemoryUploadStore()) {
    return testFileRows.get(id) ?? null;
  }
  const [row] = await db.select().from(fileObjects).where(eq(fileObjects.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

async function updateFileRow(
  db: TenantDb,
  id: string,
  patch: Partial<FileObjectRecord>,
): Promise<FileObjectRecord | null> {
  if (isInMemoryUploadStore()) {
    const cur = testFileRows.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    testFileRows.set(id, next);
    return next;
  }
  const dbPatch: Partial<typeof fileObjects.$inferInsert> = {
    lifecycleStatus: patch.status,
    virusScanStatus: patch.virusScanStatus,
    rejectReason: patch.rejectReason,
    mimeType: patch.mimeType,
    sizeBytes: patch.sizeBytes,
    checksumSha256: patch.checksumSha256,
  };
  const [row] = await db.update(fileObjects).set(dbPatch).where(eq(fileObjects.id, id)).returning();
  return row ? mapRow(row) : null;
}

async function insertFileRow(db: TenantDb, row: FileObjectRecord): Promise<void> {
  if (isInMemoryUploadStore()) {
    testFileRows.set(row.id, row);
    return;
  }
  await db.insert(fileObjects).values({
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    checksumSha256: row.checksumSha256,
    lifecycleStatus: row.status,
    virusScanStatus: row.virusScanStatus,
    rejectReason: row.rejectReason,
    uploadedBy: row.uploadedBy,
    originalNameSanitized: row.originalNameSanitized,
  });
}

export type UploadInitInput = {
  tenantId: string;
  patientId: string;
  encounterId?: string | null;
  userId: string;
  originalName: string;
  claimedMime: string;
  sizeBytes: number;
};

/** Étape 1 : jeton présigné upload (5 min), nom régénéré UUID. */
export async function initUpload(input: UploadInitInput) {
  if (input.sizeBytes <= 0 || input.sizeBytes > 20 * 1024 * 1024) {
    return { ok: false as const, error: "Taille invalide (max 20 Mo)" };
  }

  const storage = getObjectStorage();
  if (!(await storage.isAvailable())) {
    return {
      ok: false as const,
      error: "Stockage objet indisponible (MinIO/S3 injoignable).",
    };
  }

  const fileId = uuidv7();
  const storageKey = `tenants/${input.tenantId}/patients/${input.patientId}/${fileId}`;
  const token = createPresignedToken(env.APP_SECRET, {
    fileId,
    userId: input.userId,
    purpose: "upload",
  });

  const initial: FileObjectRecord = {
    id: fileId,
    patientId: input.patientId,
    encounterId: input.encounterId ?? null,
    storageKey,
    mimeType: input.claimedMime,
    sizeBytes: input.sizeBytes,
    checksumSha256: "",
    status: "en_analyse",
    virusScanStatus: "pending",
    rejectReason: null,
    uploadedBy: input.userId,
    uploadedAt: new Date().toISOString(),
    originalNameSanitized: sanitizeName(input.originalName),
  };
  await withFileDb(input.tenantId, async (db) => {
    await insertFileRow(db, initial);
  });

  return {
    ok: true as const,
    fileId,
    storageKey,
    uploadToken: token,
    expiresInSec: 300,
  };
}

export type CompleteUploadInput = {
  tenantId: string;
  token: string;
  userId: string;
  claimedMime: string;
  bytes: Uint8Array;
};

/**
 * Étape 2 : magic bytes + ClamAV fail-closed + statut lifecycle + S3.
 */
export async function completeUpload(
  input: CompleteUploadInput,
): Promise<
  { ok: true; file: FileObjectRecord } | { ok: false; error: string; file?: FileObjectRecord }
> {
  const verified = verifyPresignedToken(env.APP_SECRET, input.token, {
    userId: input.userId,
  });
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.reason === "expired" ? "URL présignée expirée" : "Jeton d'upload invalide",
    };
  }
  if (verified.payload.purpose !== "upload") {
    return { ok: false, error: "Jeton d'upload invalide" };
  }

  return withFileDb(input.tenantId, async (db) => {
    const row = await getFileRow(db, verified.payload.fileId);
    if (!row) return { ok: false, error: "Fichier introuvable" };

    const mimeCheck = validateUploadBuffer(input.bytes, input.claimedMime);
    if (!mimeCheck.ok) {
      const rejected = await updateFileRow(db, row.id, {
        status: "rejete",
        virusScanStatus: "error",
        rejectReason: mimeCheck.reason,
      });
      return { ok: false, error: mimeCheck.reason, file: rejected ?? undefined };
    }

    const storage = getObjectStorage();
    if (!(await storage.isAvailable())) {
      const rejected = await updateFileRow(db, row.id, {
        status: "rejete",
        virusScanStatus: "error",
        rejectReason: "Stockage objet indisponible",
      });
      return {
        ok: false,
        error: "Stockage objet indisponible (MinIO/S3 injoignable).",
        file: rejected ?? undefined,
      };
    }

    const verdict = await scanBuffer(input.bytes);
    if (verdict === "unavailable") {
      const rejected = await updateFileRow(db, row.id, {
        status: "rejete",
        virusScanStatus: "error",
        rejectReason: "Antivirus injoignable (fail closed)",
      });
      return {
        ok: false,
        error: "Antivirus injoignable — téléversement refusé",
        file: rejected ?? undefined,
      };
    }
    if (verdict === "infected" || looksLikeEicar(input.bytes)) {
      const rejected = await updateFileRow(db, row.id, {
        status: "rejete",
        virusScanStatus: "infected",
        rejectReason: "Fichier rejeté par l'antivirus",
      });
      return {
        ok: false,
        error: "Fichier rejeté par l'antivirus",
        file: rejected ?? undefined,
      };
    }

    try {
      await storage.putObject(row.storageKey, input.bytes, mimeCheck.mime);
    } catch {
      const rejected = await updateFileRow(db, row.id, {
        status: "rejete",
        virusScanStatus: "error",
        rejectReason: "Échec d'enregistrement objet",
      });
      return {
        ok: false,
        error: "Échec d'enregistrement sur le stockage objet.",
        file: rejected ?? undefined,
      };
    }

    const checksum = createHash("sha256").update(input.bytes).digest("hex");
    const updated = await updateFileRow(db, row.id, {
      mimeType: mimeCheck.mime as AllowedMime,
      sizeBytes: input.bytes.byteLength,
      checksumSha256: checksum,
      status: "disponible",
      virusScanStatus: "clean",
      rejectReason: null,
    });
    if (!updated) return { ok: false, error: "Mise à jour fichier impossible" };
    return { ok: true, file: updated };
  });
}

export async function createDownloadToken(tenantId: string, fileId: string, userId: string) {
  const available = await withFileDb(tenantId, async (db) => {
    const row = await getFileRow(db, fileId);
    return row && row.status === "disponible" ? row : null;
  });
  if (!available) {
    return { ok: false as const, error: "Fichier non disponible" };
  }
  const token = createPresignedToken(env.APP_SECRET, {
    fileId,
    userId,
    purpose: "download",
  });
  return { ok: true as const, token, expiresInSec: 300 };
}

export async function resolveDownload(
  tenantId: string,
  token: string,
  userId: string,
): Promise<{ ok: true; file: FileObjectRecord; bytes: Uint8Array } | { ok: false; error: string }> {
  const verified = verifyPresignedToken(env.APP_SECRET, token, { userId });
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.reason === "expired" ? "URL présignée expirée" : "Jeton invalide",
    };
  }
  if (verified.payload.purpose !== "download") {
    return { ok: false, error: "Jeton invalide" };
  }

  return withFileDb(tenantId, async (db) => {
    const row = await getFileRow(db, verified.payload.fileId);
    if (!row || row.status !== "disponible") {
      return { ok: false, error: "Fichier non disponible" };
    }
    const storage = getObjectStorage();
    const bytes = await storage.getObject(row.storageKey);
    if (!bytes) {
      return { ok: false, error: "Contenu objet introuvable" };
    }
    return { ok: true, file: row, bytes };
  });
}

export async function listPatientFiles(tenantId: string, patientId: string) {
  if (isInMemoryUploadStore()) {
    return [...testFileRows.values()].filter((f) => f.patientId === patientId);
  }
  return withFileDb(tenantId, async (db) => {
    const rows = await db.select().from(fileObjects).where(eq(fileObjects.patientId, patientId));
    return rows.map(mapRow);
  });
}

/** Scanner réseau par défaut (tests : setClamScanner). */
export function ensureDefaultClamScanner(): void {
  setClamScanner(createNetworkClamScanner(env.CLAMAV_HOST, env.CLAMAV_PORT));
}

if (process.env.NODE_ENV !== "test") {
  ensureDefaultClamScanner();
}
