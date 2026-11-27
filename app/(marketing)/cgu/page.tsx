import { CGU_VERSION } from "@/lib/validation/inscription";
import { Juriste, LegalPage } from "@/components/marketing/LegalPage";

export const metadata = { title: "Conditions générales d'utilisation" };

export default function CguPage() {
  return (
    <LegalPage title={`Conditions générales d'utilisation (v. ${CGU_VERSION})`}>
      <p>
        <Juriste>Objet, définitions, conditions d&apos;accès au service SaaS multi-tenant.</Juriste>
      </p>
      <p>
        <Juriste>
          Obligations du client (comptes nominatifs, MFA, pas de données hors finalité).
        </Juriste>
      </p>
      <p>
        <Juriste>
          Disponibilité, maintenance, responsabilités, résiliation, droit applicable.
        </Juriste>
      </p>
    </LegalPage>
  );
}
