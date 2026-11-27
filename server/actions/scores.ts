"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import { getEncounterById } from "@/server/consultation/service";
import { saveClinicalScore } from "@/server/services/clinical/scores";
import type { ScoreResult } from "@/types/domain";

const scoreResultSchema = z.object({
  status: z.enum(["non_applicable", "incomplet", "calcule", "saisi_externe", "incoherent"]),
  value: z.union([z.number(), z.string(), z.null()]),
  range: z.object({ min: z.number(), max: z.number() }).optional(),
  rationale: z.array(z.string()).max(40),
  missingInputs: z.array(z.string()).max(40),
  warnings: z.array(z.string()).max(20).optional(),
  source: z.object({ id: z.string().min(1).max(64), version: z.string().min(1).max(32) }),
});

const saveSchema = z.object({
  encounterId: z.string().min(1).max(64),
  kind: z.string().min(1).max(64),
  inputs: z.record(z.string(), z.unknown()),
  result: scoreResultSchema,
});

/** Enregistre / met à jour un score pour la consultation (autosave). */
export async function saveEncounterScoreAction(raw: unknown) {
  try {
    const ctx = await requireContext({ permission: "score.write", redirectOnFail: false });
    if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
    const parsed = saveSchema.parse(raw);
    const encounter = await getEncounterById(ctx.tenant.id, parsed.encounterId);
    if (!encounter) return { ok: false as const, error: "Consultation introuvable" };

    const saved = await saveClinicalScore(ctx.tenant.id, {
      patientId: encounter.patientId,
      encounterId: encounter.id,
      kind: parsed.kind,
      datedAt: new Date(encounter.datedAt),
      inputs: parsed.inputs,
      result: parsed.result as ScoreResult,
      ruleId: parsed.result.source.id,
      ruleVersion: parsed.result.source.version,
      actorId: ctx.user.id,
    });

    await recordAuditEvent(ctx.tenant.id, {
      action: "score.save",
      entityType: "clinical_score",
      entityId: saved.id,
      actorId: ctx.user.id,
      actorRole: ctx.role,
    });

    return { ok: true as const, score: saved };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}
