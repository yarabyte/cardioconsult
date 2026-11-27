import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  aorticMeasurements,
  documents,
  echoStudies,
  ecgStudies,
  encounters,
  labResults,
  prescriptionLines,
  prescriptions,
  settings,
  vitals,
} from "@/db/tenant/schema";
import {
  buildComparisonTable,
  filterDatedByPeriod,
  filterSeriesByPeriod,
  withSource,
  type SeriesPeriod,
  type SeriesPointWithSource,
} from "@/lib/dossier/series";
import type { EncounterDraftData } from "@/lib/consultation/draft-types";
import {
  formatLineDosage,
  formatLinePosology,
  isOpaqueActorId,
  parsePrescriptionLineExtras,
} from "@/lib/prescriptions/format-line";
import type { PatientView } from "@/server/services/patients/service";
import { listStaysForPatientOnDb } from "@/server/hospitalisation/service";
import type { TenantDb } from "@/server/db/tenant-db";
import { withTenantDb } from "@/server/db/tenant-db";

export type TimelineEvent = {
  id: string;
  at: string;
  kind: "consultation" | "examen" | "hospitalisation" | "ordonnance" | "compte_rendu";
  label: string;
  /** Lien vers la consultation (lecture ou reprise). */
  href?: string | null;
  status?: string | null;
};

export type ActiveTreatment = {
  dci: string;
  dosage: string | null;
  frequency?: string | null;
  updatedAt: string;
  updatedBy: string;
  /** Lien vers l’ordonnance source. */
  href?: string | null;
};

export type ActiveProblem = {
  label: string;
  status?: string | null;
  since?: string | null;
  comment?: string | null;
};

export type ClinicalDocumentLink = {
  id: string;
  kind: "ordonnance" | "compte_rendu";
  title: string;
  status: string;
  at: string;
  href: string;
};

export type ConsultationSummary = {
  id: string;
  at: string;
  motif: string | null;
  status: string;
  href: string;
};

export type LongitudinalDossier = {
  patientId: string;
  problems: string[];
  problemDetails: ActiveProblem[];
  treatments: ActiveTreatment[];
  documents: ClinicalDocumentLink[];
  /** Consultations filtrées par période (tri desc). */
  consultations: ConsultationSummary[];
  timeline: TimelineEvent[];
  series: Record<string, SeriesPointWithSource[]>;
  comparison: ReturnType<typeof buildComparisonTable>;
  /** Allergies issues du brouillon si absentes du dossier patient. */
  draftAllergies: string[];
  /** Dernières valeurs synthétiques pour l’onglet synthèse. */
  highlights: {
    fevgPct: number | null;
    tas: number | null;
    tad: number | null;
    fc: number | null;
    weightKg: number | null;
    ntprobnp: number | null;
    dfg: number | null;
    asOf: string | null;
  };
};

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function num(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function labPoints(
  rows: (typeof labResults.$inferSelect)[],
  code: string,
  source: string,
  unit: string,
): SeriesPointWithSource[] {
  return rows
    .filter((r) => r.code === code && r.valueNumeric != null)
    .map((r) => ({
      date: dateOnly(r.datedAt.toISOString()),
      value: Number(r.valueNumeric),
      source,
      unit,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLongitudinalDossierOnDb(
  db: TenantDb,
  patient: PatientView,
  period: SeriesPeriod = "1a",
): Promise<LongitudinalDossier> {
  const patientId = patient.id;

  const [vitalRows, labs, echoes, ecgs, aorta, encounterRows, rxRows, docRows] = await Promise.all([
    db
      .select()
      .from(vitals)
      .where(and(eq(vitals.patientId, patientId), isNull(vitals.archivedAt)))
      .orderBy(asc(vitals.recordedAt)),
    db
      .select()
      .from(labResults)
      .where(eq(labResults.patientId, patientId))
      .orderBy(asc(labResults.datedAt)),
    db
      .select()
      .from(echoStudies)
      .where(eq(echoStudies.patientId, patientId))
      .orderBy(asc(echoStudies.datedAt)),
    db
      .select()
      .from(ecgStudies)
      .where(eq(ecgStudies.patientId, patientId))
      .orderBy(asc(ecgStudies.datedAt)),
    db
      .select()
      .from(aorticMeasurements)
      .where(eq(aorticMeasurements.patientId, patientId))
      .orderBy(asc(aorticMeasurements.datedAt)),
    db
      .select()
      .from(encounters)
      .where(eq(encounters.patientId, patientId))
      .orderBy(desc(encounters.datedAt)),
    db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.patientId, patientId),
          inArray(prescriptions.status, ["valide", "brouillon"]),
        ),
      )
      .orderBy(desc(prescriptions.updatedAt)),
    db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.patientId, patientId),
          eq(documents.kind, "compte_rendu"),
          inArray(documents.status, ["brouillon", "valide", "signe"]),
        ),
      )
      .orderBy(desc(documents.updatedAt)),
  ]);

  const fevgFromEcho = echoes
    .filter((e) => e.fevgPct != null)
    .map((e) => ({
      date: dateOnly(e.datedAt.toISOString()),
      value: e.fevgPct as number,
    }));

  const tas = vitalRows
    .filter((v) => v.tasMmHg != null)
    .map((v) => ({
      date: dateOnly(v.recordedAt.toISOString()),
      value: v.tasMmHg as number,
    }));
  const tad = vitalRows
    .filter((v) => v.tadMmHg != null)
    .map((v) => ({
      date: dateOnly(v.recordedAt.toISOString()),
      value: v.tadMmHg as number,
    }));
  const fc = vitalRows
    .filter((v) => v.fcBpm != null)
    .map((v) => ({
      date: dateOnly(v.recordedAt.toISOString()),
      value: v.fcBpm as number,
    }));
  const weight = vitalRows
    .filter((v) => v.weightKg != null)
    .map((v) => ({
      date: dateOnly(v.recordedAt.toISOString()),
      value: num(v.weightKg) as number,
    }));

  const raw: Record<string, SeriesPointWithSource[]> = {
    fevg: withSource(fevgFromEcho, "ETT", "%"),
    tas: withSource(tas, "Consultation", "mmHg"),
    tad: withSource(tad, "Consultation", "mmHg"),
    fc: withSource(fc, "Consultation", "bpm"),
    weight: withSource(weight, "IDE", "kg"),
    ntprobnp: withSource(
      labPoints(labs, "ntprobnp_pg_ml", "Biologie", "pg/mL"),
      "Biologie",
      "pg/mL",
    ),
    dfg: withSource(labPoints(labs, "dfg_ml_min", "Biologie", "mL/min"), "Biologie", "mL/min"),
    qtc: withSource(
      ecgs
        .filter((e) => e.qtcMs != null)
        .map((e) => ({
          date: dateOnly(e.datedAt.toISOString()),
          value: e.qtcMs as number,
        })),
      "ECG Fridericia",
      "ms",
    ),
    ldl: withSource(labPoints(labs, "ldl_g_l", "Biologie", "g/L"), "Biologie", "g/L"),
    aorteAsc: withSource(
      aorta
        .filter((a) => a.segment === "ascendante" && a.diameterMm != null)
        .map((a) => ({
          date: dateOnly(a.datedAt.toISOString()),
          value: num(a.diameterMm) as number,
        })),
      "ETT aorte",
      "mm",
    ),
    aorteSinus: withSource(
      aorta
        .filter((a) => a.segment === "sinus" && a.diameterMm != null)
        .map((a) => ({
          date: dateOnly(a.datedAt.toISOString()),
          value: num(a.diameterMm) as number,
        })),
      "ETT aorte",
      "mm",
    ),
  };

  const latestEnc = encounterRows[0] ?? null;
  let draft: EncounterDraftData | null = null;
  if (latestEnc) {
    const [draftRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, `encounter_draft:${latestEnc.id}`))
      .limit(1);
    if (draftRow?.value && typeof draftRow.value === "object") {
      draft = draftRow.value as EncounterDraftData;
    }
  }
  const draftAt = latestEnc ? dateOnly(latestEnc.datedAt.toISOString()) : null;

  // Séries issues du brouillon (complètent tables vitals / echo / labs si absentes).
  if (draft && draftAt) {
    const ce = draft.clinicalExam;
    if (ce?.tas != null) {
      raw.tas = [
        ...(raw.tas ?? []),
        ...withSource([{ date: draftAt, value: ce.tas }], "Consultation", "mmHg"),
      ];
    }
    if (ce?.tad != null) {
      raw.tad = [
        ...(raw.tad ?? []),
        ...withSource([{ date: draftAt, value: ce.tad }], "Consultation", "mmHg"),
      ];
    }
    if (ce?.fc != null) {
      raw.fc = [
        ...(raw.fc ?? []),
        ...withSource([{ date: draftAt, value: ce.fc }], "Consultation", "bpm"),
      ];
    }
    if (ce?.weightKg != null) {
      raw.weight = [
        ...(raw.weight ?? []),
        ...withSource([{ date: draftAt, value: ce.weightKg }], "Consultation", "kg"),
      ];
    }
    if (typeof draft.echo?.fevg === "number") {
      raw.fevg = [
        ...(raw.fevg ?? []),
        ...withSource([{ date: draftAt, value: draft.echo.fevg }], "ETT (brouillon)", "%"),
      ];
    }
    if (typeof draft.ecg?.qtcMs === "number") {
      raw.qtc = [
        ...(raw.qtc ?? []),
        ...withSource([{ date: draftAt, value: draft.ecg.qtcMs }], "ECG (brouillon)", "ms"),
      ];
    }
    for (const panel of draft.labs ?? []) {
      const sampled = dateOnly(panel.sampledAt);
      for (const row of panel.rows) {
        if (typeof row.value !== "number") continue;
        if (row.code === "ntprobnp_pg_ml") {
          raw.ntprobnp = [
            ...(raw.ntprobnp ?? []),
            ...withSource([{ date: sampled, value: row.value }], "Biologie (brouillon)", "pg/mL"),
          ];
        }
        if (row.code === "dfg_ml_min") {
          raw.dfg = [
            ...(raw.dfg ?? []),
            ...withSource([{ date: sampled, value: row.value }], "Biologie (brouillon)", "mL/min"),
          ];
        }
        if (row.code === "ldl_g_l") {
          raw.ldl = [
            ...(raw.ldl ?? []),
            ...withSource([{ date: sampled, value: row.value }], "Biologie (brouillon)", "g/L"),
          ];
        }
      }
    }
    for (const seg of draft.aorta?.segments ?? []) {
      if (seg.diameterMm == null) continue;
      const point = withSource(
        [{ date: dateOnly(seg.datedAt ?? draftAt), value: seg.diameterMm }],
        "ETT aorte (brouillon)",
        "mm",
      );
      if (seg.segment === "ascendante") raw.aorteAsc = [...(raw.aorteAsc ?? []), ...point];
      if (seg.segment === "sinus") raw.aorteSinus = [...(raw.aorteSinus ?? []), ...point];
    }
  }

  const series: Record<string, SeriesPointWithSource[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    series[k] = filterSeriesByPeriod(v, period);
  }

  const comparison = buildComparisonTable([
    { key: "fevg", label: "FEVG", unit: "%", series: series.fevg ?? [] },
    { key: "tas", label: "TAS", unit: "mmHg", series: series.tas ?? [] },
    { key: "weight", label: "Poids", unit: "kg", series: series.weight ?? [] },
    { key: "ntprobnp", label: "NT-proBNP", unit: "pg/mL", series: series.ntprobnp ?? [] },
    { key: "dfg", label: "DFG", unit: "mL/min", series: series.dfg ?? [] },
    { key: "qtc", label: "QTc", unit: "ms", series: series.qtc ?? [] },
    { key: "ldl", label: "LDL", unit: "g/L", series: series.ldl ?? [] },
  ]);

  const treatments: ActiveTreatment[] = [];
  if (rxRows.length > 0) {
    const rxIds = rxRows.map((r) => r.id);
    const lines =
      rxIds.length > 0
        ? await db
            .select()
            .from(prescriptionLines)
            .where(inArray(prescriptionLines.prescriptionId, rxIds))
            .orderBy(asc(prescriptionLines.sortOrder))
        : [];
    const lineMap = new Map<string, (typeof lines)[0][]>();
    for (const line of lines) {
      const list = lineMap.get(line.prescriptionId) ?? [];
      list.push(line);
      lineMap.set(line.prescriptionId, list);
    }
    for (const rx of rxRows.slice(0, 1)) {
      const rxHref = `/ordonnances/${rx.id}`;
      const rxLines = lineMap.get(rx.id) ?? [];
      if (rxLines.length === 0) {
        const actor = rx.validatedBy ?? rx.createdBy ?? null;
        treatments.push({
          dci: `Ordonnance ${rx.status}`,
          dosage: null,
          frequency: null,
          updatedAt: rx.updatedAt.toISOString(),
          updatedBy: isOpaqueActorId(actor) ? "Ordonnance" : (actor ?? "Ordonnance"),
          href: rxHref,
        });
        continue;
      }
      for (const line of rxLines) {
        const extras = parsePrescriptionLineExtras(line.duration);
        const actor = rx.validatedBy ?? rx.createdBy ?? null;
        treatments.push({
          dci: line.dci?.trim() || line.drugEnc?.trim() || "Ligne sans DCI",
          dosage: formatLineDosage(extras),
          frequency: formatLinePosology({
            posology: line.posologyEnc,
            extras,
          }),
          updatedAt: rx.updatedAt.toISOString(),
          updatedBy: isOpaqueActorId(actor) ? "Ordonnance" : (actor ?? "Ordonnance"),
          href: rxHref,
        });
      }
    }
  }

  if (treatments.length === 0 && draft?.treatments?.length) {
    for (const t of draft.treatments) {
      if (!t.dci?.trim()) continue;
      treatments.push({
        dci: t.dci.trim(),
        dosage: t.dose,
        frequency: t.frequency,
        updatedAt: latestEnc?.updatedAt.toISOString() ?? new Date().toISOString(),
        updatedBy: latestEnc?.updatedBy ?? "Consultation",
        href: latestEnc ? `/consultations/${latestEnc.id}/traitements` : null,
      });
    }
  }

  const clinicalDocuments: ClinicalDocumentLink[] = [
    ...rxRows.slice(0, 10).map((rx) => ({
      id: rx.id,
      kind: "ordonnance" as const,
      title: `Ordonnance · ${rx.status}`,
      status: rx.status,
      at: dateOnly(rx.updatedAt.toISOString()),
      href: `/ordonnances/${rx.id}`,
    })),
    ...docRows.slice(0, 10).map((doc) => ({
      id: doc.id,
      kind: "compte_rendu" as const,
      title: doc.title || "Compte rendu",
      status: doc.status,
      at: dateOnly(doc.updatedAt.toISOString()),
      href: `/comptes-rendus/${doc.id}`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const consultationsAll: ConsultationSummary[] = encounterRows.map((enc) => {
    const motif =
      enc.id === latestEnc?.id && draft?.motif?.trim()
        ? draft.motif.trim()
        : enc.motifEnc?.trim()
          ? enc.motifEnc.trim()
          : enc.type
            ? enc.type
            : null;
    return {
      id: enc.id,
      at: dateOnly(enc.datedAt.toISOString()),
      motif,
      status: enc.status,
      href: `/consultations/${enc.id}/identite`,
    };
  });
  const consultations = filterDatedByPeriod(consultationsAll, period).slice(0, 50);

  const timeline: TimelineEvent[] = [];

  for (const c of consultationsAll) {
    const open = c.status === "en_cours";
    const baseLabel = c.motif ? `Consultation · ${c.motif}` : "Consultation";
    timeline.push({
      id: `enc-${c.id}`,
      at: c.at,
      kind: "consultation",
      label: open ? `${baseLabel} · en cours` : baseLabel,
      href: c.href,
      status: c.status,
    });
  }

  if (draft?.echo?.fevg != null && draftAt) {
    timeline.push({
      id: `echo-draft-${latestEnc?.id ?? "x"}`,
      at: draftAt,
      kind: "examen",
      label: `ETT · FEVG ${draft.echo.fevg} %`,
      href: latestEnc ? `/consultations/${latestEnc.id}/echocardiographie` : null,
    });
  }

  for (const rx of rxRows.slice(0, 20)) {
    timeline.push({
      id: `rx-${rx.id}`,
      at: dateOnly(rx.updatedAt.toISOString()),
      kind: "ordonnance",
      label: `Ordonnance · ${rx.status}`,
      href: `/ordonnances/${rx.id}`,
      status: rx.status,
    });
  }

  for (const doc of docRows.slice(0, 20)) {
    timeline.push({
      id: `doc-${doc.id}`,
      at: dateOnly(doc.updatedAt.toISOString()),
      kind: "compte_rendu",
      label: doc.title || "Compte rendu",
      href: `/comptes-rendus/${doc.id}`,
      status: doc.status,
    });
  }

  for (const echo of echoes.slice(0, 20)) {
    timeline.push({
      id: `echo-${echo.id}`,
      at: dateOnly(echo.datedAt.toISOString()),
      kind: "examen",
      label: "ETT",
    });
  }

  for (const lab of labs.slice(0, 20)) {
    timeline.push({
      id: `lab-${lab.id}`,
      at: dateOnly(lab.datedAt.toISOString()),
      kind: "examen",
      label: `Biologie (${lab.code})`,
    });
  }

  const stays = await listStaysForPatientOnDb(db, patientId);
  const stayEvents: TimelineEvent[] = stays.map((s) => ({
    id: `stay-${s.id}`,
    at: dateOnly(s.admittedAt),
    kind: "hospitalisation" as const,
    label: `Séjour${s.room != null ? ` ch. ${s.room}` : ""}${s.motif ? ` — ${s.motif}` : ""} (${s.status})`,
  }));

  const mergedTimeline = filterDatedByPeriod(
    [...timeline, ...stayEvents]
      .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
      .sort((a, b) => b.at.localeCompare(a.at)),
    period,
  ).slice(0, 50);

  const problemDetails: ActiveProblem[] = [];
  if (draft?.antecedents?.length) {
    for (const a of draft.antecedents) {
      if (!a.pathology?.trim()) continue;
      problemDetails.push({
        label: a.pathology.trim(),
        status: a.status,
        since: a.date,
        comment: a.comment,
      });
    }
  }
  const fromPathologies = (patient.pathologies ?? []).filter(
    (p) => !problemDetails.some((d) => d.label.toLowerCase() === p.toLowerCase()),
  );
  for (const p of fromPathologies) {
    problemDetails.push({ label: p });
  }
  const problems = problemDetails.map((p) => p.label);

  const lastOf = (key: string): number | null => {
    const pts = series[key] ?? [];
    const last = pts[pts.length - 1];
    return last?.value ?? null;
  };

  return {
    patientId: patient.id,
    problems,
    problemDetails,
    treatments,
    documents: clinicalDocuments,
    consultations,
    timeline: mergedTimeline,
    series,
    comparison,
    draftAllergies: (draft?.allergies ?? []).filter((a) => a.trim().length > 0),
    highlights: {
      fevgPct: lastOf("fevg"),
      tas: lastOf("tas"),
      tad: lastOf("tad"),
      fc: lastOf("fc"),
      weightKg: lastOf("weight"),
      ntprobnp: lastOf("ntprobnp"),
      dfg: lastOf("dfg"),
      asOf: draftAt,
    },
  };
}

export async function getLongitudinalDossier(
  tenantId: string,
  patient: PatientView,
  period: SeriesPeriod = "1a",
): Promise<LongitudinalDossier> {
  return withTenantDb(tenantId, (db) => getLongitudinalDossierOnDb(db, patient, period));
}
