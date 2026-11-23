import Link from "next/link";
import { notFound } from "next/navigation";
import { MockEncounterRepository, MockPatientRepository } from "@/lib/data/repositories";
import { RubricStepper } from "@/components/clinical/RubricStepper";
import { rubricCompleteness } from "@/lib/consultation/rubrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ageAt, patientDisplayName } from "@/lib/format";

type Props = PageProps<"/t/[tenant]/consultations/[consultationId]/[rubrique]">;

export const metadata = { title: "Consultation guidée" };

export default async function ConsultationRubricPage({ params }: Props) {
  const { consultationId, rubrique } = await params;
  const encounter = await MockEncounterRepository.getById(consultationId);
  if (!encounter) notFound();

  const patient = await MockPatientRepository.getById(encounter.patientId);
  if (!patient) notFound();

  const { done, total } = rubricCompleteness();
  const age = ageAt(patient.birthDate, encounter.datedAt);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <RubricStepper consultationId={consultationId} currentSlug={rubrique} />
      <div className="min-w-0 flex-1 space-y-4">
        <ConsultationHeader patient={patient} age={age} encounter={encounter} done={done} total={total} />
        <ConsultationMain rubrique={rubrique} consultationId={consultationId} />
      </div>
    </div>
  );
}

function ConsultationHeader({
  patient,
  age,
  encounter,
  done,
  total,
}: {
  patient: NonNullable<Awaited<ReturnType<typeof MockPatientRepository.getById>>>;
  age: number;
  encounter: NonNullable<Awaited<ReturnType<typeof MockEncounterRepository.getById>>>;
  done: number;
  total: number;
}) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Consultation en cours</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {patientDisplayName(patient.firstName, patient.lastName)} · {age} ans · {patient.sex} · {encounter.motif}
      </p>
      <p className="text-primary mt-1 text-sm font-bold">
        {done} / {total} rubriques
      </p>
    </div>
  );
}

function ConsultationMain({ rubrique, consultationId }: { rubrique: string; consultationId: string }) {
  if (rubrique !== "echocardiographie") {
    return (
      <section className="bg-card border-border rounded-2xl border p-6 text-sm">
        <p className="font-bold">Rubrique « {rubrique} »</p>
        <p className="text-muted-foreground mt-2">Contenu stub — saisie à compléter dans une phase ultérieure.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">9 · Échocardiographie transthoracique</h2>
        <Button type="button" variant="outline">
          Appliquer un modèle « ETT normale »…
        </Button>
      </div>
      <fieldset className="border-border bg-card space-y-3 rounded-2xl border p-4">
        <legend className="px-1 text-sm font-extrabold">Ventricule gauche</legend>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Input defaultValue="58" aria-label="FEVG" />
          <Input defaultValue="54" aria-label="DTDVG mm" />
          <Input defaultValue="12" aria-label="Septum mm" />
        </div>
      </fieldset>
      <Textarea
        aria-label="Conclusion échographique"
        rows={4}
        defaultValue="VG non dilaté, FEVG conservée à 58 %. Dilatation aortique : voir module Aorte."
      />
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline">
          Enregistrer le brouillon
        </Button>
        <Button render={<Link href={`/consultations/${consultationId}/aorte`} />}>Aorte →</Button>
      </div>
    </section>
  );
}