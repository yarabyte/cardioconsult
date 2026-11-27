"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { confirmStepUpWithPassword } from "@/server/auth/step-up";
import { recordAuditEvent } from "@/server/services/audit";
import {
  applyTemplate,
  duplicatePrescription,
  getPrescription,
  saveLines,
  validatePrescription,
} from "@/server/services/prescriptions/lifecycle";
import { renderPrescriptionPdf } from "@/server/services/prescriptions/pdf";
import { getDrugDatabase } from "@/server/drugs/provider";
import type { PrescriptionLine } from "@/types/domain";
import type { RxTemplateId } from "@/lib/prescriptions/templates";

async function actorRx(permission: "prescription.write" | "prescription.validate") {
  const ctx = await requireContext({
    permission,
    redirectOnFail: false,
  });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
    stepUpValid: ctx.stepUpValid,
    name: ctx.user.name,
  };
}

const lineSchema = z.object({
  id: z.string(),
  drug: z.string(),
  dci: z.string().nullable().optional(),
  dosage: z.string().nullable().optional(),
  form: z.string().nullable().optional(),
  posology: z.string(),
  route: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  duration: z.string().optional(),
  quantity: z.string().nullable().optional(),
  renewals: z.number().int().nullable().optional(),
  remarks: z.string().nullable().optional(),
  ald: z.boolean().optional(),
});

export async function loadPrescriptionAction(id: string) {
  try {
    const a = await actorRx("prescription.write");
    const rx = await getPrescription(a.tenantId, id);
    if (!rx) return { ok: false as const, error: "Ordonnance introuvable" };
    return { ok: true as const, rx };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function savePrescriptionAction(raw: unknown) {
  try {
    const a = await actorRx("prescription.write");
    const parsed = z
      .object({
        prescriptionId: z.string(),
        lines: z.array(lineSchema),
        aldLayout: z.boolean(),
      })
      .parse(raw);
    const r = await saveLines(
      a.tenantId,
      parsed.prescriptionId,
      parsed.lines as PrescriptionLine[],
      parsed.aldLayout,
      a.userId,
    );
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "prescription.edit",
      entityType: "prescription",
      entityId: parsed.prescriptionId,
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

export async function applyRxTemplateAction(raw: unknown) {
  try {
    const a = await actorRx("prescription.write");
    const parsed = z
      .object({
        prescriptionId: z.string(),
        templateId: z.string(),
      })
      .parse(raw);
    const r = await applyTemplate(
      a.tenantId,
      parsed.prescriptionId,
      parsed.templateId as RxTemplateId,
      a.userId,
    );
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "prescription.template_applied",
      entityType: "prescription",
      entityId: parsed.prescriptionId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Modèle impossible",
    };
  }
}

export async function searchDciAction(query: string) {
  try {
    await actorRx("prescription.write");
    const db = getDrugDatabase();
    const results = await db.searchDci(query);
    return { ok: true as const, results };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Recherche impossible",
    };
  }
}

export async function checkInteractionsAction(dcis: string[]) {
  try {
    await actorRx("prescription.write");
    const db = getDrugDatabase();
    const result = await db.checkInteractions(dcis);
    return { ok: true as const, result };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Vérification impossible",
    };
  }
}

/**
 * Validation avec step-up : mot de passe du compte courant requis
 * si aucune ré-auth récente (< 5 min).
 */
export async function validatePrescriptionAction(raw: unknown) {
  try {
    const parsed = z
      .object({
        prescriptionId: z.string(),
        password: z.string().min(1).max(200),
      })
      .parse(raw);

    const a = await actorRx("prescription.validate");
    if (!a.stepUpValid) {
      await confirmStepUpWithPassword(parsed.password);
    }

    const r = await validatePrescription(a.tenantId, parsed.prescriptionId, a.userId, {
      stepUpValid: true,
    });
    await recordAuditEvent(a.tenantId, {
      action: "prescription.validate",
      entityType: "prescription",
      entityId: parsed.prescriptionId,
      actorId: a.userId,
      actorRole: a.role,
      outcome: r.ok ? "success" : "failure",
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Validation impossible",
    };
  }
}

export async function duplicatePrescriptionAction(prescriptionId: string) {
  try {
    const a = await actorRx("prescription.write");
    const r = await duplicatePrescription(a.tenantId, prescriptionId, a.userId);
    if (!r.ok) return r;
    await recordAuditEvent(a.tenantId, {
      action: "prescription.duplicate",
      entityType: "prescription",
      entityId: r.rx.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Duplication impossible",
    };
  }
}

export async function exportPrescriptionPdfAction(raw: unknown) {
  try {
    const a = await actorRx("prescription.write");
    const parsed = z
      .object({
        prescriptionId: z.string(),
        patientLabel: z.string(),
        birthDate: z.string(),
      })
      .parse(raw);
    const rx = await getPrescription(a.tenantId, parsed.prescriptionId);
    if (!rx) return { ok: false as const, error: "Ordonnance introuvable" };
    const pdf = await renderPrescriptionPdf({
      rx,
      patientLabel: parsed.patientLabel,
      birthDate: parsed.birthDate,
      prescriberName: a.name,
      rpps: "[RPPS déclaratif — non vérifié]",
      cabinetName: "Cabinet de cardiologie Martin",
    });
    if (!pdf.ok) return { ok: false as const, error: pdf.error };
    await recordAuditEvent(a.tenantId, {
      action: "prescription.pdf_export",
      entityType: "prescription",
      entityId: rx.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return {
      ok: true as const,
      base64: Buffer.from(pdf.bytes).toString("base64"),
      contentType: "application/pdf" as const,
      mode: pdf.mode,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Export impossible",
    };
  }
}
