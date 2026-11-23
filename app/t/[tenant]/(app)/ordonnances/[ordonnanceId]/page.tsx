import { notFound } from "next/navigation";
import { MockDocumentRepository, MockPatientRepository } from "@/lib/data/repositories";
import { getDemoUser } from "@/lib/demo-user";
import { PrescriptionEditor } from "@/components/documents/PrescriptionEditor";

type Props = PageProps<"/t/[tenant]/ordonnances/[ordonnanceId]">;

export const metadata = { title: "Ordonnance" };

export default async function OrdonnancePage({ params }: Props) {
  const { ordonnanceId } = await params;
  const rx = await MockDocumentRepository.getPrescription(ordonnanceId);
  if (!rx) notFound();

  const patient = await MockPatientRepository.getById(rx.patientId);
  if (!patient) notFound();

  const user = await getDemoUser();

  return <PrescriptionEditor rx={rx} user={user} allergies={patient.allergies} />;
}