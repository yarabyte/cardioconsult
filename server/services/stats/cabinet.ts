import { and, count, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  clinicalAlerts,
  clinicalScores,
  documents,
  echoStudies,
  encounters,
  patientIdentityEnc,
  patients,
  prescriptions,
} from "@/db/tenant/schema";
import {
  cha2Bucket,
  distributeCompleteScores,
  fevgBucket,
  maskSmallCells,
  toCsvMasked,
  type DistBucket,
  type MaskedCell,
} from "@/lib/stats/aggregate";
import { patientDisplayName } from "@/lib/format";
import { withTenantDb } from "@/server/db/tenant-db";
import type { TenantDb } from "@/server/db/tenant-db";

export type RecallPatient = {
  id: string;
  label: string;
  reason: string;
  lastVisit: string | null;
  fevgPct: number | null;
};

export type CabinetStats = {
  generatedAt: string;
  fileActive: number;
  patientsTotal: number;
  consultationsThisMonth: number;
  consultationsLast12Months: number;
  echoCount: number;
  crSignedPct: number;
  crTotal: number;
  rxValidatedPct: number;
  rxTotal: number;
  closedPct: number;
  encountersByMonth: DistBucket[];
  fevg: { complete: DistBucket[]; incompleteCount: number };
  cha2ds2: { complete: DistBucket[]; incompleteCount: number };
  /** Indicateurs qualité opérationnels (données réelles du cabinet). */
  objectives: { label: string; pct: number }[];
  icCohortSize: number;
  recallList: RecallPatient[];
};

function monthStart(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function scoreNumeric(result: unknown): number | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if (r.status === "incomplet" || r.status === "non_applicable") return null;
  const v = r.value ?? r.score;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const months = [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc.",
  ];
  const idx = Number(m) - 1;
  return `${months[idx] ?? m} ${y?.slice(2) ?? ""}`;
}

export async function computeCabinetStatsOnDb(
  db: TenantDb,
  _opts?: {
    actorId?: string;
    isTenantAdmin?: boolean;
  },
): Promise<CabinetStats> {
  const startMonth = monthStart();
  const start12 = monthsAgo(11);

  const [
    [patientsRow],
    [fileRow],
    [encMonthRow],
    [enc12Row],
    [echoRow],
    encStatusRows,
    crRows,
    rxRows,
    echoFevgRows,
    chaRows,
    alertRows,
    encMonthSeries,
    lastEncRows,
  ] = await Promise.all([
    db.select({ n: count() }).from(patients).where(isNull(patients.archivedAt)),
    db
      .select({ n: sql<number>`count(distinct ${encounters.patientId})` })
      .from(encounters)
      .where(gte(encounters.datedAt, start12)),
    db.select({ n: count() }).from(encounters).where(gte(encounters.datedAt, startMonth)),
    db.select({ n: count() }).from(encounters).where(gte(encounters.datedAt, start12)),
    db
      .select({ n: count() })
      .from(echoStudies)
      .where(and(isNull(echoStudies.archivedAt), isNotNull(echoStudies.fevgPct))),
    db
      .select({ status: encounters.status, n: count() })
      .from(encounters)
      .where(gte(encounters.datedAt, start12))
      .groupBy(encounters.status),
    db.select({ status: documents.status }).from(documents),
    db.select({ status: prescriptions.status }).from(prescriptions),
    db
      .select({
        patientId: echoStudies.patientId,
        fevgPct: echoStudies.fevgPct,
        datedAt: echoStudies.datedAt,
      })
      .from(echoStudies)
      .where(and(isNull(echoStudies.archivedAt), isNotNull(echoStudies.fevgPct)))
      .orderBy(desc(echoStudies.datedAt)),
    db
      .select({ result: clinicalScores.result, patientId: clinicalScores.patientId })
      .from(clinicalScores)
      .where(inArray(clinicalScores.kind, ["cha2ds2va", "CHA2DS2VA", "SCORE.CHA2DS2VA"]))
      .orderBy(desc(clinicalScores.datedAt)),
    db
      .select({
        patientId: clinicalAlerts.patientId,
        title: clinicalAlerts.title,
      })
      .from(clinicalAlerts)
      .where(isNull(clinicalAlerts.acknowledgedAt))
      .orderBy(desc(clinicalAlerts.createdAt))
      .limit(30),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${encounters.datedAt}), 'YYYY-MM')`,
        n: count(),
      })
      .from(encounters)
      .where(gte(encounters.datedAt, start12))
      .groupBy(sql`date_trunc('month', ${encounters.datedAt})`)
      .orderBy(sql`date_trunc('month', ${encounters.datedAt})`),
    db
      .select({
        patientId: encounters.patientId,
        datedAt: encounters.datedAt,
      })
      .from(encounters)
      .orderBy(desc(encounters.datedAt)),
  ]);

  const patientsTotal = Number(patientsRow?.n ?? 0);
  const fileActive = Number(fileRow?.n ?? 0);
  const consultationsThisMonth = Number(encMonthRow?.n ?? 0);
  const consultationsLast12Months = Number(enc12Row?.n ?? 0);
  const echoCount = Number(echoRow?.n ?? 0);

  const enc12Total = encStatusRows.reduce((s, r) => s + Number(r.n), 0);
  const encClosed = encStatusRows
    .filter((r) => r.status === "termine")
    .reduce((s, r) => s + Number(r.n), 0);
  const closedPct = enc12Total > 0 ? Math.round((encClosed / enc12Total) * 100) : 0;

  const crTotal = crRows.length;
  const crSigned = crRows.filter((r) => r.status === "signe" || r.status === "valide").length;
  const crSignedPct = crTotal > 0 ? Math.round((crSigned / crTotal) * 100) : 0;

  const rxTotal = rxRows.length;
  const rxValidated = rxRows.filter((r) => r.status === "valide" || r.status === "signe").length;
  const rxValidatedPct = rxTotal > 0 ? Math.round((rxValidated / rxTotal) * 100) : 0;

  // Dernière FEVG connue par patient
  const latestFevg = new Map<string, number>();
  for (const row of echoFevgRows) {
    if (latestFevg.has(row.patientId)) continue;
    if (row.fevgPct == null) continue;
    latestFevg.set(row.patientId, row.fevgPct);
  }
  const fevgValues = [...latestFevg.values()].map((v) => v as number | null);
  const fevg = distributeCompleteScores(fevgValues, fevgBucket, ["< 40 %", "40–49 %", "≥ 50 %"]);

  // Dernier CHA₂DS₂-VA par patient
  const latestCha = new Map<string, number | null>();
  for (const row of chaRows) {
    if (latestCha.has(row.patientId)) continue;
    latestCha.set(row.patientId, scoreNumeric(row.result));
  }
  const cha2ds2 = distributeCompleteScores([...latestCha.values()], cha2Bucket, [
    "0",
    "1",
    "2",
    "≥ 3",
  ]);

  const monthMap = new Map(encMonthSeries.map((r) => [r.month, Number(r.n)]));
  const encountersByMonth: DistBucket[] = [];
  for (let i = 0; i < 12; i++) {
    const d = monthsAgo(11 - i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    encountersByMonth.push({
      label: monthLabel(key),
      value: monthMap.get(key) ?? 0,
    });
  }

  const lastVisitByPatient = new Map<string, Date>();
  for (const row of lastEncRows) {
    if (lastVisitByPatient.has(row.patientId)) continue;
    lastVisitByPatient.set(row.patientId, row.datedAt);
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);

  const icPatients = [...latestFevg.entries()]
    .filter(([, fevgPct]) => fevgPct < 40)
    .map(([patientId, fevgPct]) => ({ patientId, fevgPct }));

  const recallCandidates: Array<{
    patientId: string;
    reason: string;
    fevgPct: number | null;
  }> = [];

  for (const ic of icPatients) {
    const last = lastVisitByPatient.get(ic.patientId);
    if (!last || last < sixMonthsAgo) {
      recallCandidates.push({
        patientId: ic.patientId,
        reason: last
          ? "IC (FEVG < 40 %) — sans consultation depuis plus de 6 mois"
          : "IC (FEVG < 40 %) — aucune consultation enregistrée",
        fevgPct: ic.fevgPct,
      });
    }
  }

  for (const a of alertRows) {
    if (recallCandidates.some((c) => c.patientId === a.patientId)) continue;
    recallCandidates.push({
      patientId: a.patientId,
      reason: a.title,
      fevgPct: latestFevg.get(a.patientId) ?? null,
    });
  }

  const recallIds = [...new Set(recallCandidates.map((c) => c.patientId))].slice(0, 20);
  const identities =
    recallIds.length > 0
      ? await db
          .select()
          .from(patientIdentityEnc)
          .where(inArray(patientIdentityEnc.patientId, recallIds))
      : [];
  const identityByPatient = new Map(identities.map((i) => [i.patientId, i]));

  const recallList: RecallPatient[] = recallCandidates
    .filter((c) => recallIds.includes(c.patientId))
    .slice(0, 15)
    .map((c) => {
      const id = identityByPatient.get(c.patientId);
      const first = id?.firstNameEnc?.trim() || "";
      const last = id?.lastNameEnc?.trim() || "";
      const initial = first ? `${first[0]!.toUpperCase()}.` : "?";
      const lastLabel = last ? last.split(/\s+/)[0] : "Patient";
      const lastVisit = lastVisitByPatient.get(c.patientId);
      return {
        id: c.patientId,
        label:
          first || last
            ? `${initial} ${lastLabel}`
            : patientDisplayName("Patient", c.patientId.slice(-6)),
        reason: c.reason,
        lastVisit: lastVisit ? lastVisit.toISOString().slice(0, 10) : null,
        fevgPct: c.fevgPct,
      };
    });

  const objectives = [
    { label: "Consultations clôturées (12 mois)", pct: closedPct },
    { label: "Comptes rendus validés / signés", pct: crSignedPct },
    { label: "Ordonnances validées", pct: rxValidatedPct },
    {
      label: "Patients avec FEVG documentée",
      pct: patientsTotal > 0 ? Math.round((latestFevg.size / patientsTotal) * 100) : 0,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    fileActive,
    patientsTotal,
    consultationsThisMonth,
    consultationsLast12Months,
    echoCount,
    crSignedPct,
    crTotal,
    rxValidatedPct,
    rxTotal,
    closedPct,
    encountersByMonth,
    fevg,
    cha2ds2,
    objectives,
    icCohortSize: icPatients.length,
    recallList,
  };
}

export async function computeCabinetStats(
  tenantId: string,
  opts?: {
    actorId?: string;
    isTenantAdmin?: boolean;
  },
): Promise<CabinetStats> {
  return withTenantDb(tenantId, (db) => computeCabinetStatsOnDb(db, opts));
}

export function exportStatsCsv(stats: CabinetStats): {
  csv: string;
  maskedFevg: MaskedCell[];
  maskedCha: MaskedCell[];
} {
  const maskedFevg = maskSmallCells(stats.fevg.complete);
  const maskedCha = maskSmallCells(stats.cha2ds2.complete);
  const csv = [
    toCsvMasked(maskedFevg, "fevg_bucket"),
    "",
    toCsvMasked(maskedCha, "cha2ds2va_bucket"),
    "",
    toCsvMasked(maskSmallCells(stats.encountersByMonth), "consultations_mois"),
    "",
    `incomplets_fevg;${stats.fevg.incompleteCount}`,
    `incomplets_cha2;${stats.cha2ds2.incompleteCount}`,
    `file_active_12m;${stats.fileActive}`,
    `patients_total;${stats.patientsTotal}`,
    `consultations_mois;${stats.consultationsThisMonth}`,
    `consultations_12m;${stats.consultationsLast12Months}`,
    `ett_avec_fevg;${stats.echoCount}`,
    `cohorte_ic;${stats.icCohortSize}`,
    `cr_valides_pct;${stats.crSignedPct}`,
    `rx_validees_pct;${stats.rxValidatedPct}`,
  ].join("\n");
  return { csv, maskedFevg, maskedCha };
}
