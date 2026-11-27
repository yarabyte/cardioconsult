"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AgendaSlot, AppointmentKind } from "@/lib/agenda/types";
import { STATUS_LABELS, type AppointmentStatus } from "@/lib/agenda/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelAppointmentAction,
  createAppointmentAction,
  fetchAgendaAction,
  moveAppointmentAction,
  transitionAppointmentAction,
} from "@/server/actions/agenda";
type View = "day" | "week" | "month";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function AgendaClient({
  tenantId,
  initialItems,
  initialWaitlist,
  kinds,
}: {
  tenantId: string;
  initialItems: AgendaSlot[];
  initialWaitlist: AgendaSlot[];
  kinds: AppointmentKind[];
}) {
  const [view, setView] = useState<View>("day");
  const [items, setItems] = useState(initialItems);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const [pending, start] = useTransition();
  const [live, setLive] = useState(false);

  const reload = useCallback(() => {
    start(async () => {
      const r = await fetchAgendaAction({ view, anchor: "2026-11-23" });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setItems(r.items);
      setWaitlist(r.waitlist);
    });
  }, [view]);

  useEffect(() => {
    reload();
  }, [view, reload]);

  // SSE : identifiants + statut → rechargement autorisé
  useEffect(() => {
    const es = new EventSource(`/api/agenda/stream?tenantId=${tenantId}`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (data.type === "appointment.status") reload();
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [reload, tenantId]);

  const readyCount = useMemo(() => items.filter((i) => i.status === "pret").length, [items]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Semaine du 23 novembre 2026 · {readyCount} patient(s) prêt(s)
            {live ? " · temps réel" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as const).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
            >
              {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground border-border bg-muted/40 rounded-xl border px-3 py-2 text-xs">
        Synchronisation agenda externe, RDV en ligne et SMS : <strong>non disponibles</strong>{" "}
        (interfaces seulement).
      </p>

      <CreateForm kinds={kinds} onCreated={reload} pending={pending} />

      <section className="bg-card border-border rounded-2xl border">
        <h2 className="border-separator border-b px-5 py-3 text-sm font-extrabold">
          Créneaux ({items.length})
        </h2>
        <ul className="divide-separator divide-y">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="w-14 font-bold tabular-nums">{timeLabel(r.startsAt)}</span>
              <span className="min-w-[120px] flex-1 font-semibold">
                {r.patientId ? (
                  <Link href={`/patients/${r.patientId}`} className="text-primary hover:underline">
                    {r.patientLabel}
                  </Link>
                ) : (
                  r.patientLabel
                )}
              </span>
              <span className="text-muted-foreground flex-1">
                {r.motif}
                {r.adminBlock ? " · admin" : ""}
              </span>
              <Badge variant={r.status === "pret" ? "default" : "secondary"}>
                {STATUS_LABELS[r.status]}
              </Badge>
              <div className="flex flex-wrap gap-1">
                {r.status === "prevu" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await transitionAppointmentAction({
                          id: r.id,
                          status: "arrive" as AppointmentStatus,
                        });
                        if (!res.ok) toast.error(res.error);
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
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const startD = new Date(r.startsAt);
                      startD.setMinutes(startD.getMinutes() + 30);
                      const endD = new Date(r.endsAt);
                      endD.setMinutes(endD.getMinutes() + 30);
                      const res = await moveAppointmentAction({
                        id: r.id,
                        startsAt: startD.toISOString(),
                        endsAt: endD.toISOString(),
                      });
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success("Déplacé (+30 min)");
                        reload();
                      }
                    })
                  }
                >
                  +30 min
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending || r.status === "annule" || r.status === "termine"}
                  onClick={() =>
                    start(async () => {
                      const res = await cancelAppointmentAction(r.id);
                      if (!res.ok) toast.error(res.error);
                      else reload();
                    })
                  }
                >
                  Annuler
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card border-border rounded-2xl border">
        <h2 className="border-separator border-b px-5 py-3 text-sm font-extrabold">
          Liste d&apos;attente ({waitlist.length})
        </h2>
        {waitlist.length === 0 ? (
          <p className="text-muted-foreground px-5 py-4 text-sm">Aucun patient en attente.</p>
        ) : (
          <ul className="divide-separator divide-y">
            {waitlist.map((w) => (
              <li key={w.id} className="px-5 py-3 text-sm">
                <strong>{w.patientLabel}</strong> · {w.motif}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CreateForm({
  kinds,
  onCreated,
  pending,
}: {
  kinds: AppointmentKind[];
  onCreated: () => void;
  pending: boolean;
}) {
  const [busy, run] = useTransition();

  return (
    <form
      className="border-border bg-muted/20 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const kindId = String(fd.get("kindId") ?? "suivi");
        const kind = kinds.find((k) => k.id === kindId) ?? kinds[0]!;
        const startsAt = String(fd.get("startsAt") ?? "");
        const startDt = new Date(startsAt);
        const endDt = new Date(startDt.getTime() + kind.durationMin * 60_000);
        run(() => {
          void (async () => {
            const r = await createAppointmentAction({
              physicianId: "demo-medecin",
              patientLabel: String(fd.get("patientLabel") ?? "Patient"),
              patientId: null,
              kindId: kind.id,
              motif: String(fd.get("motif") ?? kind.label),
              startsAt: startDt.toISOString(),
              endsAt: endDt.toISOString(),
              adminBlock: kind.id === "admin",
            });
            if (!r.ok) toast.error(r.error);
            else {
              toast.success("RDV créé");
              onCreated();
              (e.target as HTMLFormElement).reset();
            }
          })();
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="patientLabel">Patient (libellé)</Label>
        <Input id="patientLabel" name="patientLabel" required className="w-40" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="motif">Motif</Label>
        <Input id="motif" name="motif" required className="w-40" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="kindId">Type</Label>
        <select
          id="kindId"
          name="kindId"
          className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
        >
          {kinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label} ({k.durationMin} min)
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="startsAt">Début</Label>
        <Input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue="2026-11-23T14:00"
        />
      </div>
      <Button type="submit" disabled={busy || pending}>
        Créer
      </Button>
    </form>
  );
}
