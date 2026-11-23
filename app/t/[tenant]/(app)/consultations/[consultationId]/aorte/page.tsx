import { notFound } from "next/navigation";
import { MockEncounterRepository } from "@/lib/data/repositories";
import { getDemoUser } from "@/lib/demo-user";
import { RubricStepper } from "@/components/clinical/RubricStepper";
import { AortaAcknowledgePanel } from "@/components/clinical/AortaAcknowledgePanel";

type Props = PageProps<"/t/[tenant]/consultations/[consultationId]/aorte">;

export const metadata = { title: "Module Aorte" };

export default async function ConsultationAortePage({ params }: Props) {
  const { consultationId } = await params;
  const encounter = await MockEncounterRepository.getById(consultationId);
  if (!encounter) notFound();

  const user = await getDemoUser();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <RubricStepper consultationId={consultationId} currentSlug="aorte" />
      <div className="min-w-0 flex-1">
        <AortaAcknowledgePanel authorName={user.name} />
      </div>
    </div>
  );
}