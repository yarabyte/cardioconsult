import { notFound } from "next/navigation";
import { CompteRenduWorkflow } from "@/components/documents/CompteRenduWorkflow";
import type { DemoUser } from "@/types/domain";
import { patientDisplayName } from "@/lib/format";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { getDocument } from "@/server/services/documents/lifecycle";
import { getPatientForTenant } from "@/server/services/patients/service";

type Props = {
  params: Promise<{ tenant: string; documentId: string }>;
};

export const metadata = { title: "Compte rendu" };

export default async function CompteRenduPage({ params }: Props) {
  const { tenant: slug, documentId } = await params;
  const ctx = await requireTenantPage({ permission: "document.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const doc = await getDocument(ctx.tenant.id, documentId);
  if (!doc) notFound();

  const patient = await getPatientForTenant(ctx.tenant.id, doc.patientId);
  if (!patient) notFound();

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
    <CompteRenduWorkflow
      initial={doc}
      user={user}
      allergies={patient.allergies}
      patientLabel={patientDisplayName(patient.firstName, patient.lastName)}
    />
  );
}
