import { describe, expect, it } from "vitest";
import {
  distributeCompleteScores,
  fevgBucket,
  maskSmallCells,
  SMALL_CELL_THRESHOLD,
  toCsvMasked,
} from "./aggregate";
import { exportStatsCsv, type CabinetStats } from "@/server/services/stats/cabinet";

describe("petits effectifs", () => {
  it("masque les cellules < 5", () => {
    const masked = maskSmallCells([
      { label: "A", value: 12 },
      { label: "B", value: 3 },
      { label: "C", value: 0 },
    ]);
    expect(masked[1]?.masked).toBe(true);
    expect(masked[1]?.value).toBeNull();
    expect(masked[0]?.masked).toBe(false);
    expect(masked[2]?.masked).toBe(false);
  });

  it("export CSV marque < seuil", () => {
    const csv = toCsvMasked(maskSmallCells([{ label: "rare", value: 2 }]), "bucket");
    expect(csv).toContain(`<${SMALL_CELL_THRESHOLD}`);
  });
});

describe("scores complets uniquement", () => {
  it("exclut les null de la distribution", () => {
    const r = distributeCompleteScores([35, null, 45, 55, null], fevgBucket, [
      "< 40 %",
      "40–49 %",
      "≥ 50 %",
    ]);
    expect(r.incompleteCount).toBe(2);
    expect(r.complete.reduce((s, b) => s + b.value, 0)).toBe(3);
  });
});

const baseStats = (): CabinetStats => ({
  generatedAt: new Date().toISOString(),
  fileActive: 1284,
  patientsTotal: 1400,
  consultationsThisMonth: 312,
  consultationsLast12Months: 3600,
  echoCount: 689,
  crSignedPct: 94,
  crTotal: 100,
  rxValidatedPct: 98,
  rxTotal: 100,
  closedPct: 88,
  encountersByMonth: [{ label: "nov. 26", value: 3 }],
  fevg: {
    complete: [
      { label: "< 40 %", value: 3 },
      { label: "≥ 50 %", value: 71 },
    ],
    incompleteCount: 3,
  },
  cha2ds2: { complete: [{ label: "2", value: 34 }], incompleteCount: 7 },
  objectives: [{ label: "Consultations clôturées (12 mois)", pct: 88 }],
  icCohortSize: 52,
  recallList: [
    {
      id: "p1",
      label: "J. Dupont",
      reason: "Contrôle",
      lastVisit: "2026-01-12",
      fevgPct: 31,
    },
    {
      id: "p2",
      label: "Autre",
      reason: "Bilan",
      lastVisit: null,
      fevgPct: null,
    },
  ],
});

describe("export cabinet", () => {
  it("masque au moins une cellule < 5", () => {
    const { maskedFevg } = exportStatsCsv(baseStats());
    expect(maskedFevg.some((c) => c.masked)).toBe(true);
  });

  it("exporte les indicateurs agrégés sans identité", () => {
    const { csv } = exportStatsCsv(baseStats());
    expect(csv).toContain("file_active_12m;1284");
    expect(csv).not.toContain("Dupont");
  });
});
