"use client";

import type { TriState } from "@/types/domain";
import { cn } from "@/lib/utils";

export function TriStateCriterion({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: TriState;
  onChange: (v: TriState) => void;
  disabled?: boolean;
}) {
  const options: { v: TriState; label: string }[] = [
    { v: "oui", label: "Oui" },
    { v: "non", label: "Non" },
    { v: "inconnu", label: "Inconnu" },
  ];

  return (
    <fieldset className="border-border rounded-xl border p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-bold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${id}-legend`}>
        {options.map((opt) => (
          <button
            key={opt.v}
            type="button"
            role="radio"
            aria-checked={value === opt.v}
            disabled={disabled}
            onClick={() => onChange(opt.v)}
            className={cn(
              "rounded-[10px] border px-3 py-2 text-sm font-semibold transition-colors",
              value === opt.v
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-background text-foreground hover:bg-muted",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
