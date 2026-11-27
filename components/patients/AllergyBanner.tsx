import { AlertTriangle } from "lucide-react";

/** Bandeau allergies — visible partout où le patient est affiché. */
export function AllergyBanner({ allergies }: { allergies: string[] }) {
  if (!allergies.length) return null;
  return (
    <div
      role="status"
      className="border-destructive/50 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-bold"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p>Allergie(s) : {allergies.join(" · ")}</p>
        <p className="text-destructive/80 mt-0.5 text-xs font-semibold">
          Vérifier avant toute prescription ou administration.
        </p>
      </div>
    </div>
  );
}
