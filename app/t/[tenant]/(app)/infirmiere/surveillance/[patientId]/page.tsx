import { notFound } from "next/navigation";
import { MockVitalsRepository } from "@/lib/data/repositories";

type Props = PageProps<"/t/[tenant]/infirmiere/surveillance/[patientId]">;

export const metadata = { title: "Surveillance" };

const LABELS: Record<string, string> = {
  "hosp-arnaud": "M. Arnaud · décompensation IC",
  "CC-000184": "J. Dupont · suivi",
  "CC-000231": "R. Lefèvre · ETT",
  "CC-000412": "M. Benali · préop",
  "CC-000097": "A. Girard · FA",
};

export default async function SurveillancePage({ params }: Props) {
  const { patientId } = await params;
  const vitals = await MockVitalsRepository.listByPatient(patientId);
  const label = LABELS[patientId];
  if (!label) notFound();

  const { VitalsSurveillanceClient } = await import("@/components/infirmiere/VitalsSurveillanceClient");

  return <VitalsSurveillanceClient patientLabel={label} initial={vitals} />;
}