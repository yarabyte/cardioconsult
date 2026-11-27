import { ErrorPage } from "@/components/errors/ErrorPage";

export const metadata = { title: "Page introuvable" };

export default function RootNotFound() {
  return (
    <ErrorPage
      code="404"
      title="Page introuvable"
      description="Cette adresse n’existe pas, a été déplacée, ou n’est pas accessible depuis cet espace (cabinet, console ou site public)."
      actions={[
        { type: "link", href: "/", label: "Accueil Cardio Soin" },
        {
          type: "link",
          href: "/t/dr-martin/connexion",
          label: "Connexion cabinet (démo)",
          variant: "outline",
        },
      ]}
    />
  );
}
