import { notFound, redirect } from "next/navigation";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { getOrCreatePrescriptionForEncounter } from "@/server/services/prescriptions/lifecycle";
import { recordAuditEvent } from "@/server/services/audit";

type Props = {
  params: Promise<{ tenant: string; consultationId: string }>;
};

export const metadata = { title: "Ordonnance" };

export default async function ConsultationOrdonnancePage({ params }: Props) {
  const { tenant: slug, consultationId } = await params;
  const ctx = await requireTenantPage({ permission: "prescription.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const result = await getOrCreatePrescriptionForEncounter(
    ctx.tenant.id,
    consultationId,
    ctx.user.id,
  );
  if (!result.ok) notFound();

  await recordAuditEvent(ctx.tenant.id, {
    action: "prescription.open",
    entityType: "prescription",
    entityId: result.rx.id,
    actorId: ctx.user.id,
    actorRole: ctx.role,
  });

  redirect(`/ordonnances/${result.rx.id}`);
}
