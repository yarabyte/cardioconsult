import { PageHeader } from "@/components/layout/PageHeader";
import { PatientCreateForm } from "@/components/patients/PatientCreateForm";

export const metadata = { title: "Nouveau patient" };

export default function NouveauPatientPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Nouveau patient"
        description="Création d’un dossier cabinet — aucune suppression physique possible ensuite."
      />
      <PatientCreateForm />
    </div>
  );
}
