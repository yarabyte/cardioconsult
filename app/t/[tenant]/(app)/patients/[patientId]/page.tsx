import { notFound } from "next/navigation";
import { MockPatientRepository, MockTenantRepository } from "@/lib/data/repositories";
import { PatientDossierClient } from "@/components/patients/PatientDossierClient";

type Props = PageProps<"/t/[tenant]/patients/[patientId]">;

export async function generateMetadata({ params }: Props) {
  const { patientId } = await params;
  const patient = await MockPatientRepository.getById(patientId);
  return { title: patient ? `Dossier ${patient.id}` : "Patient" };
}

export default async function PatientDossierPage({ params }: Props) {
  const { tenant: slug, patientId } = await params;
  const tenant = await MockTenantRepository.getBySlug(slug);
  const patient = await MockPatientRepository.getById(patientId);

  if (!tenant || !patient || patient.tenantId !== tenant.id) notFound();

  return <PatientDossierClient patient={patient} />;
}