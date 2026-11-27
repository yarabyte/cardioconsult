"use client";

import { useState } from "react";
import { PatientContextBar, type AutosaveStatus } from "@/components/clinical/PatientContextBar";
import { RubricNav } from "@/components/clinical/RubricNav";
import { ScoresWorkspace } from "@/components/clinical/ScoresWorkspace";
import type { PersistedClinicalScore } from "@/server/services/clinical/scores";
import type { PatientView } from "@/server/services/patients/service";
import { patientDisplayName } from "@/lib/format";

export function ScoresConsultationClient({
  consultationId,
  patient,
  ageLabel,
  actDate,
  closed,
  draftUpdatedAt,
  draftVersion,
  scoresEnabled,
  initialScores,
}: {
  consultationId: string;
  patient: PatientView;
  ageLabel: string;
  actDate: string;
  closed: boolean;
  draftUpdatedAt: string;
  draftVersion: number;
  scoresEnabled: boolean;
  initialScores: PersistedClinicalScore[];
}) {
  const [autosave, setAutosave] = useState<AutosaveStatus>(closed ? "idle" : "saved");
  const [savedAt, setSavedAt] = useState<string | null>(draftUpdatedAt);

  return (
    <div className="min-w-0 flex-1 space-y-4">
      <PatientContextBar
        patientId={patient.id}
        patientLabel={patientDisplayName(patient.firstName, patient.lastName)}
        ageLabel={ageLabel}
        sex={patient.sex}
        allergies={patient.allergies}
        closed={closed}
        autosave={autosave}
        savedAt={savedAt}
        version={draftVersion}
      />
      <ScoresWorkspace
        encounterId={consultationId}
        patientId={patient.id}
        birthDate={patient.birthDate}
        actDate={actDate}
        patientName={patientDisplayName(patient.firstName, patient.lastName)}
        scoresEnabled={scoresEnabled}
        readOnly={closed}
        initialScores={initialScores}
        onAutosaveChange={(status, at) => {
          setAutosave(status);
          if (at) setSavedAt(at);
        }}
      />
      <RubricNav consultationId={consultationId} currentSlug="scores" />
    </div>
  );
}
