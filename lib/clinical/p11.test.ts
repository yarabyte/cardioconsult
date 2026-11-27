import { describe, expect, it } from "vitest";
import { computeCha2ds2va } from "./cha2ds2va";
import { computeTimi, emptyTimi, type TimiCriteria } from "./timi";
import { computeEphtProbability } from "./e-pht";
import { computeQtc } from "./qtc";
import { computeAorticAreaHeight } from "./aorta-index";
import { evaluateAorticSegment, evaluateAllSegments } from "./aorta";
import { externalScoreStub, scoreFamiliesForContext } from "./context";
import { computeImc } from "./imc";
import { computeBsa } from "./bsa";
import { computeHasbled } from "./hasbled";
import { computeRcri } from "./rcri";

const FORBIDDEN = /\b(indication\s+chirurgicale|diagnostic\s+confirmé|traitement\s+recommandé)\b/i;

function collectTexts(...parts: { rationale?: string[]; message?: string }[]) {
  return parts.flatMap((p) => [...(p.rationale ?? []), p.message ?? ""]).join("\n");
}

describe("P11 — libellés non décisionnels", () => {
  it("n'émet pas de libellés interdits", () => {
    const samples = [
      computeCha2ds2va({
        birthDate: "1950-01-01",
        actDate: "2026-01-01",
        criteria: {
          insuffisanceCardiaque: "oui",
          hta: "oui",
          diabete: "non",
          avc: "non",
          vasculaire: "non",
        },
      }),
      computeTimi({ ...emptyTimi(), positiveTroponin: "oui", stDeviation: "oui" }),
      evaluateAorticSegment({
        segment: "ascendante",
        diameterMm: 60,
        datedAt: "2026-11-23",
      }),
      computeEphtProbability({ trVmaxMs: 3.5, otherSignsOfPh: "oui" }),
      externalScoreStub("EuroSCORE II", "https://example.org"),
    ];
    for (const s of samples) {
      const text = collectTexts(
        "score" in s ? s.score : s,
        "rationale" in s ? s : { rationale: [] },
      );
      const blob =
        "score" in s ? s.score.rationale.join(" ") : "rationale" in s ? s.rationale.join(" ") : "";
      expect(blob).not.toMatch(FORBIDDEN);
      expect(text).not.toMatch(/\bindication\b/i);
    }
  });
});

describe("T-06 — jamais 0 si inconnus", () => {
  it("CHA₂DS₂-VA inconnu → incomplet", () => {
    const r = computeCha2ds2va({
      birthDate: "1960-01-01",
      actDate: "2026-01-01",
      criteria: {
        insuffisanceCardiaque: "inconnu",
        hta: "non",
        diabete: "non",
        avc: "non",
        vasculaire: "non",
      },
    });
    expect(r.status).toBe("incomplet");
    expect(r.value).toBeNull();
  });
});

describe("T-08 — pas d'état collant TIMI", () => {
  it("retrait troponine / ST recalcule", () => {
    let c: TimiCriteria = {
      ...emptyTimi(),
      positiveTroponin: "oui",
      stDeviation: "oui",
      ageGe65: "non",
      ge3RiskFactors: "non",
      knownCad50: "non",
      severeAngina: "non",
      asaRecent: "non",
    };
    expect(computeTimi(c).value).toBe(2);
    c = { ...c, positiveTroponin: "non", stDeviation: "non" };
    expect(computeTimi(c).value).toBe(0);
    c = { ...c, positiveTroponin: "inconnu" };
    expect(computeTimi(c).status).toBe("incomplet");
  });
});

describe("T-09 — saisi externe", () => {
  it("marque saisi_externe sans recalcul", () => {
    const r = externalScoreStub("GRACE", "https://example.org/grace");
    expect(r.status).toBe("saisi_externe");
    expect(r.value).toBeNull();
  });
});

describe("T-10 / T-13 / T-14 aorte", () => {
  it("T-10 ascendante 60 mm → potentiellement urgent", () => {
    const r = evaluateAorticSegment({
      segment: "ascendante",
      diameterMm: 60,
      datedAt: "2026-11-23",
    });
    expect(r.level).toBe("potentiellement_urgent");
    expect(r.score.rationale.join(" ")).toMatch(/imagerie|discussion/i);
    expect(r.score.rationale.join(" ")).not.toMatch(/chirurgie|indication/i);
  });

  it("T-13 surface/hauteur sans taille", () => {
    const r = computeAorticAreaHeight({
      segment: "ascendante",
      diameterMm: 45,
      heightM: null,
    });
    expect(r.status).toBe("incomplet");
    expect(r.missingInputs.join(" ")).toMatch(/taille/i);
  });

  it("T-14 croissance sans antérieur", () => {
    const r = evaluateAorticSegment({
      segment: "ascendante",
      diameterMm: 48,
      datedAt: "2026-11-23",
    });
    expect(r.growthMmPerYear).toBeNull();
    expect(r.score.rationale.join(" ")).toMatch(/non calculable/i);
  });
});

describe("T-15 facteurs conditionnels aorte (segments indépendants)", () => {
  it("évalue chaque segment séparément", () => {
    const all = evaluateAllSegments([
      { segment: "ascendante", diameterMm: 38, datedAt: "2026-11-23" },
      { segment: "descendante", diameterMm: 60, datedAt: "2026-11-23" },
    ]);
    expect(all.find((x) => x.segment === "ascendante")!.level).toBe("sous_seuil");
    expect(all.find((x) => x.segment === "descendante")!.level).toBe("potentiellement_urgent");
  });
});

describe("QTc / IMC / BSA / contexte", () => {
  it("QTc sans méthode → incomplet", () => {
    expect(computeQtc({ qtMs: 400, hrBpm: 60, method: null }).status).toBe("incomplet");
  });

  it("Fridericia calcule", () => {
    const r = computeQtc({ qtMs: 400, hrBpm: 60, method: "Fridericia" });
    expect(r.status).toBe("calcule");
    expect(r.value).toBeTruthy();
  });

  it("ePHT incomplet sans critères", () => {
    expect(computeEphtProbability({ trVmaxMs: null, otherSignsOfPh: null }).status).toBe(
      "incomplet",
    );
  });

  it("contexte masque les familles non applicables", () => {
    const f = scoreFamiliesForContext({
      hasAfibOrFlutter: false,
      plannedNoncardiacSurgery: true,
      suspectedAcs: false,
      hasAorticMeasure: false,
      echoDone: false,
    });
    expect(f.find((x) => x.familyId === "cha2ds2va")!.applicable).toBe(false);
    expect(f.find((x) => x.familyId === "rcri")!.applicable).toBe(true);
  });

  it("IMC/BSA refusent valeurs impossibles", () => {
    expect(computeImc(0, 70).status).toBe("non_applicable");
    expect(computeBsa(-1, 70).status).toBe("non_applicable");
  });

  it("HAS-BLED / RCRI inconnus → incomplet", () => {
    expect(
      computeHasbled({
        birthDate: "1950-01-01",
        actDate: "2026-01-01",
        criteria: {
          hta: "inconnu",
          renal: "non",
          liver: "non",
          stroke: "non",
          bleeding: "non",
          labileInr: "non",
          drugsOrAlcohol: "non",
        },
      }).status,
    ).toBe("incomplet");
    expect(
      computeRcri({
        highRiskSurgery: "inconnu",
        ischemicHeartDisease: "non",
        heartFailure: "non",
        cerebrovascularDisease: "non",
        insulinDependentDiabetes: "non",
        creatinineAbove177: "non",
      }).status,
    ).toBe("incomplet");
  });
});
