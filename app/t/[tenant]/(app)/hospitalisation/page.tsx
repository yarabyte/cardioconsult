import { notFound } from "next/navigation";
import { HospitalisationClient } from "@/components/hospitalisation/HospitalisationClient";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import {
  getHospitalisationModule,
  isHospitalisationEnabled,
} from "@/server/hospitalisation/module";
import { listBedsOnDb } from "@/server/hospitalisation/service";

type Props = PageProps<"/t/[tenant]/hospitalisation">;

export const metadata = { title: "Hospitalisation" };

export default async function HospitalisationPage({ params }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "patient.read" });
  if (ctx.tenant.slug !== slug) notFound();

  const hospitalisationModule = await getHospitalisationModule(ctx.tenant.id);
  const enabled = await isHospitalisationEnabled(ctx.tenant.id);
  const beds = enabled ? await listBedsOnDb(ctx.db) : [];

  return (
    <HospitalisationClient initialBeds={beds} module={hospitalisationModule} disabled={!enabled} />
  );
}
