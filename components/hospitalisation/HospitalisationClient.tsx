"use client";

import { useMemo, useState, useTransition } from "react";
import type { Bed } from "@/types/domain";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { loadWardAction } from "@/server/actions/hospitalisation";
import type { HospitalisationModuleState } from "@/server/hospitalisation/module";
import type { BedFilter } from "@/server/hospitalisation/types";

const TAG_STYLES: Record<Bed["tag"], string> = {
  Libre: "bg-muted text-muted-foreground",
  Fiche: "bg-primary-soft text-primary",
  Examen: "bg-warning-soft text-warning",
  Alerte: "bg-destructive/10 text-destructive",
  "Sortie prévue": "bg-success-soft text-success",
};

const FILTERS: BedFilter[] = ["Tous", "Libre", "Fiche", "Examen", "Alerte", "Sortie prévue"];

export function HospitalisationClient({
  initialBeds,
  module,
  disabled = false,
}: {
  initialBeds: Bed[];
  module: HospitalisationModuleState;
  disabled?: boolean;
}) {
  const [beds, setBeds] = useState(initialBeds);
  const [filter, setFilter] = useState<BedFilter>("Tous");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBeds.find((b) => b.tag === "Alerte")?.id ?? initialBeds[0]?.id ?? null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const applyFilter = (next: BedFilter) => {
    setFilter(next);
    startTransition(async () => {
      const r = await loadWardAction({ filter: next });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setBeds(r.beds);
      setSelectedId((prev) => {
        if (prev && r.beds.some((b) => b.id === prev)) return prev;
        return r.beds.find((b) => b.tag === "Alerte")?.id ?? r.beds[0]?.id ?? null;
      });
    });
  };

  const visible = useMemo(
    () => (filter === "Tous" ? beds : beds.filter((b) => b.tag === filter)),
    [beds, filter],
  );

  const selected = beds.find((b) => b.id === selectedId) ?? visible[0] ?? null;

  const occupied = beds.filter((b) => b.tag !== "Libre").length;
  const outs = beds.filter((b) => b.tag === "Sortie prévue").length;
  const exams = beds.filter((b) => b.tag === "Examen").length;
  const alerts = beds.filter((b) => b.tag === "Alerte").length;

  if (disabled) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Hospitalisation</h1>
        <p className="text-muted-foreground text-sm">
          Module désactivé — offre Clinique et case « contrat établissement signé » requises
          (activation super admin, tracée). Responsable du traitement : l&apos;établissement.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Hospitalisation · Cardiologie</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Service · patients fictifs · contrat établissement{" "}
          {module.establishmentContractSigned ? "signé" : "non signé"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lits occupés" value={`${occupied} / ${beds.length || "—"}`} />
        <Stat label="Sorties prévues" value={String(outs)} accent="text-success" />
        <Stat label="Examens en attente" value={String(exams)} accent="text-warning" />
        <Stat label="Alertes à revoir" value={String(alerts)} accent="text-destructive" />
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm font-semibold">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les lits">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => applyFilter(f)}
            aria-pressed={filter === f}
            disabled={pending}
          >
            {f}
          </Button>
        ))}
      </div>

      <h2 className="sr-only">Liste des lits filtrés</h2>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
          {visible.map((bed) => (
            <button
              key={bed.id}
              type="button"
              onClick={() => setSelectedId(bed.id)}
              aria-pressed={selected?.id === bed.id}
              className={cn(
                "border-border bg-card rounded-xl border p-3 text-left transition-colors",
                selected?.id === bed.id && "border-primary ring-primary/30 ring-2",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
                  Lit {bed.number} · Ch. {bed.room}
                </p>
                <Badge className={cn("text-[10px]", TAG_STYLES[bed.tag])}>{bed.tag}</Badge>
              </div>
              <p className="mt-2 text-sm font-extrabold">{bed.patientLabel}</p>
              <p className="text-muted-foreground mt-1 text-xs">{bed.motif || "—"}</p>
              <p className="text-muted-foreground mt-2 text-[11px]">{bed.dayLabel}</p>
            </button>
          ))}
          {visible.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-sm">Aucun lit pour ce filtre.</p>
          ) : null}
        </div>

        {selected ? (
          <aside className="border-border bg-card w-full max-w-md space-y-3 rounded-2xl border p-4 lg:sticky lg:top-20 lg:self-start">
            <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
              Lit {selected.number} · chambre {selected.room}
            </p>
            <h2 className="text-lg font-extrabold">{selected.patientLabel}</h2>
            <p className="text-muted-foreground text-sm">
              {selected.motif || "—"}
              {selected.dayLabel ? ` · ${selected.dayLabel}` : ""}
            </p>
            {selected.referringPhysicianLabel ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Médecin référent · </span>
                {selected.referringPhysicianLabel}
              </p>
            ) : null}

            <div className="bg-muted/50 rounded-xl p-3 text-sm leading-relaxed">
              <p className="font-bold">Point de staff</p>
              <p className="text-muted-foreground mt-1">{selected.staffNote ?? "—"}</p>
            </div>

            <div className="text-sm leading-relaxed">
              <p className="font-bold">Examens en attente</p>
              <p className="text-muted-foreground mt-1">
                {selected.pendingExams?.length ? selected.pendingExams.join(" · ") : "Aucun"}
              </p>
            </div>

            <div className="text-sm leading-relaxed">
              <p className="font-bold">Dernière transmission IDE</p>
              <p className="text-muted-foreground mt-1">{selected.lastTransmission ?? "—"}</p>
              {selected.lastTransmissionAt ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDateTime(selected.lastTransmissionAt)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {selected.patientId ? (
                <Button size="sm" render={<Link href={`/patients/${selected.patientId}`} />}>
                  Ouvrir le dossier
                </Button>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border-border bg-card rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold tabular-nums", accent)}>{value}</p>
    </div>
  );
}
