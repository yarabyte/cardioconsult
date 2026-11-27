import { InfirmiereDashboardClient } from "@/components/infirmiere/InfirmiereDashboardClient";
import { listAgenda } from "@/server/agenda/service";
import { requireTenantPage } from "@/server/auth/require-tenant-page";

export const metadata = { title: "Accueil cabinet" };

export default async function InfirmierePage() {
  const ctx = await requireTenantPage({ permission: "appointment.read" });
  const items = await listAgenda(ctx.tenant.id, { view: "day", anchor: "2026-11-23" });
  return <InfirmiereDashboardClient tenantId={ctx.tenant.id} initialItems={items} />;
}
