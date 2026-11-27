import { AuditJournalClient } from "@/components/admin/AuditJournalClient";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { checkAuditIntegrity, listAuditEvents } from "@/server/services/audit";

type Props = { params: Promise<{ tenant: string }> };

export const metadata = { title: "Sécurité & journal d'audit" };

export default async function SecuriteAuditPage({ params }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "audit.read" });
  if (ctx.tenant.slug !== slug) return null;

  const events = await listAuditEvents(ctx.tenant.id, { limit: 50 }, ctx.db);
  const integrity = await checkAuditIntegrity(ctx.tenant.id, ctx.db);

  return (
    <AuditJournalClient
      initialRows={events.map((e) => ({
        id: e.id,
        atLabel: e.at.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        actorId: e.actorId ?? "—",
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        outcome: e.outcome,
      }))}
      integrityOk={integrity.ok}
      integrityCount={integrity.count}
    />
  );
}
