import { ErrorPage } from "@/components/errors/ErrorPage";

export default function TenantAuthNotFound() {
  return (
    <ErrorPage
      code="404"
      title="Page introuvable"
      description="Cette page de connexion n’existe pas. Revenez à l’écran d’authentification du cabinet."
      actions={[
        { type: "link", href: "/connexion", label: "Connexion" },
        { type: "link", href: "/", label: "Accueil Cardio Soin", variant: "outline" },
      ]}
    />
  );
}
