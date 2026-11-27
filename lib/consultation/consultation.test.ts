import { describe, expect, it } from "vitest";
import { ageAt } from "@/lib/format";
import { computeBsa } from "@/lib/clinical/bsa";
import { computeImc } from "@/lib/clinical/imc";
import { buildReportExcerpt, completenessFromDraft, ordonnanceStateFromRx } from "./completeness";
import { emptyDraftData, type EncounterDraft } from "./draft-types";
import { consultationWorkspaceHref, decideStartOrResume } from "./resume";
import { isEncounterClosedStatus, mergeDraftData } from "@/server/consultation/service";

function draft(partial?: Partial<EncounterDraft["data"]>): EncounterDraft {
  return {
    encounterId: "enc-1",
    patientId: "p1",
    status: "brouillon",
    actDate: "2020-06-15",
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    data: { ...emptyDraftData(), ...partial },
  };
}

describe("T-02 — pas de « normal » si champs vides", () => {
  it("extrait de rapport vide sans phrase normal", () => {
    const text = buildReportExcerpt(draft());
    expect(text).toBe("");
    expect(text.toLowerCase()).not.toContain("normal");
  });

  it("n'invente pas d'auscultation normale", () => {
    const text = buildReportExcerpt(
      draft({ motif: "Suivi", clinicalExam: { ...emptyDraftData().clinicalExam } }),
    );
    expect(text.toLowerCase()).not.toMatch(/auscultation.*normal/);
  });
});

describe("T-04 — IMC / BSA", () => {
  it("calcule IMC et BSA Mosteller", () => {
    const imc = computeImc(1.7, 70);
    expect(imc.status).toBe("calcule");
    expect(imc.value).toBe(24.2);
    const bsa = computeBsa(1.7, 70);
    expect(bsa.status).toBe("calcule");
    expect(bsa.value).toBeTruthy();
  });

  it("refuse taille 0 / négatif", () => {
    expect(computeImc(0, 70).status).toBe("non_applicable");
    expect(computeBsa(-1, 70).status).toBe("non_applicable");
  });
});

describe("âge à la date de l'acte", () => {
  it("calcule l'âge pour une consultation antidatée", () => {
    expect(ageAt("1959-03-14", "2020-06-15")).toBe(61);
    expect(ageAt("1959-03-14", "2026-11-23")).toBe(67);
  });
});

describe("complétude serveur", () => {
  it("rubriques vides → complétude basse", () => {
    const c = completenessFromDraft(draft(), "motif");
    expect(c.states.motif).toBe("courant");
    expect(c.states.examen).toBe("vide");
  });

  it("ordonnance hors brouillon → fait si lignes ou validée", () => {
    const empty = completenessFromDraft(draft(), "synthese");
    expect(empty.states.ordonnance).toBe("vide");

    const withLines = completenessFromDraft(draft(), "synthese", {
      hasOrdonnanceContent: true,
    });
    expect(withLines.states.ordonnance).toBe("fait");
  });
});

describe("ordonnanceStateFromRx", () => {
  it("marque fait seulement avec contenu ou statut validé", () => {
    expect(ordonnanceStateFromRx(null)).toBe("vide");
    expect(ordonnanceStateFromRx({ status: "brouillon", lines: [] })).toBe("vide");
    expect(ordonnanceStateFromRx({ status: "brouillon", lines: [{}] })).toBe("fait");
    expect(ordonnanceStateFromRx({ status: "valide", lines: [] })).toBe("fait");
  });
});

describe("fusion brouillon consultation", () => {
  it("conserve les sections non patchées", () => {
    const base = emptyDraftData();
    base.motif = "Suivi IC";
    const next = mergeDraftData(base, { clinicalExam: { ...base.clinicalExam, tas: 130 } });
    expect(next.motif).toBe("Suivi IC");
    expect(next.clinicalExam.tas).toBe(130);
  });
});

describe("reprise consultation", () => {
  it("reprend l'en_cours existant (href rubrique mémorisée)", () => {
    expect(decideStartOrResume({ open: { id: "enc-1", rubric: "echocardiographie" } })).toEqual({
      mode: "resume",
      encounterId: "enc-1",
      href: "/consultations/enc-1/echocardiographie",
    });
  });

  it("crée une nouvelle consultation si aucune ouverte", () => {
    expect(decideStartOrResume({ open: null })).toEqual({ mode: "create" });
  });

  it("crée si forceNew malgré une ouverte", () => {
    expect(
      decideStartOrResume({
        open: { id: "enc-1", rubric: "motif" },
        forceNew: true,
      }),
    ).toEqual({ mode: "create" });
  });

  it("construit l'URL workspace avec rubrique par défaut", () => {
    expect(consultationWorkspaceHref("enc-9")).toBe("/consultations/enc-9/identite");
    expect(consultationWorkspaceHref("enc-9", "  ")).toBe("/consultations/enc-9/identite");
  });
});

describe("clôture — verrouillage brouillon", () => {
  it("termine / cloturee → consultation fermée (save doit être refusé)", () => {
    expect(isEncounterClosedStatus("termine")).toBe(true);
    expect(isEncounterClosedStatus("cloturee")).toBe(true);
    expect(isEncounterClosedStatus("en_cours")).toBe(false);
    expect(isEncounterClosedStatus("a_venir")).toBe(false);
  });
});
