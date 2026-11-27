import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import {
  featureFlags,
  nursingNotes,
  patientIdentityEnc,
  patients,
  settings,
  stays,
  vitals,
} from "@/db/tenant/schema";
import { DEFAULT_WARD_TEMPLATE } from "./hospitalisation-ward-template";
import {
  evaluateVitalsAlerts,
  DEFAULT_VITALS_THRESHOLDS,
} from "@/lib/hospitalisation/vitals-alerts";
import type { Bed } from "@/types/domain";
import type { TenantDb } from "@/server/db/tenant-db";
import {
  HOSPITALISATION_FLAG_KEY,
  HOSPITALISATION_MODULE_SETTING,
  HOSPITALISATION_WARD_SETTING,
} from "@/server/hospitalisation/types";

const STAY_ARNAUD = "stay-arnaud";
const STAY_LEFEVRE = "stay-lefevre";
const PATIENT_ARNAUD = "patient-hosp-arnaud";

function wardTemplate(): Bed[] {
  return structuredClone(DEFAULT_WARD_TEMPLATE).map((b) => {
    const patientId = b.id === "b01" ? PATIENT_ARNAUD : b.patientId;
    const base: Bed = {
      ...b,
      patientId,
      stayId: null,
      referringPhysicianLabel: b.tag === "Libre" ? null : "Dr Claire Martin",
      staffNote:
        b.tag === "Alerte"
          ? "Point de staff 08:30 — discussion imagerie aorte."
          : b.tag === "Libre"
            ? null
            : "Surveillance standard.",
      pendingExams:
        b.tag === "Alerte"
          ? ["TDM aorte", "ECG de contrôle"]
          : b.tag === "Examen"
            ? ["ETT", "Biologie"]
            : [],
      lastTransmission:
        b.tag === "Alerte"
          ? "TAS 188 mmHg signalée à 07:40 — médecin prévenu."
          : b.tag === "Examen"
            ? "Patient informé du créneau ETT."
            : null,
      lastTransmissionAt:
        b.tag === "Alerte"
          ? "2026-11-23T07:40:00+01:00"
          : b.tag === "Examen"
            ? "2026-11-23T08:10:00+01:00"
            : null,
    };
    if (b.id === "b02") {
      return { ...base, stayId: STAY_LEFEVRE, tag: "Alerte" };
    }
    if (b.id === "b01") {
      return { ...base, stayId: STAY_ARNAUD };
    }
    return base;
  });
}

/** Jeu hospitalisation synthétique pour la recette (aucune donnée réelle). */
export async function seedHospitalisationDemoOnDb(db: TenantDb): Promise<void> {
  await db
    .insert(featureFlags)
    .values({ key: HOSPITALISATION_FLAG_KEY, enabled: true, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled: true, updatedAt: new Date() },
    });

  await db
    .insert(settings)
    .values({
      key: HOSPITALISATION_MODULE_SETTING,
      value: {
        plan: "clinique",
        establishmentContractSigned: true,
        signedAt: "2026-01-15T10:00:00+01:00",
        signedBy: "seed",
      },
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: {
          plan: "clinique",
          establishmentContractSigned: true,
          signedAt: "2026-01-15T10:00:00+01:00",
          signedBy: "seed",
        },
        updatedAt: new Date(),
      },
    });

  await db
    .insert(settings)
    .values({
      key: HOSPITALISATION_WARD_SETTING,
      value: wardTemplate(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const [existingArnaud] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.id, PATIENT_ARNAUD))
    .limit(1);

  if (!existingArnaud) {
    await db.insert(patients).values({ id: PATIENT_ARNAUD, dossierNumber: "CC-HOSP-001" });
    await db.insert(patientIdentityEnc).values({
      patientId: PATIENT_ARNAUD,
      firstNameEnc: "Marc",
      lastNameEnc: "Arnaud",
      birthDateEnc: "1962-04-11",
      sex: "H",
      insStatus: "non_qualifiee",
      dossierNumber: "CC-HOSP-001",
      firstNameBlind: "Marc",
      lastNameBlind: "Arnaud",
      birthDateBlind: "1962-04-11",
    });
  }

  const [lefevre] = await db
    .select({ id: patients.id })
    .from(patientIdentityEnc)
    .innerJoin(patients, eq(patientIdentityEnc.patientId, patients.id))
    .where(eq(patientIdentityEnc.lastNameBlind, "Lefèvre"))
    .limit(1);

  const [existingStayArn] = await db
    .select({ id: stays.id })
    .from(stays)
    .where(eq(stays.id, STAY_ARNAUD))
    .limit(1);

  if (!existingStayArn) {
    await db.insert(stays).values({
      id: STAY_ARNAUD,
      patientId: PATIENT_ARNAUD,
      admittedAt: new Date("2026-11-14T09:00:00+01:00"),
      dischargedAt: null,
      bedLabel: "b01",
      motifEnc: "Décompensation IC",
      status: "en_cours",
    });
  }

  if (lefevre) {
    const [existingStayLef] = await db
      .select({ id: stays.id })
      .from(stays)
      .where(eq(stays.id, STAY_LEFEVRE))
      .limit(1);
    if (!existingStayLef) {
      await db.insert(stays).values({
        id: STAY_LEFEVRE,
        patientId: lefevre.id,
        admittedAt: new Date("2026-11-15T10:00:00+01:00"),
        dischargedAt: null,
        bedLabel: "b02",
        motifEnc: "Dilatation aortique — bilan",
        status: "en_cours",
      });
    }
  }

  const [existingV1] = await db
    .select({ id: vitals.id })
    .from(vitals)
    .where(eq(vitals.id, "v1"))
    .limit(1);
  if (!existingV1) {
    const rows = [
      {
        id: "v1",
        recordedAt: new Date("2026-11-23T08:00:00+01:00"),
        tasMmHg: 128,
        tadMmHg: 76,
        fcBpm: 82,
        spo2Pct: 97,
        temperatureC: "36.8",
        weightKg: "71.4",
      },
      {
        id: "v2",
        recordedAt: new Date("2026-11-23T04:00:00+01:00"),
        tasMmHg: 126,
        tadMmHg: 74,
        fcBpm: 78,
        spo2Pct: 96,
        temperatureC: null as string | null,
        weightKg: null as string | null,
      },
    ] as const;

    for (const row of rows) {
      await db.insert(vitals).values({
        id: row.id,
        patientId: PATIENT_ARNAUD,
        encounterId: null,
        recordedAt: row.recordedAt,
        authorId: "demo-ide",
        tasMmHg: row.tasMmHg,
        tadMmHg: row.tadMmHg,
        fcBpm: row.fcBpm,
        spo2Pct: row.spo2Pct,
        temperatureC: row.temperatureC,
        weightKg: row.weightKg,
        heightM: null,
        createdAt: row.recordedAt,
        updatedAt: row.recordedAt,
        createdBy: "demo-ide",
      });

      const alerts =
        row.id === "v1"
          ? []
          : evaluateVitalsAlerts(
              {
                tasMmHg: row.tasMmHg,
                tadMmHg: row.tadMmHg,
                fcBpm: row.fcBpm,
                spo2Pct: row.spo2Pct,
                temperatureC: row.temperatureC != null ? Number(row.temperatureC) : null,
                frPerMin: null,
                weightKg: row.weightKg != null ? Number(row.weightKg) : null,
                eva: row.id === "v2" ? null : 1,
              },
              DEFAULT_VITALS_THRESHOLDS,
            );

      await db.insert(settings).values({
        key: `vitals_meta:${row.id}`,
        value: {
          authorLabel: row.id === "v1" ? "S. Laurent" : "IDE de nuit",
          stayId: STAY_ARNAUD,
          frPerMin: row.id === "v1" ? 18 : null,
          eva: row.id === "v1" ? 1 : null,
          alertLabels: alerts,
          cancelledAt: null,
          cancelledBy: null,
          cancelReason: null,
          supersedesId: null,
        },
        updatedAt: new Date(),
      });
    }

    const noteId = uuidv7();
    await db.insert(nursingNotes).values({
      id: noteId,
      patientId: PATIENT_ARNAUD,
      stayId: STAY_ARNAUD,
      encounterId: null,
      authorId: "demo-ide",
      recordedAt: new Date("2026-11-23T08:00:00+01:00"),
      bodyEnc: JSON.stringify({
        kind: "fluid",
        intakeMl: 800,
        outputMl: 650,
        diuresisMl: 600,
        authorLabel: "S. Laurent",
      }),
      createdAt: new Date("2026-11-23T08:00:00+01:00"),
      updatedAt: new Date("2026-11-23T08:00:00+01:00"),
    });

    await db.insert(nursingNotes).values({
      id: uuidv7(),
      patientId: PATIENT_ARNAUD,
      stayId: STAY_ARNAUD,
      encounterId: null,
      authorId: "demo-ide",
      recordedAt: new Date("2026-11-23T07:55:00+01:00"),
      bodyEnc: JSON.stringify({
        kind: "transmission",
        target: "Médecin de garde",
        body: "Patient dyspnéique à la marche — surveillance rapprochée.",
        authorLabel: "S. Laurent",
      }),
      createdAt: new Date("2026-11-23T07:55:00+01:00"),
      updatedAt: new Date("2026-11-23T07:55:00+01:00"),
    });
  }
}
