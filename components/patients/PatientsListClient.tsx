"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Patient } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateShort, formatNumber, patientDisplayName, ageAt } from "@/lib/format";
import { cn } from "@/lib/utils";

const PATHOLOGY_FILTERS = ["IC", "FA", "HTA", "Aorte", "Coronaire"] as const;
const ACT_DATE = "2026-11-23";

export function PatientsListClient({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState("");
  const [pathology, setPathology] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      const matchQ =
        !q ||
        patientDisplayName(p.firstName, p.lastName).toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);
      const matchP = !pathology || p.pathologies.some((x) => x.toLowerCase().includes(pathology.toLowerCase()));
      return matchQ && matchP;
    });
  }, [patients, query, pathology]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Patients</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatNumber(1284)} dossiers actifs · patients fictifs
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="max-w-md"
          placeholder="Rechercher nom, n° dossier, pathologie…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un patient"
        />
        <div className="flex flex-wrap gap-2">
          {PATHOLOGY_FILTERS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setPathology((cur) => (cur === tag ? null : tag))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                pathology === tag
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
              aria-pressed={pathology === tag}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-2xl border bg-white p-8 text-center text-sm">
          Aucun patient ne correspond à ces critères.
        </p>
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Pathologies</TableHead>
                  <TableHead>FEVG</TableHead>
                  <TableHead>Dernière consultation</TableHead>
                  <TableHead>Alerte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/patients/${p.id}`} className="text-primary font-bold hover:underline">
                        {patientDisplayName(p.firstName, p.lastName)}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {ageAt(p.birthDate, ACT_DATE)} ans · {p.sex} · {p.id}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {p.pathologies.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[11px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{p.fevgPct != null ? `${p.fevgPct} %` : "—"}</TableCell>
                    <TableCell>{p.lastConsultDate ? formatDateShort(p.lastConsultDate) : "—"}</TableCell>
                    <TableCell className="text-sm">{p.alertLabel ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-sm">
            {formatNumber(filtered.length)} patient(s) affiché(s) sur {formatNumber(1284)}
          </p>
        </>
      )}
    </div>
  );
}