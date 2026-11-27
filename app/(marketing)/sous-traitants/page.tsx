import Link from "next/link";
import { Juriste, LegalPage } from "@/components/marketing/LegalPage";

export const metadata = { title: "Liste des sous-traitants" };

export default function SousTraitantsPage() {
  return (
    <LegalPage title="Liste des sous-traitants">
      <p>
        Inventaire technique maintenu dans{" "}
        <code className="text-sm">docs/conformite/sous-traitants.md</code>. Prestataires non
        définitifs.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <Juriste>Hébergeur HDS (infra, bases, sauvegardes).</Juriste>
        </li>
        <li>
          <Juriste>Stockage objet S3-compatible (même périmètre HDS).</Juriste>
        </li>
        <li>
          <Juriste>PSP paiement (hors données de santé).</Juriste>
        </li>
        <li>
          <Juriste>E-mail transactionnel (minimisation stricte).</Juriste>
        </li>
      </ul>
      <p className="mt-4">
        Voir aussi le{" "}
        <Link href="/sous-traitance" className="text-primary font-semibold">
          contrat de sous-traitance
        </Link>
        .
      </p>
    </LegalPage>
  );
}
