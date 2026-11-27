"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AgendaSlot } from "@/lib/agenda/types";
import { STATUS_LABELS } from "@/lib/agenda/status";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchAgendaAction,
  markReadyAction,
  sendTransmissionAction,
  transitionAppointmentAction,
  updatePrepAction,
} from "@/server/actions/agenda";
import { AllergyBanner } from "@/components/patients/AllergyBanner";
import { CarteVitalePanel } from "@/components/patients/CarteVitalePanel";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function InfirmiereDashboardClient({
  tenantId,
  initialItems,
}: {
  tenantId: string;
  initialItems: AgendaSlot[];
}) {
  const [rows, setRows] = useState(initialItems.filter((r) => !r.adminBlock));
  const [pending, start] = useTransition();
  const [tx, setTx] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    start(async () => {
      const r = await fetchAgendaAction({ view: "day", anchor: "2026-11-23" });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setRows(r.items.filter((x) => !x.adminBlock));
    });
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/agenda/stream?tenantId=${tenantId}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (data.type === "appointment.status") reload();
      } catch {
        /* */
      }
    };
    const poll = setInterval(() => reload(), 8_000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [reload, tenantId]);

  const readyCount = rows.filter((r) => r.status === "pret").length;
  const queue = rows.filter((r) => ["arrive", "en_preparation", "prevu"].includes(r.status));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Accueil cabinet</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Préparation des consultations · file d&apos;accueil · temps réel
        </p>
      </div>

      <CarteVitalePanel compact className="max-w-xl" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Patients du jour" value={String(rows.length)} />
        <Kpi label="Prêts pour le médecin" value={String(readyCount)} />
        <Kpi label="File d'accueil" value={String(queue.length)} />
      </div>

      <section className="border-border overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              <th className="px-4 py-3 font-bold">Heure</th>
              <th className="px-2 py-3 font-bold">Patient</th>
              <th className="px-2 py-3 font-bold">Motif</th>
              <th className="px-2 py-3 font-bold">Statut</th>
              <th className="px-2 py-3 font-bold">Constantes</th>
              <th className="px-2 py-3 font-bold">ECG</th>
              <th className="px-2 py-3 font-bold">Poids</th>
              <th className="px-4 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-separator border-t">
                <td className="px-4 py-3 font-bold tabular-nums">{timeLabel(row.startsAt)}</td>
                <td className="px-2 py-3">
                  {row.patientId ? (
                    <Link
                      href={`/infirmiere/surveillance/${row.patientId}`}
                      className="text-primary font-bold"
                    >
                      {row.patientLabel}
                    </Link>
                  ) : (
                    <span className="font-bold">{row.patientLabel}</span>
                  )}
                  {row.patientId === "CC-000184" ? (
                    <div className="mt-1 max-w-[200px]">
                      <AllergyBanner allergies={["pénicilline"]} />
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-3">{row.motif}</td>
                <td className="px-2 py-3 font-semibold">{STATUS_LABELS[row.status]}</td>
                <td className="px-2 py-3">
                  <Checkbox
                    checked={row.prep.vitals}
                    disabled={pending}
                    onCheckedChange={(v) =>
                      start(async () => {
                        await updatePrepAction({ id: row.id, vitals: v === true });
                        reload();
                      })
                    }
                    aria-label="Constantes"
                  />
                </td>
                <td className="px-2 py-3">
                  <Checkbox
                    checked={row.prep.ecg}
                    disabled={pending}
                    onCheckedChange={(v) =>
                      start(async () => {
                        await updatePrepAction({ id: row.id, ecg: v === true });
                        reload();
                      })
                    }
                    aria-label="ECG"
                  />
                </td>
                <td className="px-2 py-3">
                  <Checkbox
                    checked={row.prep.weight}
                    disabled={pending}
                    onCheckedChange={(v) =>
                      start(async () => {
                        await updatePrepAction({ id: row.id, weight: v === true });
                        reload();
                      })
                    }
                    aria-label="Poids"
                  />
                </td>
                <td className="space-y-2 px-4 py-3">
                  {row.status === "prevu" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await transitionAppointmentAction({
                            id: row.id,
                            status: "arrive",
                          });
                          if (!r.ok) toast.error(r.error);
                          else reload();
                        })
                      }
                    >
                      Arrivé
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className={cn(row.status === "pret" && "bg-success")}
                    disabled={pending || row.status === "pret"}
                    onClick={() =>
                      start(async () => {
                        const r = await markReadyAction(row.id);
                        if (!r.ok) toast.error(r.error);
                        else {
                          toast.success("Marqué prêt — visible médecin");
                          reload();
                        }
                      })
                    }
                  >
                    {row.status === "pret" ? "Prêt" : "Marquer prêt"}
                  </Button>
                  <div className="flex gap-1">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Transmission…"
                      value={tx[row.id] ?? ""}
                      onChange={(e) => setTx((m) => ({ ...m, [row.id]: e.target.value }))}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending || !(tx[row.id] ?? "").trim()}
                      onClick={() =>
                        start(async () => {
                          const r = await sendTransmissionAction({
                            id: row.id,
                            text: tx[row.id]!,
                          });
                          if (!r.ok) toast.error(r.error);
                          else {
                            toast.success("Transmission auditée");
                            setTx((m) => ({ ...m, [row.id]: "" }));
                            reload();
                          }
                        })
                      }
                    >
                      Envoyer
                    </Button>
                  </div>
                  {row.transmission ? (
                    <p className="text-muted-foreground text-xs">Dernière : {row.transmission}</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-card border-border rounded-2xl border p-4">
        <h2 className="text-sm font-extrabold">Tâches du jour</h2>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Compléter constantes / poids avant « Marquer prêt »</li>
          <li>ECG optionnel selon le motif</li>
          <li>Transmissions au médecin (journalisées)</li>
        </ul>
      </section>
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
