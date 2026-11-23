import { cn } from "@/lib/utils";
import type { ClinicalStatusVariant } from "@/types/domain";

const LABELS: Record<ClinicalStatusVariant, string> = {
  "non-renseigne": "Non renseigné",
  calcule: "Calculé",
  incomplet: "Incomplet · à confirmer",
  valide: "Validé par le médecin",
  alerte: "Alerte de mesure",
  "red-flag": "RED FLAG · discussion spécialisée",
};

const STYLES: Record<ClinicalStatusVariant, string> = {
  "non-renseigne": "bg-[#EEF2F8] text-muted-foreground",
  calcule: "bg-primary-soft text-primary",
  incomplet: "bg-warning-soft text-warning",
  valide: "bg-success-soft text-success",
  alerte: "bg-alert-soft text-alert-fg",
  "red-flag": "bg-destructive text-white font-extrabold",
};

export function StatusBadge({
  variant,
  label,
  className,
}: {
  variant: ClinicalStatusVariant;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-bold",
        STYLES[variant],
        className,
      )}
    >
      {label ?? LABELS[variant]}
    </span>
  );
}
