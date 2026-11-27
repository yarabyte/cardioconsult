import { describe, expect, it } from "vitest";
import { completenessFromDraft, computeRubricStates } from "./completeness";
import { emptyDraftData, type EncounterDraft } from "./draft-types";

function draft(partial: Partial<EncounterDraft["data"]> = {}): EncounterDraft {
  return {
    encounterId: "e1",
    patientId: "p1",
    status: "brouillon",
    actDate: "2026-11-24",
    version: 1,
    updatedAt: "2026-11-24T10:00:00.000Z",
    updatedBy: null,
    data: { ...emptyDraftData(), ...partial },
  };
}

describe("completeness UX Phase 1", () => {
  it("sépare identité et motif", () => {
    const d = draft({ identityNotes: "Notes", motif: null, history: null });
    const states = computeRubricStates(d, "identite");
    expect(states.identite).toBe("fait");
    expect(states.motif).toBe("vide");
  });

  it("conserve le ✓ sur la rubrique courante déjà remplie", () => {
    const d = draft({ motif: "Suivi IC", history: "…" });
    const states = computeRubricStates(d, "motif");
    expect(states.motif).toBe("fait");
  });

  it("marque synthèse et transmissions quand renseignés", () => {
    const d = draft({
      synthesis: "Décision : suivi 6 mois",
      transmissions: "Prévenir l'IDE du cabinet",
    });
    const { states, done } = completenessFromDraft(d, "synthese");
    expect(states.synthese).toBe("fait");
    expect(states.transmissions).toBe("fait");
    expect(done).toBeGreaterThanOrEqual(2);
  });
});
