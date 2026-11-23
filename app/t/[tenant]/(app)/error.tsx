"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="bg-card border-border mx-auto max-w-lg rounded-2xl border p-6 text-center">
      <h2 className="text-lg font-extrabold">Une erreur est survenue</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        L&apos;écran n&apos;a pas pu être affiché. Réessayez ou revenez au tableau de bord.
      </p>
      <Button type="button" className="mt-4" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}