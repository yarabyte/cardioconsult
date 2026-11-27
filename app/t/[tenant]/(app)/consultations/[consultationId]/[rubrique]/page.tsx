import { notFound } from "next/navigation";
import { ConsultationWorkspace } from "@/components/clinical/ConsultationWorkspace";
import { completenessFromDraft, ordonnanceStateFromRx } from "@/lib/consultation/completeness";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import {
  ensureEncounterDraft,
  getEncounterById,
  setEncounterRubric,
} from "@/server/consultation/service";
import { getPatientForTenant } from "@/server/services/patients/service";
import { findPrescriptionForEncounter } from "@/server/services/prescriptions/lifecycle";
import { listClinicalScoresForEncounter } from "@/server/services/clinical/scores";
import { isClinicalFlagEnabled } from "@/server/services/clinical/flags";

type Props = {
  params: Promise<{ tenant: string; consultationId: string; rubrique: string }>;
};

export const metadata = { title: "Consultation guidée" };

export default async function ConsultationRubricPage({ params }: Props) {
  const { tenant: slug, consultationId, rubrique } = await params;
  const ctx = await requireTenantPage({ permission: "encounter.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const encounter = await getEncounterById(ctx.tenant.id, consultationId);
  if (!encounter) notFound();

  const patient = await getPatientForTenant(ctx.tenant.id, encounter.patientId);
  if (!patient) notFound();

  const draft = await ensureEncounterDraft(ctx.tenant.id, consultationId);
  if (!draft) notFound();

  // Complétude / « courant » depuis l’URL ; mémoriser pour reprise.
  if (draft.status === "brouillon") {
    await setEncounterRubric(ctx.tenant.id, consultationId, rubrique, ctx.user.id);
  }

  const [rx, scores, examOrdersEnabled] = await Promise.all([
    findPrescriptionForEncounter(ctx.tenant.id, consultationId),
    listClinicalScoresForEncounter(ctx.tenant.id, consultationId),
    isClinicalFlagEnabled(ctx.tenant.id, "clinical.examOrders"),
  ]);
  const { done, total, states } = completenessFromDraft(draft, rubrique, {
    hasOrdonnanceContent: ordonnanceStateFromRx(rx) === "fait",
    hasScores: scores.length > 0,
  });

  return (
    <ConsultationWorkspace
      consultationId={consultationId}
      rubrique={rubrique}
      patient={patient}
      actDate={encounter.datedAt}
      motifLabel={encounter.motif ?? ""}
      initialDraft={draft}
      initialStates={states}
      initialDone={done}
      initialTotal={total}
      examOrdersEnabled={examOrdersEnabled}
    />
  );
}
