"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/errors/ErrorPage";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Identifiant technique uniquement — pas de stack ni de données cliniques.
    console.error(error.digest ?? "root-error");
  }, [error]);

  return (
    <ErrorPage
      code="Erreur"
      title="Une erreur est survenue"
      description="L’écran n’a pas pu être affiché. Vous pouvez réessayer ou revenir à l’accueil. Aucune donnée de santé n’est affichée ici."
      requestId={error.digest}
      actions={[
        { type: "button", label: "Réessayer", onClick: reset },
        { type: "link", href: "/", label: "Accueil", variant: "outline" },
      ]}
    />
  );
}
