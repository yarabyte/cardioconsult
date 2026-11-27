"use server";

import { z } from "zod";
import { can } from "@/lib/rbac";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import { completenessFromDraft, ordonnanceStateFromRx } from "@/lib/consultation/completeness";
import { ECHO_TEMPLATES } from "@/lib/consultation/templates";
import type { EncounterDraftData } from "@/lib/consultation/draft-types";
import { validateEcg } from "@/lib/exams/ecg";
import {
  closeEncounter,
  createEncounter,
  ensureEncounterDraft,
  getEncounterById,
  getLatestOpenEncounterForPatient,
  saveEncounterDraft,
  setEncounterRubric,
} from "@/server/consultation/service";
import { decideStartOrResume } from "@/lib/consultation/resume";
import { findPrescriptionForEncounter } from "@/server/services/prescriptions/lifecycle";
import { listClinicalScoresForEncounter } from "@/server/services/clinical/scores";

async function actorWrite() {
  const ctx = await requireContext({ permission: "encounter.write", redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
  };
}

async function actorRead() {
  const ctx = await requireContext({ permission: "encounter.write", redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return { tenantId: ctx.tenant.id };
}

export async function startConsultationAction(patientId: string, opts?: { forceNew?: boolean }) {
  try {
    const a = await actorWrite();
    if (a.role !== "MEDECIN") {
      throw new AccessDeniedError("Réservé au médecin");
    }
    const id = z.string().min(1).parse(patientId);
    const open = await getLatestOpenEncounterForPatient(a.tenantId, id);
    const decision = decideStartOrResume({
      open: open ? { id: open.id, rubric: open.rubric } : null,
      forceNew: opts?.forceNew,
    });
    if (decision.mode === "resume") {
      return {
        ok: true as const,
        encounterId: decision.encounterId,
        href: decision.href,
        resumed: true as const,
      };
    }
    const r = await createEncounter(a.tenantId, id, a.userId);
    if (!r.ok) {
      return { ok: false as const, error: "Patient introuvable ou archivé" };
    }
    await recordAuditEvent(a.tenantId, {
      action: "encounter.create",
      entityType: "encounter",
      entityId: r.encounterId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return {
      ok: true as const,
      encounterId: r.encounterId,
      href: `/consultations/${r.encounterId}/identite`,
      resumed: false as const,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Création impossible",
    };
  }
}

export async function setEncounterRubricAction(encounterId: string, rubric: string) {
  try {
    const a = await actorWrite();
    const id = z.string().min(1).parse(encounterId);
    const slug = z.string().min(1).max(64).parse(rubric);
    const enc = await getEncounterById(a.tenantId, id);
    if (!enc) return { ok: false as const, error: "Consultation introuvable" };
    await setEncounterRubric(a.tenantId, id, slug, a.userId);
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}

export async function loadEncounterDraftAction(encounterId: string) {
  try {
    const a = await actorRead();
    const enc = await getEncounterById(a.tenantId, encounterId);
    if (!enc) return { ok: false as const, error: "Consultation introuvable" };
    const draft = await ensureEncounterDraft(a.tenantId, encounterId);
    if (!draft) return { ok: false as const, error: "Consultation introuvable" };
    const [rx, scores] = await Promise.all([
      findPrescriptionForEncounter(a.tenantId, encounterId),
      listClinicalScoresForEncounter(a.tenantId, encounterId),
    ]);
    const completeness = completenessFromDraft(draft, enc.rubric ?? "motif", {
      hasOrdonnanceContent: ordonnanceStateFromRx(rx) === "fait",
      hasScores: scores.length > 0,
    });
    return { ok: true as const, draft, completeness };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function saveEncounterDraftAction(raw: unknown) {
  try {
    const a = await actorWrite();
    if (a.role === "INFIRMIERE" && !can({ role: a.role }, "encounter.write")) {
      const parsed = z
        .object({
          encounterId: z.string(),
          version: z.number().int(),
          clinicalExam: z
            .object({
              tas: z.number().nullable().optional(),
              tad: z.number().nullable().optional(),
              fc: z.number().nullable().optional(),
              spo2: z.number().nullable().optional(),
              weightKg: z.number().nullable().optional(),
              heightM: z.number().nullable().optional(),
            })
            .optional(),
        })
        .parse(raw);
      const r = await saveEncounterDraft(
        a.tenantId,
        parsed.encounterId,
        parsed.version,
        { clinicalExam: parsed.clinicalExam as EncounterDraftData["clinicalExam"] },
        a.userId,
      );
      if (!r.ok) {
        if (r.code === "conflict") {
          return { ok: false as const, code: "conflict" as const, draft: r.draft };
        }
        if (r.code === "closed") {
          return {
            ok: false as const,
            code: "closed" as const,
            error: "Consultation clôturée — modification impossible",
          };
        }
        return { ok: false as const, error: "Enregistrement impossible" };
      }
      return { ok: true as const, draft: r.draft };
    }

    if (a.role !== "MEDECIN" && a.role !== "INFIRMIERE") throw new AccessDeniedError();

    const parsed = z
      .object({
        encounterId: z.string(),
        version: z.number().int(),
        patch: z.record(z.string(), z.unknown()),
      })
      .parse(raw);

    if (a.role === "INFIRMIERE") {
      const ce = (parsed.patch.clinicalExam ?? {}) as Record<string, unknown>;
      const r = await saveEncounterDraft(
        a.tenantId,
        parsed.encounterId,
        parsed.version,
        {
          clinicalExam: {
            tas: (ce.tas as number | null) ?? null,
            tad: (ce.tad as number | null) ?? null,
            fc: (ce.fc as number | null) ?? null,
            spo2: (ce.spo2 as number | null) ?? null,
            weightKg: (ce.weightKg as number | null) ?? null,
            heightM: (ce.heightM as number | null) ?? null,
            nyha: null,
            signs: null,
            auscultation: null,
            vitalsAuthor: a.userId,
            vitalsAt: new Date().toISOString(),
          },
        },
        a.userId,
      );
      if (!r.ok && r.code === "conflict") {
        return { ok: false as const, code: "conflict" as const, draft: r.draft };
      }
      if (!r.ok && r.code === "closed") {
        return {
          ok: false as const,
          code: "closed" as const,
          error: "Consultation clôturée — modification impossible",
        };
      }
      if (!r.ok) return { ok: false as const, error: "Échec" };
      return { ok: true as const, draft: r.draft };
    }

    if (parsed.patch.ecg) {
      const ecgCheck = validateEcg(parsed.patch.ecg);
      if (!ecgCheck.success) {
        return {
          ok: false as const,
          error: "QTc nécessite une méthode (Fridericia ou Bazett).",
        };
      }
    }

    const r = await saveEncounterDraft(
      a.tenantId,
      parsed.encounterId,
      parsed.version,
      parsed.patch as Partial<EncounterDraftData>,
      a.userId,
    );
    if (!r.ok && r.code === "conflict") {
      return { ok: false as const, code: "conflict" as const, draft: r.draft };
    }
    if (!r.ok && r.code === "closed") {
      return {
        ok: false as const,
        code: "closed" as const,
        error: "Consultation clôturée — modification impossible",
      };
    }
    if (!r.ok) return { ok: false as const, error: "Échec enregistrement" };
    return { ok: true as const, draft: r.draft };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}

export async function applyEchoTemplateAction(raw: unknown) {
  try {
    const a = await actorWrite();
    if (a.role !== "MEDECIN") throw new AccessDeniedError("Réservé au médecin");
    const parsed = z
      .object({
        encounterId: z.string(),
        version: z.number().int(),
        templateId: z.string(),
        confirmed: z.literal(true),
      })
      .parse(raw);
    const tpl = ECHO_TEMPLATES[parsed.templateId];
    if (!tpl) return { ok: false as const, error: "Modèle inconnu" };
    const r = await saveEncounterDraft(
      a.tenantId,
      parsed.encounterId,
      parsed.version,
      { echo: tpl.data, templateApplied: parsed.templateId },
      a.userId,
    );
    if (!r.ok && r.code === "conflict") {
      return { ok: false as const, code: "conflict" as const, draft: r.draft };
    }
    if (!r.ok && r.code === "closed") {
      return {
        ok: false as const,
        code: "closed" as const,
        error: "Consultation clôturée — modification impossible",
      };
    }
    if (!r.ok) return { ok: false as const, error: "Échec" };
    await recordAuditEvent(a.tenantId, {
      action: "encounter.template_applied",
      entityType: "encounter",
      entityId: parsed.encounterId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, draft: r.draft };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Application impossible",
    };
  }
}

export async function closeEncounterAction(raw: unknown) {
  try {
    const a = await actorWrite();
    if (a.role !== "MEDECIN") throw new AccessDeniedError("Clôture réservée au médecin");
    const parsed = z.object({ encounterId: z.string(), version: z.number().int() }).parse(raw);
    const r = await closeEncounter(a.tenantId, parsed.encounterId, parsed.version, a.userId);
    if (!r.ok && r.code === "conflict") {
      return { ok: false as const, code: "conflict" as const, draft: r.draft };
    }
    if (!r.ok) return { ok: false as const, error: "Clôture impossible" };
    await recordAuditEvent(a.tenantId, {
      action: "encounter.close",
      entityType: "encounter",
      entityId: parsed.encounterId,
      actorId: a.userId,
      actorRole: a.role,
    });
    return { ok: true as const, draft: r.draft };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Clôture impossible",
    };
  }
}
