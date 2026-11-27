import { ErrorPage } from "@/components/errors/ErrorPage";
import { ROOT_DOMAIN } from "@/lib/tenant-host";

const marketingOrigin =
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : `https://${ROOT_DOMAIN}`;

export default function TenantNotFound() {
  return (
    <ErrorPage
      code="404"
      title="Cabinet introuvable"
      description="Ce sous-domaine ne correspond à aucun cabinet Cardio Soin. Vous pouvez créer le vôtre en quelques minutes — essai 30 jours, sans carte bancaire."
      actions={[
        {
          type: "link",
          href: `${marketingOrigin}/inscription`,
          label: "Créer un cabinet",
        },
        {
          type: "link",
          href: marketingOrigin,
          label: "Accueil Cardio Soin",
          variant: "outline",
        },
      ]}
    />
  );
}
