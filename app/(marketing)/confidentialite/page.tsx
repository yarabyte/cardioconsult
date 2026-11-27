import { Juriste, LegalPage } from "@/components/marketing/LegalPage";

export const metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        <Juriste>
          Responsable de traitement éditeur (comptes, facturation, support) vs sous-traitant pour
          les données de santé des cabinets (art. 28).
        </Juriste>
      </p>
      <p>
        <Juriste>
          Finalités, bases légales, durées, destinataires, transferts, droits des personnes.
        </Juriste>
      </p>
      <p>
        Cookies : l&apos;application tenant n&apos;utilise aucun cookie non essentiel. Sur ce site
        public, aucun bandeau n&apos;est affiché tant qu&apos;aucune mesure d&apos;audience non
        exemptée n&apos;est déployée.
      </p>
    </LegalPage>
  );
}
