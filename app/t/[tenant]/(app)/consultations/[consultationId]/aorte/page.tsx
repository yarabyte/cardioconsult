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

type Props = {
  params: Promise<{ tenant: string; consultationId: string }>;
};

export const metadata = { title: "Aorte" };

/** Route dédiée (lien ETT → Aorte) — même workspace que la rubrique `aorte`. */
export default async function ConsultationAortePage({ params }: Props) {
  const { tenant: slug, consultationId } = await params;
  const ctx = await requireTenantPage({ permission: "encounter.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const encounter = await getEncounterById(ctx.tenant.id, consultationId);
  if (!encounter) notFound();

  const patient = await getPatientForTenant(ctx.tenant.id, encounter.patientId);
  if (!patient) notFound();

  const draft = await ensureEncounterDraft(ctx.tenant.id, consultationId);
  if (!draft) notFound();

  if (draft.status === "brouillon") {
    await setEncounterRubric(ctx.tenant.id, consultationId, "aorte", ctx.user.id);
  }

  const [rx, scores] = await Promise.all([
    findPrescriptionForEncounter(ctx.tenant.id, consultationId),
    listClinicalScoresForEncounter(ctx.tenant.id, consultationId),
  ]);
  const { done, total, states } = completenessFromDraft(draft, "aorte", {
    hasOrdonnanceContent: ordonnanceStateFromRx(rx) === "fait",
    hasScores: scores.length > 0,
  });

  return (
    <ConsultationWorkspace
      consultationId={consultationId}
      rubrique="aorte"
      patient={patient}
      actDate={encounter.datedAt}
      motifLabel={encounter.motif ?? ""}
      initialDraft={draft}
      initialStates={states}
      initialDone={done}
      initialTotal={total}
    />
  );
}
