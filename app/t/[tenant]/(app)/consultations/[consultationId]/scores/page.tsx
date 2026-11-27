import { notFound } from "next/navigation";
import { RubricStepper } from "@/components/clinical/RubricStepper";
import { ScoresConsultationClient } from "@/components/clinical/ScoresConsultationClient";
import { completenessFromDraft, ordonnanceStateFromRx } from "@/lib/consultation/completeness";
import { ageAt } from "@/lib/format";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import {
  ensureEncounterDraft,
  getEncounterById,
  setEncounterRubric,
} from "@/server/consultation/service";
import { isClinicalFlagEnabled } from "@/server/services/clinical/flags";
import { listClinicalScoresForEncounter } from "@/server/services/clinical/scores";
import { getPatientForTenant } from "@/server/services/patients/service";
import { findPrescriptionForEncounter } from "@/server/services/prescriptions/lifecycle";

type Props = {
  params: Promise<{ tenant: string; consultationId: string }>;
};

export const metadata = { title: "Scores" };

export default async function ConsultationScoresPage({ params }: Props) {
  const { tenant: slug, consultationId } = await params;
  const ctx = await requireTenantPage({ permission: "score.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const encounter = await getEncounterById(ctx.tenant.id, consultationId);
  if (!encounter) notFound();

  const patient = await getPatientForTenant(ctx.tenant.id, encounter.patientId);
  if (!patient) notFound();

  const draft = await ensureEncounterDraft(ctx.tenant.id, consultationId);
  if (!draft) notFound();

  if (draft.status === "brouillon") {
    await setEncounterRubric(ctx.tenant.id, consultationId, "scores", ctx.user.id);
  }

  const scoresEnabled = await isClinicalFlagEnabled(ctx.tenant.id, "clinical.scores");
  const [persistedScores, rx] = await Promise.all([
    listClinicalScoresForEncounter(ctx.tenant.id, consultationId),
    findPrescriptionForEncounter(ctx.tenant.id, consultationId),
  ]);
  const { done, total, states } = completenessFromDraft(draft, "scores", {
    hasOrdonnanceContent: ordonnanceStateFromRx(rx) === "fait",
    hasScores: persistedScores.length > 0,
  });
  const actDate = encounter.datedAt.slice(0, 10);
  const age = ageAt(patient.birthDate, actDate);
  const closed = draft.status === "cloturee";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <RubricStepper
        consultationId={consultationId}
        currentSlug="scores"
        states={states}
        done={done}
        total={total}
      />
      <ScoresConsultationClient
        consultationId={consultationId}
        patient={patient}
        ageLabel={`${age} ans (à la date de l'acte)`}
        actDate={actDate}
        closed={closed}
        draftUpdatedAt={draft.updatedAt}
        draftVersion={draft.version}
        scoresEnabled={scoresEnabled}
        initialScores={persistedScores}
      />
    </div>
  );
}
