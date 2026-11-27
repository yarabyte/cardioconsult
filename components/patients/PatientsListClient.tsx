"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Search } from "lucide-react";
import type { Patient } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateShort, formatNumber, patientDisplayName, ageAt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

const PATHOLOGY_FILTERS = ["IC", "FA", "HTA", "Aorte", "Coronaire"] as const;

function dossierLabel(p: Patient): string {
  const raw = (p.dossierNumber && p.dossierNumber.length > 0 ? p.dossierNumber : p.id).toString();
  // UUID technique → n’afficher qu’un suffixe lisible
  if (/^[0-9a-f-]{20,}$/i.test(raw) || raw === p.id) {
    return `Dossier …${raw.slice(-8)}`;
  }
  return raw;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";
}

export function PatientsListClient({
  patients,
  total,
  page,
  pageSize,
  initialQ,
  initialPathology,
}: {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
  initialQ?: string;
  initialPathology?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQ ?? "");
  const [pathology, setPathology] = useState<string | null>(initialPathology ?? null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function navigate(next: { q?: string; pathology?: string | null; page?: number }) {
    const sp = new URLSearchParams(searchParams.toString());
    const q = next.q ?? query;
    const path = next.pathology !== undefined ? next.pathology : pathology;
    const p = next.page ?? 1;
    if (q) sp.set("q", q);
    else sp.delete("q");
    if (path) sp.set("pathology", path);
    else sp.delete("pathology");
    sp.set("page", String(p));
    start(() => {
      router.push(`/patients?${sp.toString()}`);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Patients"
        description={`${formatNumber(total)} dossier(s) · recherche par index normalisé`}
        actions={
          <Link
            href="/patients/nouveau"
            className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-[10px] px-4 text-sm font-bold shadow-[var(--shadow-surface)]"
          >
            + Nouveau patient
          </Link>
        }
      />

      <div className="surface-card space-y-3 p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              className="border-border bg-background h-11 rounded-[10px] pr-3 pl-10"
              placeholder="Nom, prénom ou n° dossier…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate({ q: query, page: 1 });
              }}
              aria-label="Rechercher un patient"
            />
          </div>
          <Button
            type="button"
            className="h-11 rounded-[10px] font-bold"
            disabled={pending}
            onClick={() => navigate({ q: query, page: 1 })}
          >
            Rechercher
          </Button>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres pathologie">
          {PATHOLOGY_FILTERS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                const next = pathology === tag ? null : tag;
                setPathology(next);
                navigate({ pathology: next, page: 1 });
              }}
              className={cn(
                "min-h-9 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                pathology === tag
                  ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-surface)]"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              aria-pressed={pathology === tag}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="surface-card px-6 py-14 text-center">
          <p className="text-foreground text-sm font-bold">Aucun patient trouvé</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Modifiez la recherche ou créez un nouveau dossier.
          </p>
          <Link
            href="/patients/nouveau"
            className="text-primary mt-4 inline-block text-sm font-bold underline-offset-2 hover:underline"
          >
            + Nouveau patient
          </Link>
        </div>
      ) : (
        <>
          <div className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-muted-foreground h-11 px-4 text-[12px] font-bold tracking-wide uppercase">
                    Patient
                  </TableHead>
                  <TableHead className="text-muted-foreground h-11 px-4 text-[12px] font-bold tracking-wide uppercase">
                    Pathologies
                  </TableHead>
                  <TableHead className="text-muted-foreground h-11 px-4 text-[12px] font-bold tracking-wide uppercase">
                    FEVG
                  </TableHead>
                  <TableHead className="text-muted-foreground h-11 px-4 text-[12px] font-bold tracking-wide uppercase">
                    Dernière consult.
                  </TableHead>
                  <TableHead className="text-muted-foreground h-11 px-4 text-[12px] font-bold tracking-wide uppercase">
                    Alerte
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => {
                  const name = patientDisplayName(p.firstName, p.lastName);
                  const age = ageAt(p.birthDate, today);
                  return (
                    <TableRow key={p.id} className="hover:bg-primary-soft/40 border-separator">
                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div
                            className="bg-primary-soft text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold"
                            aria-hidden
                          >
                            {initials(p.firstName, p.lastName)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/patients/${p.id}`}
                              className="text-foreground hover:text-primary text-[15px] font-extrabold tracking-tight"
                            >
                              {name}
                            </Link>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {age} ans · {p.sex} · {dossierLabel(p)}
                            </p>
                            {p.allergies.length > 0 ? (
                              <span className="border-destructive/30 bg-alert-soft text-alert-fg mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold">
                                <AlertTriangle className="size-3 shrink-0" aria-hidden />
                                <span className="truncate">
                                  Allergie : {p.allergies.join(" · ")}
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        {p.pathologies.length > 0 ? (
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {p.pathologies.slice(0, 4).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="bg-secondary text-foreground rounded-md text-[11px] font-semibold"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70 text-sm">Non renseigné</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 tabular-nums">
                        {p.fevgPct != null ? (
                          <span className="font-semibold">{p.fevgPct}&nbsp;%</span>
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 text-sm">
                        {p.lastConsultDate ? (
                          formatDateShort(p.lastConsultDate)
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 text-sm">
                        {p.alertLabel ? (
                          <span className="text-warning font-semibold">{p.alertLabel}</span>
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Page {page} / {totalPages} · {formatNumber(patients.length)} affiché(s) sur{" "}
              {formatNumber(total)}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[10px]"
                disabled={page <= 1 || pending}
                onClick={() => navigate({ page: page - 1 })}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[10px]"
                disabled={page >= totalPages || pending}
                onClick={() => navigate({ page: page + 1 })}
              >
                Suivant
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Les suppressions définitives sont désactivées : archivage selon la politique du cabinet.
          </p>
        </>
      )}
    </div>
  );
}
