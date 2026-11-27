import { DPA_VERSION } from "@/lib/validation/inscription";
import { Juriste, LegalPage } from "@/components/marketing/LegalPage";

export const metadata = { title: "Contrat de sous-traitance" };

export default function SousTraitancePage() {
  return (
    <LegalPage title={`Contrat de sous-traitance art. 28 (v. ${DPA_VERSION})`}>
      <p>
        <Juriste>
          Instructions documentées du responsable de traitement (cabinet / établissement), mesures
          de sécurité, sous-traitance ultérieure, assistance violations, audit, fin de contrat et
          restitution / effacement.
        </Juriste>
      </p>
      <p>
        L&apos;acceptation horodatée et versionnée est recueillie à l&apos;inscription du cabinet.
      </p>
    </LegalPage>
  );
}
