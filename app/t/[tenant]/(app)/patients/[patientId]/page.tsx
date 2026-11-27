import { notFound } from "next/navigation";
import { PatientDossierClient } from "@/components/patients/PatientDossierClient";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import {
  getLatestEncounterForPatient,
  getLatestOpenEncounterForPatient,
} from "@/server/consultation/service";
import { enqueueAuditRead, flushAuditOutbox } from "@/server/services/audit";
import { undismissSidebarDossier } from "@/server/services/patients/open-dossiers";
import { getPatientForTenant } from "@/server/services/patients/service";

type Props = {
  params: Promise<{ tenant: string; patientId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { patientId } = await params;
  return { title: `Dossier ${patientId}` };
}

export default async function PatientDossierPage({ params }: Props) {
  const { tenant: slug, patientId } = await params;
  const ctx = await requireTenantPage({ permission: "patient.read" });
  if (ctx.tenant.slug !== slug) notFound();

  const patient = await getPatientForTenant(ctx.tenant.id, patientId);
  if (!patient) notFound();

  await enqueueAuditRead(
    ctx.tenant.id,
    {
      action: "patient.open",
      entityType: "patient",
      entityId: patient.id,
      actorId: ctx.user.id,
      actorRole: ctx.role,
      outcome: "success",
    },
    ctx.db,
  );
  await flushAuditOutbox(ctx.tenant.id, ctx.db);
  // Réaffiche le dossier dans le sidebar s’il avait été retiré.
  try {
    await undismissSidebarDossier(ctx.tenant.id, ctx.user.id, patient.id);
  } catch {
    // Non bloquant.
  }

  let openEncounter: {
    id: string;
    datedAt: string;
    href: string;
  } | null = null;
  let latestEncounter: {
    id: string;
    datedAt: string;
    href: string;
  } | null = null;
  try {
    const open = await getLatestOpenEncounterForPatient(ctx.tenant.id, patient.id);
    if (open) {
      openEncounter = {
        id: open.id,
        datedAt: open.datedAt,
        href: open.href,
      };
    }
    const latest = await getLatestEncounterForPatient(ctx.tenant.id, patient.id);
    if (latest) {
      latestEncounter = {
        id: latest.id,
        datedAt: latest.datedAt,
        href: latest.href,
      };
    }
  } catch {
    // Ne pas faire échouer tout le dossier si la reprise est indisponible.
    openEncounter = null;
    latestEncounter = null;
  }

  return (
    <PatientDossierClient
      patient={patient}
      openEncounter={openEncounter}
      latestEncounter={latestEncounter}
    />
  );
}
