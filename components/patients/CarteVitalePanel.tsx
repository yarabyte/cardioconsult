"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readCarteVitaleAction } from "@/server/actions/vitale";
import { cn } from "@/lib/utils";

export const VITALE_UNAVAILABLE_DEFAULT =
  "Carte Vitale / télétransmission non disponible — aucun connecteur homologué n’est branché. Saisie manuelle obligatoire.";

type CarteVitalePanelProps = {
  className?: string;
  /** Affiche un libellé compact (accueil IDE). */
  compact?: boolean;
};

/**
 * Bloc T-18 — tentative de lecture via SesamVitaleAdapter (NotAvailable).
 * Aucun préremplissage tant que le connecteur n’est pas homologué.
 */
export function CarteVitalePanel({ className, compact = false }: CarteVitalePanelProps) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState(VITALE_UNAVAILABLE_DEFAULT);

  function readVitale() {
    start(async () => {
      const r = await readCarteVitaleAction();
      if (!r.ok) {
        const msg = r.error.message || VITALE_UNAVAILABLE_DEFAULT;
        setMessage(msg);
        toast.message(msg);
        return;
      }
      toast.message("Identité Carte Vitale reçue — saisie à confirmer.");
    });
  }

  return (
    <div
      className={cn(
        "border-border bg-muted/40 rounded-xl border p-3",
        compact && "p-2.5",
        className,
      )}
    >
      <p className={cn("font-bold", compact ? "text-xs" : "text-sm")}>
        Carte Vitale / télétransmission
      </p>
      <p
        className={cn("text-muted-foreground mt-1", compact ? "text-[11px]" : "text-xs")}
        aria-live="polite"
      >
        {message}
      </p>
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        className="mt-3"
        disabled={pending}
        onClick={readVitale}
      >
        {pending ? "Lecture…" : "Lire la Carte Vitale"}
      </Button>
    </div>
  );
}
