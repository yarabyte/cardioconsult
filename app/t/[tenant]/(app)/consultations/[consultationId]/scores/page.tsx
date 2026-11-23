import { notFound } from "next/navigation";
import { MockEncounterRepository, MockPatientRepository } from "@/lib/data/repositories";
import { RubricStepper } from "@/components/clinical/RubricStepper";
import { Cha2ds2vaPanel } from "@/components/clinical/Cha2ds2vaPanel";
import { patientDisplayName } from "@/lib/format";

type Props = PageProps<"/t/[tenant]/consultations/[consultationId]/scores">;

export const metadata = { title: "Scores" };

export default async function ConsultationScoresPage({ params }: Props) {
  const { consultationId } = await params;
  const encounter = await MockEncounterRepository.getById(consultationId);
  if (!encounter) notFound();

  const patient = await MockPatientRepository.getById(encounter.patientId);
  if (!patient) notFound();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <RubricStepper consultationId={consultationId} currentSlug="scores" />
      <div className="min-w-0 flex-1">
        <Cha2ds2vaPanel
          birthDate={patient.birthDate}
          actDate={encounter.datedAt}
          patientName={patientDisplayName(patient.firstName, patient.lastName)}
        />
      </div>
    </div>
  );
}