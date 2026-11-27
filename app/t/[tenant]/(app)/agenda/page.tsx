import { AgendaClient } from "@/components/agenda/AgendaClient";
import { listAgenda, listAppointmentKinds, listWaitlist } from "@/server/agenda/service";
import { requireTenantPage } from "@/server/auth/require-tenant-page";

type Props = { params: Promise<{ tenant: string }> };

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ params }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "appointment.read" });
  if (ctx.tenant.slug !== slug) return null;

  const [items, waitlist, kinds] = await Promise.all([
    listAgenda(ctx.tenant.id, { view: "day", anchor: "2026-11-23" }),
    listWaitlist(ctx.tenant.id),
    listAppointmentKinds(ctx.tenant.id),
  ]);

  return (
    <AgendaClient
      tenantId={ctx.tenant.id}
      initialItems={items}
      initialWaitlist={waitlist}
      kinds={kinds}
    />
  );
}
