import { notFound, redirect } from "next/navigation";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { getOrCreateCompteRenduForEncounter } from "@/server/services/documents/lifecycle";
import { recordAuditEvent } from "@/server/services/audit";

type Props = {
  params: Promise<{ tenant: string; consultationId: string }>;
};

export const metadata = { title: "Compte rendu" };

export default async function ConsultationCompteRenduPage({ params }: Props) {
  const { tenant: slug, consultationId } = await params;
  const ctx = await requireTenantPage({ permission: "document.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const result = await getOrCreateCompteRenduForEncounter(
    ctx.tenant.id,
    consultationId,
    ctx.user.id,
  );
  if (!result.ok) notFound();

  await recordAuditEvent(ctx.tenant.id, {
    action: "document.open",
    entityType: "document",
    entityId: result.doc.id,
    actorId: ctx.user.id,
    actorRole: ctx.role,
  });

  redirect(`/comptes-rendus/${result.doc.id}`);
}
