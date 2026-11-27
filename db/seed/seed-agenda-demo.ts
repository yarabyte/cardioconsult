import { eq } from "drizzle-orm";
import { appointmentKinds, appointments, encounters, patients, settings } from "@/db/tenant/schema";
import type { TenantDb } from "@/server/db/tenant-db";

const DEMO_PHYSICIAN = "demo-medecin";
const DEMO_DAY = "2026-11-23";

function slot(h: number, m: number, durMin: number) {
  const startsAt = new Date(
    `${DEMO_DAY}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+01:00`,
  );
  const endsAt = new Date(startsAt.getTime() + durMin * 60_000);
  return { startsAt, endsAt };
}

const KINDS = [
  { id: "suivi", label: "Suivi", durationMin: 20, color: "#0B4FB3", executorRole: "MEDECIN" },
  { id: "ett", label: "ETT", durationMin: 30, color: "#0F7A4D", executorRole: "MEDECIN" },
  { id: "preop", label: "Préop", durationMin: 30, color: "#B45309", executorRole: "BOTH" },
  { id: "admin", label: "Bloc admin", durationMin: 15, color: "#52627F", executorRole: "BOTH" },
] as const;

export async function seedAgendaDemoOnDb(db: TenantDb): Promise<void> {
  for (const k of KINDS) {
    await db.insert(appointmentKinds).values(k).onConflictDoNothing();
  }

  const dossiers = ["CC-000184", "CC-000231", "CC-000412", "CC-000097", "CC-000188"];
  const byDossier = new Map<string, string>();
  for (const dn of dossiers) {
    const [p] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.dossierNumber, dn))
      .limit(1);
    if (p) byDossier.set(dn, p.id);
  }

  const apptRows = [
    {
      id: "a1",
      patientId: byDossier.get("CC-000184"),
      kindId: "suivi",
      motif: "Suivi IC",
      status: "termine",
      prep: { vitals: true, ecg: true, weight: true },
      ...slot(8, 30, 20),
    },
    {
      id: "a2",
      patientId: byDossier.get("CC-000231"),
      kindId: "ett",
      motif: "ETT",
      status: "pret",
      prep: { vitals: true, ecg: false, weight: true },
      ...slot(9, 0, 30),
    },
    {
      id: "a3",
      patientId: byDossier.get("CC-000412"),
      kindId: "preop",
      motif: "Préop",
      status: "en_preparation",
      prep: { vitals: false, ecg: false, weight: false },
      ...slot(9, 30, 30),
    },
    {
      id: "a4",
      patientId: byDossier.get("CC-000097"),
      kindId: "suivi",
      motif: "FA",
      status: "prevu",
      prep: { vitals: false, ecg: false, weight: false },
      ...slot(10, 0, 20),
    },
    {
      id: "a5",
      patientId: null as string | null | undefined,
      kindId: "admin",
      motif: "Points admin",
      status: "prevu",
      prep: { vitals: false, ecg: false, weight: false },
      adminBlock: true,
      ...slot(12, 0, 30),
    },
    {
      id: "w1",
      patientId: byDossier.get("CC-000188"),
      kindId: "suivi",
      motif: "Liste d'attente",
      status: "prevu",
      waitlist: true,
      prep: { vitals: false, ecg: false, weight: false },
      ...slot(18, 0, 20),
    },
  ] as const;

  for (const a of apptRows) {
    const [exists] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.id, a.id))
      .limit(1);
    if (exists) continue;
    const patientId = a.patientId ?? null;
    await db.insert(appointments).values({
      id: a.id,
      patientId,
      physicianId: DEMO_PHYSICIAN,
      kindId: a.kindId,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      motifEnc: a.motif,
      status: a.status,
      prepVitals: a.prep.vitals,
      prepEcg: a.prep.ecg,
      prepWeight: a.prep.weight,
      waitlist: "waitlist" in a ? Boolean(a.waitlist) : false,
      adminBlock: "adminBlock" in a ? Boolean(a.adminBlock) : false,
      version: 1,
    });
  }

  const encRows = [
    {
      id: "enc-ett-lefevre",
      dossier: "CC-000231",
      motif: "ETT · suivi aorte",
      type: "ETT",
      status: "en_cours",
      rubric: "echocardiographie",
      at: slot(9, 0, 0).startsAt,
    },
    {
      id: "enc-scores-girard",
      dossier: "CC-000097",
      motif: "FA · anticoagulation",
      type: "Consultation",
      status: "a_venir",
      rubric: "scores",
      at: slot(10, 0, 0).startsAt,
    },
  ] as const;

  for (const e of encRows) {
    const patientId = byDossier.get(e.dossier);
    if (!patientId) continue;
    const [exists] = await db
      .select({ id: encounters.id })
      .from(encounters)
      .where(eq(encounters.id, e.id))
      .limit(1);
    if (exists) continue;
    await db.insert(encounters).values({
      id: e.id,
      patientId,
      datedAt: e.at,
      motifEnc: e.motif,
      type: e.type,
      status: e.status,
      version: 1,
    });
    await db
      .insert(settings)
      .values({
        key: `encounter_rubric:${e.id}`,
        value: e.rubric,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}
