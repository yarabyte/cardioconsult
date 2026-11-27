"use server";

import { z } from "zod";
import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { recordAuditEvent } from "@/server/services/audit";
import { writePlatformAudit } from "@/server/audit/platform-audit";
import { withTenantDb } from "@/server/db/tenant-db";
import {
  activateHospitalisationModule,
  getHospitalisationModule,
  isHospitalisationEnabled,
} from "@/server/hospitalisation/module";
import type { BedFilter } from "@/server/hospitalisation/types";
import {
  addFluidOnDb,
  addTransmissionOnDb,
  correctVitalsOnDb,
  listBedsOnDb,
  loadSurveillanceOnDb,
  recordVitalsOnDb,
} from "@/server/hospitalisation/service";

async function actorWard(permission: "patient.read" | "vitals.write") {
  const ctx = await requireContext({ permission, redirectOnFail: false });
  if (!ctx.tenant) throw new AccessDeniedError("Cabinet requis");
  return {
    userId: ctx.user.id,
    role: ctx.role,
    tenantId: ctx.tenant.id,
    name: ctx.user.name,
    db: ctx.db,
  };
}

export async function loadWardAction(raw: unknown) {
  try {
    const a = await actorWard("patient.read");
    const parsed = z.object({ filter: z.string().default("Tous") }).parse(raw ?? {});
    if (!(await isHospitalisationEnabled(a.tenantId))) {
      return {
        ok: false as const,
        error: "Module hospitalisation désactivé (offre Clinique + contrat établissement)",
        disabled: true as const,
      };
    }
    const beds = a.db
      ? await listBedsOnDb(a.db, parsed.filter as BedFilter)
      : await withTenantDb(a.tenantId, (db) => listBedsOnDb(db, parsed.filter as BedFilter));
    const hospitalisationModule = await getHospitalisationModule(a.tenantId);
    return { ok: true as const, beds, module: hospitalisationModule };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function activateHospitalisationAction(raw: unknown) {
  try {
    const parsed = z
      .object({
        tenantId: z.string(),
        establishmentContractSigned: z.literal(true),
      })
      .parse(raw);

    const ctx = await requireContext({
      permission: "console.manage",
      redirectOnFail: false,
    });
    if (ctx.role !== "SUPERADMIN") throw new AccessDeniedError();
    const r = await activateHospitalisationModule(parsed.tenantId, {
      actorId: ctx.user.id,
      actorRole: "SUPERADMIN",
      establishmentContractSigned: true,
      plan: "clinique",
    });
    if (!r.ok) return r;
    await writePlatformAudit({
      actorId: ctx.user.id,
      action: "hospitalisation.module_activated",
      entityType: "tenant",
      entityId: parsed.tenantId,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Activation impossible",
    };
  }
}

export async function recordVitalsAction(raw: unknown) {
  try {
    const a = await actorWard("vitals.write");
    const parsed = z
      .object({
        patientId: z.string(),
        stayId: z.string().nullable().optional(),
        tasMmHg: z.number().nullable(),
        tadMmHg: z.number().nullable(),
        fcBpm: z.number().nullable(),
        spo2Pct: z.number().nullable(),
        temperatureC: z.number().nullable(),
        frPerMin: z.number().nullable(),
        weightKg: z.number().nullable(),
        eva: z.number().nullable(),
      })
      .parse(raw);

    const row = a.db
      ? await recordVitalsOnDb(a.db, parsed.patientId, {
          patientId: parsed.patientId,
          stayId: parsed.stayId ?? null,
          recordedAt: new Date().toISOString(),
          authorLabel: a.name,
          authorId: a.userId,
          tasMmHg: parsed.tasMmHg,
          tadMmHg: parsed.tadMmHg,
          fcBpm: parsed.fcBpm,
          spo2Pct: parsed.spo2Pct,
          temperatureC: parsed.temperatureC,
          frPerMin: parsed.frPerMin,
          weightKg: parsed.weightKg,
          eva: parsed.eva,
        })
      : await withTenantDb(a.tenantId, (db) =>
          recordVitalsOnDb(db, parsed.patientId, {
            patientId: parsed.patientId,
            stayId: parsed.stayId ?? null,
            recordedAt: new Date().toISOString(),
            authorLabel: a.name,
            authorId: a.userId,
            tasMmHg: parsed.tasMmHg,
            tadMmHg: parsed.tadMmHg,
            fcBpm: parsed.fcBpm,
            spo2Pct: parsed.spo2Pct,
            temperatureC: parsed.temperatureC,
            frPerMin: parsed.frPerMin,
            weightKg: parsed.weightKg,
            eva: parsed.eva,
          }),
        );

    await recordAuditEvent(a.tenantId, {
      action: "vitals.record",
      entityType: "vitals",
      entityId: row.id,
      actorId: a.userId,
      actorRole: a.role,
    });

    return { ok: true as const, vitals: row };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}

export async function correctVitalsAction(raw: unknown) {
  try {
    const a = await actorWard("vitals.write");
    const parsed = z
      .object({
        patientId: z.string(),
        previousId: z.string(),
        reason: z.string().min(3).max(500),
        tasMmHg: z.number().nullable(),
        tadMmHg: z.number().nullable(),
        fcBpm: z.number().nullable(),
        spo2Pct: z.number().nullable(),
        temperatureC: z.number().nullable(),
        frPerMin: z.number().nullable(),
        weightKg: z.number().nullable(),
        eva: z.number().nullable(),
      })
      .parse(raw);

    const run = (db: NonNullable<typeof a.db>) =>
      correctVitalsOnDb(
        db,
        parsed.patientId,
        parsed.previousId,
        parsed.reason,
        {
          patientId: parsed.patientId,
          stayId: null,
          recordedAt: new Date().toISOString(),
          authorLabel: a.name,
          authorId: a.userId,
          tasMmHg: parsed.tasMmHg,
          tadMmHg: parsed.tadMmHg,
          fcBpm: parsed.fcBpm,
          spo2Pct: parsed.spo2Pct,
          temperatureC: parsed.temperatureC,
          frPerMin: parsed.frPerMin,
          weightKg: parsed.weightKg,
          eva: parsed.eva,
        },
        a.name,
      );

    const r = a.db ? await run(a.db) : await withTenantDb(a.tenantId, run);
    if (!r.ok) return r;

    await recordAuditEvent(a.tenantId, {
      action: "vitals.correct",
      entityType: "vitals",
      entityId: r.next.id,
      actorId: a.userId,
      actorRole: a.role,
    });
    return r;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Correction impossible",
    };
  }
}

export async function loadSurveillanceAction(patientId: string) {
  try {
    const a = await actorWard("vitals.write");
    const payload = a.db
      ? await loadSurveillanceOnDb(a.db, patientId)
      : await withTenantDb(a.tenantId, (db) => loadSurveillanceOnDb(db, patientId));
    return {
      ok: true as const,
      active: payload.active,
      all: payload.all,
      fluids: payload.fluids,
      transmissions: payload.transmissions,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Chargement impossible",
    };
  }
}

export async function addFluidAction(raw: unknown) {
  try {
    const a = await actorWard("vitals.write");
    const parsed = z
      .object({
        patientId: z.string(),
        intakeMl: z.number().nonnegative(),
        outputMl: z.number().nonnegative(),
        diuresisMl: z.number().nonnegative().nullable(),
      })
      .parse(raw);
    const row = a.db
      ? await addFluidOnDb(a.db, {
          patientId: parsed.patientId,
          recordedAt: new Date().toISOString(),
          intakeMl: parsed.intakeMl,
          outputMl: parsed.outputMl,
          diuresisMl: parsed.diuresisMl,
          authorLabel: a.name,
        })
      : await withTenantDb(a.tenantId, (db) =>
          addFluidOnDb(db, {
            patientId: parsed.patientId,
            recordedAt: new Date().toISOString(),
            intakeMl: parsed.intakeMl,
            outputMl: parsed.outputMl,
            diuresisMl: parsed.diuresisMl,
            authorLabel: a.name,
          }),
        );
    return { ok: true as const, entry: row };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}

export async function addTransmissionAction(raw: unknown) {
  try {
    const a = await actorWard("vitals.write");
    const parsed = z
      .object({
        patientId: z.string(),
        stayId: z.string().nullable().optional(),
        body: z.string().min(1).max(2000),
        target: z.string().min(1).max(200),
      })
      .parse(raw);
    const row = a.db
      ? await addTransmissionOnDb(a.db, {
          patientId: parsed.patientId,
          stayId: parsed.stayId ?? null,
          recordedAt: new Date().toISOString(),
          authorLabel: a.name,
          body: parsed.body,
          target: parsed.target,
        })
      : await withTenantDb(a.tenantId, (db) =>
          addTransmissionOnDb(db, {
            patientId: parsed.patientId,
            stayId: parsed.stayId ?? null,
            recordedAt: new Date().toISOString(),
            authorLabel: a.name,
            body: parsed.body,
            target: parsed.target,
          }),
        );
    return { ok: true as const, entry: row };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof AccessDeniedError ? err.message : "Enregistrement impossible",
    };
  }
}
