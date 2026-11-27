import { ErrorPage } from "@/components/errors/ErrorPage";

export default function TenantAppNotFound() {
  return (
    <ErrorPage
      code="404"
      title="Page introuvable"
      description="Cette ressource n’existe pas dans ce cabinet, ou votre rôle n’y a pas accès."
      actions={[
        { type: "link", href: "/tableau-de-bord", label: "Tableau de bord" },
        { type: "link", href: "/", label: "Accueil Cardio Soin", variant: "outline" },
      ]}
    />
  );
}
