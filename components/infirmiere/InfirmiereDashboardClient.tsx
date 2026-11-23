"use client";

import { useState } from "react";
import Link from "next/link";
import { nurseAgendaToday, type NurseAgendaRow } from "@/lib/mock/infirmiere";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const toneClass = {
  success: "text-success font-semibold",
  warning: "text-warning font-semibold",
  muted: "text-muted-foreground",
};

export function InfirmiereDashboardClient() {
  const [rows, setRows] = useState(nurseAgendaToday);
  const readyCount = rows.filter((r) => r.ready).length;

  const toggleReady = (id: string) => {
    setRows((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              ready: !r.ready,
              prepStatus: !r.ready ? "Préparation terminée" : r.prepStatus,
              prepTone: !r.ready ? "success" : r.prepTone,
            }
          : r,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Accueil cabinet</h1>
        <p className="text-muted-foreground mt-1 text-sm">Préparation des consultations du jour · données fictives</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Patients du jour" value={String(rows.length)} />
        <Kpi label="Prêts pour le médecin" value={String(readyCount)} />
        <Kpi label="En cours" value={String(rows.length - readyCount)} />
      </div>

      <AgendaTable rows={rows} onToggle={toggleReady} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4">
      <p className="text-muted-foreground text-sm font-semibold">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function AgendaTable({
  rows,
  onToggle,
}: {
  rows: NurseAgendaRow[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="border-border overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-4 py-3 font-bold">Heure</th>
            <th className="px-2 py-3 font-bold">Patient</th>
            <th className="px-2 py-3 font-bold">Motif</th>
            <th className="px-2 py-3 font-bold">Préparation</th>
            <th className="px-4 py-3 font-bold">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-separator border-t">
              <td className="px-4 py-3 font-bold tabular-nums">{row.time}</td>
              <td className="px-2 py-3">
                {row.patientId ? (
                  <Link href={`/infirmiere/surveillance/${row.patientId}`} className="font-bold text-primary">
                    {row.patientLabel}
                  </Link>
                ) : (
                  <span className="font-bold">{row.patientLabel}</span>
                )}
                <p className="text-muted-foreground text-xs">{row.meta}</p>
              </td>
              <td className="px-2 py-3">{row.motif}</td>
              <td className={cn("px-2 py-3", toneClass[row.prepTone])}>{row.prepStatus}</td>
              <td className="px-4 py-3">
                <Button
                  type="button"
                  size="sm"
                  variant={row.ready ? "outline" : "default"}
                  className={row.ready ? "border-success text-success" : undefined}
                  onClick={() => onToggle(row.id)}
                  aria-pressed={row.ready}
                >
                  {row.ready ? "Prêt ✓" : "Marquer prêt"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}