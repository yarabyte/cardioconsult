import { ageAt, patientDisplayName } from "@/lib/format";
import type { EncounterDraft } from "@/lib/consultation/draft-types";
import { LAB_CODES } from "@/lib/exams/lab";
import type { SourceSnapshot } from "@/lib/documents/tiptap-types";

/** Construit un snapshot CR depuis le brouillon de consultation — champs vides restent null. */
export function snapshotFromDraft(input: {
  draft: EncounterDraft;
  patient: {
    firstName: string;
    lastName: string;
    birthDate: string | null;
    dossierNumber: string;
  };
  motif: string | null;
}): SourceSnapshot {
  const { draft, patient, motif } = input;
  const d = draft.data;
  const actDate = draft.actDate.slice(0, 10);
  const labs: Record<string, string | number | null> = {};
  for (const panel of d.labs) {
    for (const row of panel.rows) {
      if (row.value == null || row.value === "") continue;
      const meta = LAB_CODES.find((c) => c.code === row.code);
      const label = meta?.label ?? row.code;
      labs[label] =
        typeof row.value === "number" ? `${row.value} ${row.unit}`.trim() : String(row.value);
    }
  }

  return {
    capturedAt: new Date().toISOString(),
    encounterId: draft.encounterId,
    patientLabel: patientDisplayName(patient.firstName, patient.lastName),
    dossierNumber: patient.dossierNumber,
    birthDate: patient.birthDate,
    ageAtAct: patient.birthDate != null ? ageAt(patient.birthDate, draft.actDate) : null,
    actDate,
    motif: motif?.trim() || d.motif?.trim() || null,
    history: d.history?.trim() || null,
    clinicalExam: {
      tas: d.clinicalExam.tas,
      tad: d.clinicalExam.tad,
      fc: d.clinicalExam.fc,
      spo2: d.clinicalExam.spo2,
      weightKg: d.clinicalExam.weightKg,
      nyha: d.clinicalExam.nyha,
      auscultation: d.clinicalExam.auscultation,
    },
    ecg: {
      rythme: d.ecg.rythme,
      fc: d.ecg.fcBpm,
      qtc: d.ecg.qtcMs,
      qtcMethod: d.ecg.qtcMethod,
    },
    echo: {
      fevg: d.echo.fevg,
      fevgMethod: d.echo.fevgMethod,
      conclusion: d.echo.conclusion,
    },
    labs,
    scores: [],
    conclusion: null,
    conduite: null,
  };
}
