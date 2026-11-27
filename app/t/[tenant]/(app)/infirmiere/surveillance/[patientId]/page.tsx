import { notFound } from "next/navigation";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { loadSurveillanceOnDb } from "@/server/hospitalisation/service";

type Props = PageProps<"/t/[tenant]/infirmiere/surveillance/[patientId]">;

export const metadata = { title: "Surveillance" };

export default async function SurveillancePage({ params }: Props) {
  const { tenant: slug, patientId } = await params;
  const ctx = await requireTenantPage({ permission: "vitals.write" });
  if (ctx.tenant.slug !== slug) notFound();

  const payload = await loadSurveillanceOnDb(ctx.db, patientId);
  if (!payload.patientId || !payload.label) notFound();

  const { VitalsSurveillanceClient } =
    await import("@/components/infirmiere/VitalsSurveillanceClient");

  return (
    <VitalsSurveillanceClient
      patientId={payload.patientId}
      patientLabel={payload.label}
      stayId={payload.stayId}
      initialActive={payload.active}
      initialAll={payload.all}
      initialFluids={payload.fluids}
      initialTransmissions={payload.transmissions}
    />
  );
}
