"use client";

import Link from "next/link";
import { AllergyBanner } from "@/components/patients/AllergyBanner";
import { formatDateTime } from "@/lib/format";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function PatientContextBar({
  patientId,
  patientLabel,
  ageLabel,
  sex,
  motifLabel,
  allergies,
  closed,
  autosave,
  savedAt,
  version,
  conflict,
}: {
  patientId: string;
  patientLabel: string;
  ageLabel: string;
  sex: string;
  motifLabel?: string;
  allergies: string[];
  closed: boolean;
  autosave: AutosaveStatus;
  savedAt: string | null;
  version: number;
  conflict?: boolean;
}) {
  const saveLabel = conflict
    ? "Conflit d'édition"
    : closed
      ? "Lecture seule"
      : autosave === "saving"
        ? "Enregistrement…"
        : autosave === "dirty"
          ? "Modifications en attente…"
          : autosave === "error"
            ? "Échec d'enregistrement"
            : savedAt
              ? `Enregistré à ${formatDateTime(savedAt)}`
              : "Brouillon non encore enregistré";

  return (
    <div className="surface-elevated sticky top-16 z-20 space-y-3 p-4 md:p-5">
      <AllergyBanner allergies={allergies} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-extrabold tracking-tight md:text-xl">{patientLabel}</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {ageLabel} · {sex}
            {motifLabel ? ` · ${motifLabel}` : null}
          </p>
          <Link
            href={`/patients/${patientId}`}
            className="text-primary mt-1 inline-block text-sm font-semibold underline-offset-2 hover:underline"
          >
            Retour au dossier
          </Link>
        </div>
        <div
          className={
            conflict || autosave === "error"
              ? "text-destructive text-right text-xs font-bold"
              : "text-muted-foreground text-right text-xs"
          }
          aria-live="polite"
        >
          <p>{saveLabel}</p>
          <p>v{version}</p>
        </div>
      </div>
    </div>
  );
}
