"use server";

import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { writePlatformAudit } from "@/server/audit/platform-audit";

export type GateResult = { ok: true } | { ok: false; error: { code: string; message: string } };

/**
 * Actions de contrôle d'accès (P05 tests) — pas de mutation clinique réelle.
 * Une infirmière qui appelle ces actions doit être refusée avec audit.
 */
export async function attemptDocumentSign(documentId: string): Promise<GateResult> {
  try {
    await requireContext({ permission: "document.sign", redirectOnFail: false });
    await writePlatformAudit({
      action: "document.sign",
      entityType: "document",
      entityId: documentId,
      outcome: "success",
      meta: { gate: true },
    });
    return { ok: true };
  } catch (err) {
    const code = err instanceof AccessDeniedError ? "access_denied" : "server";
    await writePlatformAudit({
      action: "document.sign",
      entityType: "document",
      entityId: documentId,
      outcome: "access_denied",
      meta: { gate: true },
    });
    return {
      ok: false,
      error: {
        code,
        message: err instanceof AccessDeniedError ? err.message : "Erreur",
      },
    };
  }
}

export async function attemptPrescriptionValidate(prescriptionId: string): Promise<GateResult> {
  try {
    await requireContext({ permission: "prescription.validate", redirectOnFail: false });
    await writePlatformAudit({
      action: "prescription.validate",
      entityType: "prescription",
      entityId: prescriptionId,
      outcome: "success",
      meta: { gate: true },
    });
    return { ok: true };
  } catch (err) {
    await writePlatformAudit({
      action: "prescription.validate",
      entityType: "prescription",
      entityId: prescriptionId,
      outcome: "access_denied",
      meta: { gate: true },
    });
    return {
      ok: false,
      error: {
        code: err instanceof AccessDeniedError ? "access_denied" : "server",
        message: err instanceof AccessDeniedError ? err.message : "Erreur",
      },
    };
  }
}
