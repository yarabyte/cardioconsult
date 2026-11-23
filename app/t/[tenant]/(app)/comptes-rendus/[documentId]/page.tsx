import { notFound } from "next/navigation";
import { MockDocumentRepository, MockPatientRepository } from "@/lib/data/repositories";
import { getDemoUser } from "@/lib/demo-user";
import { CompteRenduWorkflow } from "@/components/documents/CompteRenduWorkflow";

type Props = PageProps<"/t/[tenant]/comptes-rendus/[documentId]">;

export const metadata = { title: "Compte rendu" };

export default async function CompteRenduPage({ params }: Props) {
  const { documentId } = await params;
  const doc = await MockDocumentRepository.getById(documentId);
  if (!doc) notFound();

  const patient = await MockPatientRepository.getById(doc.patientId);
  if (!patient) notFound();

  const user = await getDemoUser();

  return <CompteRenduWorkflow doc={doc} user={user} />;
}