import { MockPatientRepository, MockTenantRepository } from "@/lib/data/repositories";
import { PatientsListClient } from "@/components/patients/PatientsListClient";

type Props = PageProps<"/t/[tenant]/patients">;

export const metadata = { title: "Patients" };

export default async function PatientsPage({ params, searchParams }: Props) {
  const { tenant: slug } = await params;
  const tenant = await MockTenantRepository.getBySlug(slug);
  if (!tenant) return null;

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const patients = await MockPatientRepository.list(tenant.id, q);

  return <PatientsListClient patients={patients} />;
}