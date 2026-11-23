import { MockHospitalRepository, MockTenantRepository } from "@/lib/data/repositories";
import { HospitalisationClient } from "@/components/hospitalisation/HospitalisationClient";

type Props = PageProps<"/t/[tenant]/hospitalisation">;

export const metadata = { title: "Hospitalisation" };

export default async function HospitalisationPage({ params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await MockTenantRepository.getBySlug(slug);
  if (!tenant) return null;

  const beds = await MockHospitalRepository.listBeds(tenant.id);
  return <HospitalisationClient beds={beds} />;
}