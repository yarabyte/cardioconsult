import { Juriste, LegalPage } from "@/components/marketing/LegalPage";

export const metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <p>
        <Juriste>Éditeur du site : raison sociale, forme, capital, RCS, siège.</Juriste>
      </p>
      <p>
        <Juriste>
          Directeur de la publication ; contact ; hébergeur certifié HDS (nom, adresse).
        </Juriste>
      </p>
      <p>
        Cardio Soin est un logiciel d&apos;aide à la documentation clinique. Les scores et alertes
        ne constituent pas une décision médicale.
      </p>
    </LegalPage>
  );
}
