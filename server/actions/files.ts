"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import {
  completeUpload,
  createDownloadToken,
  initUpload,
  listPatientFiles,
} from "@/server/services/files/upload";

async function actorFile() {
  const ctx = await requireContext({ permission: "document.write", redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
  };
}

export async function initFileUploadAction(raw: unknown) {
  try {
    const a = await actorFile();
    const parsed = z
      .object({
        patientId: z.string().min(1),
        encounterId: z.string().nullable().optional(),
        originalName: z.string().min(1).max(200),
        claimedMime: z.string().min(1).max(100),
        sizeBytes: z
          .number()
          .int()
          .positive()
          .max(20 * 1024 * 1024),
      })
      .parse(raw);
    const r = await initUpload({
      tenantId: a.tenantId,
      patientId: parsed.patientId,
      encounterId: parsed.encounterId,
      userId: a.userId,
      originalName: parsed.originalName,
      claimedMime: parsed.claimedMime,
      sizeBytes: parsed.sizeBytes,
    });
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "file.upload_init",
      entityType: "file_object",
      entityId: r.fileId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Initialisation impossible",
    };
  }
}

/**
 * Complète l'upload : bytes en base64 (démo) — prod = PUT direct S3 puis callback.
 */
export async function completeFileUploadAction(raw: unknown) {
  try {
    const a = await actorFile();
    const parsed = z
      .object({
        token: z.string().min(10),
        claimedMime: z.string().min(1).max(100),
        contentBase64: z.string().min(1).max(28_000_000),
      })
      .parse(raw);
    const bytes = Uint8Array.from(Buffer.from(parsed.contentBase64, "base64"));
    const r = await completeUpload({
      tenantId: a.tenantId,
      token: parsed.token,
      userId: a.userId,
      claimedMime: parsed.claimedMime,
      bytes,
    });
    if (r.ok) {
      await recordAuditEvent(a.tenantId, {
        action: "file.upload_complete",
        entityType: "file_object",
        entityId: r.file.id,
        actorId: a.userId,
        actorRole: a.role,
      });
    } else if (r.file) {
      await recordAuditEvent(a.tenantId, {
        action: "file.upload_rejected",
        entityType: "file_object",
        entityId: r.file.id,
        actorId: a.userId,
        actorRole: a.role,
        outcome: "failure",
      });
    }
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Téléversement impossible",
    };
  }
}

export async function listPatientFilesAction(patientId: string) {
  try {
    const a = await actorFile();
    const files = await listPatientFiles(a.tenantId, patientId);
    return { ok: true as const, files };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Liste impossible",
    };
  }
}

export async function getFileDownloadTokenAction(fileId: string) {
  try {
    const a = await actorFile();
    const r = await createDownloadToken(a.tenantId, fileId, a.userId);
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "file.download_token",
      entityType: "file_object",
      entityId: fileId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Téléchargement impossible",
    };
  }
}
