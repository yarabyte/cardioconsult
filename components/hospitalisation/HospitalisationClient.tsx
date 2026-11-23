"use client";

import { useMemo, useState } from "react";
import type { Bed } from "@/types/domain";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TAG_STYLES: Record<Bed["tag"], string> = {
  Libre: "bg-muted text-muted-foreground",
  Fiche: "bg-primary-soft text-primary",
  Examen: "bg-warning-soft text-warning",
  Alerte: "bg-destructive/10 text-destructive",
  "Sortie prévue": "bg-success-soft text-success",
};

const FILTERS: Array<Bed["tag"] | "Tous"> = ["Tous", "Libre", "Fiche", "Examen", "Alerte", "Sortie prévue"];

export function HospitalisationClient({ beds }: { beds: Bed[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tous");
  const [selectedId, setSelectedId] = useState<string | null>(beds.find((b) => b.tag === "Alerte")?.id ?? null);

  const visible = useMemo(
    () => (filter === "Tous" ? beds : beds.filter((b) => b.tag === filter)),
    [beds, filter],
  );

  const selected = beds.find((b) => b.id === selectedId) ?? visible[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Hospitalisation</h1>
        <p className="text-muted-foreground mt-1 text-sm">Vue du service · chambres 101–111</p>
      </div>

      <input type="hidden" value={filter} readOnly aria-hidden />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
          >
            {f}
          </Button>
        ))}
      </div>

      <h2 className="sr-only">Liste des lits filtrés</h2>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
          {visible.map((bed) => (
            <button
              key={bed.id}
              type="button"
              onClick={() => setSelectedId(bed.id)}
              className={cn(
                "border-border bg-card rounded-xl border p-3 text-left transition-colors",
                selected?.id === bed.id && "border-primary ring-primary/30 ring-2",
              )}
            >
              <p className="text-lg font-extrabold tabular-nums">Lit {bed.number}</p>
              <p className="text-muted-foreground text-xs">Ch. {bed.room}</p>
              <Badge className={cn("mt-2 text-[10px]", TAG_STYLES[bed.tag])}>{bed.tag}</Badge>
            </button>
          ))}
        </div>

        {selected ? (
          <aside className="border-border bg-card w-full max-w-md rounded-2xl border p-4 lg:sticky lg:top-20 lg:self-start">
            <h2 className="text-lg font-extrabold">
              Lit {selected.number} · chambre {selected.room}
            </h2>
            <p className="mt-2 font-bold">{selected.patientLabel}</p>
            <p className="text-muted-foreground mt-1 text-sm">{selected.motif || "—"}</p>
            <p className="text-muted-foreground mt-3 text-xs">{selected.dayLabel}</p>
            {selected.patientId ? (
              <Button className="mt-4" variant="outline" size="sm" render={<Link href={`/patients/${selected.patientId}`} />}>
                Ouvrir le dossier
              </Button>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}