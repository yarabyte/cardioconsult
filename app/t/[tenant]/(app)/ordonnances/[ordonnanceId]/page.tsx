import { notFound } from "next/navigation";
import { PrescriptionEditor } from "@/components/documents/PrescriptionEditor";
import type { DemoUser } from "@/types/domain";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { getPrescriptionSafetyLabs } from "@/server/services/labs/latest";
import { getPrescription } from "@/server/services/prescriptions/lifecycle";
import { getPatientForTenant } from "@/server/services/patients/service";
import { patientDisplayName } from "@/lib/format";

type Props = {
  params: Promise<{ tenant: string; ordonnanceId: string }>;
};

export const metadata = { title: "Ordonnance" };

export default async function OrdonnancePage({ params }: Props) {
  const { tenant: slug, ordonnanceId } = await params;
  const ctx = await requireTenantPage({ permission: "prescription.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const rx = await getPrescription(ctx.tenant.id, ordonnanceId);
  if (!rx) notFound();

  const patient = await getPatientForTenant(ctx.tenant.id, rx.patientId);
  if (!patient) notFound();

  const labs = await getPrescriptionSafetyLabs(ctx.tenant.id, patient.id, rx.encounterId ?? null);

  const user: DemoUser = {
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.role,
    isTenantAdmin: ctx.user.isTenantAdmin,
    initials: ctx.user.name
      .split(/\s+/)
      .map((p) => p.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    tenantId: ctx.tenant.id,
  };

  return (
    <PrescriptionEditor
      rx={rx}
      user={user}
      allergies={patient.allergies}
      patientLabel={patientDisplayName(patient.firstName, patient.lastName)}
      birthDate={patient.birthDate}
      dfg={labs.dfg}
      kaliemie={labs.kaliemie}
      pregnancy={null}
    />
  );
}
