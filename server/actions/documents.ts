"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import {
  amendDocument,
  getDocument,
  listDocumentsToValidate,
  regenerateDocument,
  setTemplate,
  signDocument,
  updateEditedContent,
  validateDocument,
} from "@/server/services/documents/lifecycle";
import { renderPdf } from "@/server/services/documents/pdf";
import type {
  TipDoc,
  SourceSnapshot,
  CrTemplateId,
  DocumentSectionId,
} from "@/lib/documents/tiptap-types";
import type { CabinetHeaderConfig } from "@/lib/documents/tiptap-types";

async function actorDoc(permission: "document.write" | "document.validate" | "document.sign") {
  const ctx = await requireContext({
    permission,
    redirectOnFail: false,
    stepUp: permission === "document.sign",
  });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
    user: null,
  };
}

export async function loadDocumentAction(documentId: string) {
  try {
    const a = await actorDoc("document.write");
    const doc = await getDocument(a.tenantId, documentId);
    if (!doc) return { ok: false as const, error: "Document introuvable" };
    return { ok: true as const, doc };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function listDocsToValidateAction() {
  try {
    const a = await actorDoc("document.write");
    return { ok: true as const, docs: await listDocumentsToValidate(a.tenantId) };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Liste impossible",
    };
  }
}

export async function saveDocumentEditAction(raw: unknown) {
  try {
    const a = await actorDoc("document.write");
    const parsed = z
      .object({
        documentId: z.string(),
        edited: z.object({ type: z.literal("doc"), content: z.array(z.unknown()) }),
      })
      .parse(raw);
    const r = await updateEditedContent(
      a.tenantId,
      parsed.documentId,
      parsed.edited as TipDoc,
      a.userId,
    );
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "document.edit",
      entityType: "document",
      entityId: parsed.documentId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}

export async function regenerateDocumentAction(raw: unknown) {
  try {
    const a = await actorDoc("document.write");
    const parsed = z
      .object({
        documentId: z.string(),
        snapshot: z.unknown(),
        sections: z.array(z.string()),
      })
      .parse(raw);
    const r = await regenerateDocument(
      a.tenantId,
      parsed.documentId,
      parsed.snapshot as SourceSnapshot,
      parsed.sections as DocumentSectionId[],
      a.userId,
    );
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "document.regenerate",
      entityType: "document",
      entityId: parsed.documentId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return {
      ok: true as const,
      doc: r.doc,
      previousEdit: r.previousEdit,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Régénération impossible",
    };
  }
}

export async function validateDocumentAction(raw: unknown) {
  try {
    const a = await actorDoc("document.validate");
    const parsed = z.object({ documentId: z.string() }).parse(raw);
    const r = await validateDocument(a.tenantId, parsed.documentId, a.userId);
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "document.validate",
      entityType: "document",
      entityId: parsed.documentId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Validation impossible",
    };
  }
}

export async function signDocumentAction(raw: unknown) {
  try {
    const a = await actorDoc("document.sign");
    const parsed = z.object({ documentId: z.string() }).parse(raw);
    const r = await signDocument(a.tenantId, parsed.documentId, a.userId);
    await recordAuditEvent(a.tenantId, {
      action: "document.sign_attempt",
      entityType: "document",
      entityId: parsed.documentId,
      actorId: a.userId,
      actorRole: a.role,
      outcome: r.ok ? "success" : "failure",
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Signature impossible",
    };
  }
}

export async function amendDocumentAction(raw: unknown) {
  try {
    const a = await actorDoc("document.write");
    const parsed = z
      .object({ documentId: z.string(), reason: z.string().min(3).max(500) })
      .parse(raw);
    const r = await amendDocument(a.tenantId, parsed.documentId, parsed.reason, a.userId);
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "document.amend",
      entityType: "document",
      entityId: parsed.documentId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Amendement impossible",
    };
  }
}

export async function setDocumentTemplateAction(raw: unknown) {
  try {
    const a = await actorDoc("document.write");
    const parsed = z
      .object({
        documentId: z.string(),
        templateId: z.string(),
        sections: z.array(z.string()),
      })
      .parse(raw);
    return setTemplate(
      a.tenantId,
      parsed.documentId,
      parsed.templateId as CrTemplateId,
      parsed.sections as DocumentSectionId[],
    );
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Modèle impossible",
    };
  }
}

export async function exportDocumentPdfAction(raw: unknown) {
  try {
    const a = await actorDoc("document.write");
    const parsed = z.object({ documentId: z.string() }).parse(raw);
    const doc = await getDocument(a.tenantId, parsed.documentId);
    if (!doc) return { ok: false as const, error: "Document introuvable" };

    const header: CabinetHeaderConfig = {
      displayName: "Dr Claire Martin",
      specialty: "Cardiologie",
      cabinetName: "Cabinet de cardiologie Martin",
      addressLine: "12 rue [ADRESSE], 75000 Paris",
      showDegrees: true,
      degrees: ["DIU d'échocardiographie", "DU HTA"],
      showRppsPlaceholder: true,
    };

    const pdf = await renderPdf({
      documentId: doc.id,
      version: doc.version,
      status: doc.status,
      patientLabel: doc.sourceSnapshot?.patientLabel ?? "Patient fictif",
      dossierNumber: doc.sourceSnapshot?.dossierNumber ?? doc.patientId,
      actDate: doc.sourceSnapshot?.actDate ?? "2026-11-23",
      header,
      content: doc.edited,
    });

    await recordAuditEvent(a.tenantId, {
      action: "document.pdf_export",
      entityType: "document",
      entityId: doc.id,
      actorId: a.userId,
      actorRole: a.role,
      outcome: pdf.ok ? "success" : "failure",
    });

    if (!pdf.ok) return pdf;
    return {
      ok: true as const,
      base64: Buffer.from(pdf.bytes).toString("base64"),
      contentType: pdf.contentType,
      mode: pdf.mode,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Export PDF impossible",
    };
  }
}

export async function auditDocumentPrintAction(documentId: string) {
  try {
    const a = await actorDoc("document.write");
    await recordAuditEvent(a.tenantId, {
      action: "document.print",
      entityType: "document",
      entityId: documentId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Audit impossible",
    };
  }
}
