"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/errors/ErrorPage";

export default function TenantAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ne pas journaliser de données cliniques.
    console.error(error.digest ?? "tenant-app-error");
  }, [error]);

  return (
    <ErrorPage
      code="Erreur"
      title="Une erreur est survenue"
      description="L’écran n’a pas pu être affiché. Réessayez ou revenez au tableau de bord."
      requestId={error.digest}
      actions={[
        {
          type: "button",
          label: "Réessayer",
          onClick: () => {
            // Rechargement complet : évite les Server Actions obsolètes après HMR.
            reset();
            window.location.reload();
          },
        },
        {
          type: "link",
          href: "/tableau-de-bord",
          label: "Tableau de bord",
          variant: "outline",
        },
      ]}
    />
  );
}
