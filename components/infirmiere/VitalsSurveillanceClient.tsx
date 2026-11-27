"use client";

import { useMemo, useState, useSyncExternalStore, useTransition, type ChangeEvent } from "react";

function subscribeMinute(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(id);
}
function getClientNow() {
  return Date.now();
}
function getServerNow() {
  return 0;
}
import type { Vitals } from "@/types/domain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { TrendChart } from "@/components/charts/TrendChart";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { evaluateVitalsAlerts } from "@/lib/hospitalisation/vitals-alerts";
import {
  addFluidAction,
  addTransmissionAction,
  correctVitalsAction,
  recordVitalsAction,
} from "@/server/actions/hospitalisation";
import type { FluidBalanceEntry, TargetedTransmission } from "@/server/hospitalisation/types";
import { cn } from "@/lib/utils";

type FormState = {
  tas: string;
  tad: string;
  fc: string;
  spo2: string;
  temp: string;
  fr: string;
  weight: string;
  eva: string;
};

const emptyForm: FormState = {
  tas: "",
  tad: "",
  fc: "",
  spo2: "",
  temp: "",
  fr: "",
  weight: "",
  eva: "",
};

function numOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formToInput(f: FormState) {
  return {
    tasMmHg: numOrNull(f.tas),
    tadMmHg: numOrNull(f.tad),
    fcBpm: numOrNull(f.fc),
    spo2Pct: numOrNull(f.spo2),
    temperatureC: numOrNull(f.temp),
    frPerMin: numOrNull(f.fr),
    weightKg: numOrNull(f.weight),
    eva: numOrNull(f.eva),
  };
}

export function VitalsSurveillanceClient({
  patientId,
  patientLabel,
  stayId,
  initialActive,
  initialAll,
  initialFluids,
  initialTransmissions,
}: {
  patientId: string;
  patientLabel: string;
  stayId: string | null;
  initialActive: Vitals[];
  initialAll: Vitals[];
  initialFluids: FluidBalanceEntry[];
  initialTransmissions: TargetedTransmission[];
}) {
  const [active, setActive] = useState(initialActive);
  const [all, setAll] = useState(initialAll);
  const [fluids, setFluids] = useState(initialFluids);
  const [transmissions, setTransmissions] = useState(initialTransmissions);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctReason, setCorrectReason] = useState("");
  const [intake, setIntake] = useState("");
  const [output, setOutput] = useState("");
  const [diuresis, setDiuresis] = useState("");
  const [txBody, setTxBody] = useState("");
  const [txTarget, setTxTarget] = useState("Médecin de garde");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewAlerts = useMemo(() => evaluateVitalsAlerts(formToInput(form)), [form]);

  const nowMs = useSyncExternalStore(subscribeMinute, getClientNow, getServerNow);

  const chartData = useMemo(() => {
    if (!nowMs) return [];
    const cutoff = nowMs - 24 * 60 * 60 * 1000;
    return [...active]
      .filter((v) => new Date(v.recordedAt).getTime() >= cutoff)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .map((v) => ({
        date: formatDateTime(v.recordedAt).split(" ").pop() ?? v.recordedAt,
        tas: v.tasMmHg,
        tad: v.tadMmHg,
        fc: v.fcBpm,
        spo2: v.spo2Pct,
      }));
  }, [active, nowMs]);

  const diuresisBars = useMemo(() => {
    return fluids
      .filter((f) => f.diuresisMl != null)
      .slice(0, 6)
      .reverse()
      .map((f) => ({
        slot: formatDateTime(f.recordedAt).split(" ").pop() ?? f.recordedAt,
        ml: f.diuresisMl ?? 0,
      }));
  }, [fluids]);

  const fluidTotals = useMemo(() => {
    const intakeMl = fluids.reduce((s, f) => s + f.intakeMl, 0);
    const outputMl = fluids.reduce((s, f) => s + f.outputMl, 0);
    const diuresisMl = fluids.reduce((s, f) => s + (f.diuresisMl ?? 0), 0);
    return { intakeMl, outputMl, diuresisMl, bilan: intakeMl - outputMl };
  }, [fluids]);

  const setField = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = () => {
    startTransition(async () => {
      const input = formToInput(form);
      if (correctingId) {
        if (correctReason.trim().length < 3) {
          setMessage("Motif de correction obligatoire");
          return;
        }
        const r = await correctVitalsAction({
          patientId,
          previousId: correctingId,
          reason: correctReason,
          ...input,
        });
        if (!r.ok) {
          setMessage(r.error);
          return;
        }
        setAll((list) => {
          const next = list.map((v) => (v.id === r.previous.id ? r.previous : v));
          return [r.next, ...next.filter((v) => v.id !== r.next.id)];
        });
        setActive((list) => [
          r.next,
          ...list.filter((v) => v.id !== correctingId && v.id !== r.next.id),
        ]);
        setCorrectingId(null);
        setCorrectReason("");
        setForm(emptyForm);
        setMessage("Correction enregistrée — historique conservé");
        return;
      }

      const r = await recordVitalsAction({
        patientId,
        stayId,
        ...input,
      });
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setActive((h) => [r.vitals, ...h]);
      setAll((h) => [r.vitals, ...h]);
      setForm(emptyForm);
      setMessage(
        r.vitals.alertLabels?.length
          ? `Enregistré avec alerte de mesure : ${r.vitals.alertLabels[0]}`
          : "Constantes enregistrées",
      );
    });
  };

  const startCorrect = (v: Vitals) => {
    setCorrectingId(v.id);
    setForm({
      tas: v.tasMmHg != null ? String(v.tasMmHg) : "",
      tad: v.tadMmHg != null ? String(v.tadMmHg) : "",
      fc: v.fcBpm != null ? String(v.fcBpm) : "",
      spo2: v.spo2Pct != null ? String(v.spo2Pct) : "",
      temp: v.temperatureC != null ? String(v.temperatureC) : "",
      fr: v.frPerMin != null ? String(v.frPerMin) : "",
      weight: v.weightKg != null ? String(v.weightKg) : "",
      eva: v.eva != null ? String(v.eva) : "",
    });
    setCorrectReason("");
    setMessage(null);
  };

  const saveFluid = () => {
    startTransition(async () => {
      const r = await addFluidAction({
        patientId,
        intakeMl: numOrNull(intake) ?? 0,
        outputMl: numOrNull(output) ?? 0,
        diuresisMl: numOrNull(diuresis),
      });
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setFluids((f) => [r.entry, ...f]);
      setIntake("");
      setOutput("");
      setDiuresis("");
      setMessage("Bilan hydrique enregistré");
    });
  };

  const saveTx = () => {
    startTransition(async () => {
      const r = await addTransmissionAction({
        patientId,
        stayId,
        body: txBody,
        target: txTarget,
      });
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setTransmissions((t) => [r.entry, ...t]);
      setTxBody("");
      setMessage("Transmission enregistrée");
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Constantes & surveillance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {patientLabel} · données fictives · bornes TAS 90–180 mmHg
        </p>
      </div>

      {message ? (
        <p role="status" className="text-primary text-sm font-semibold">
          {message}
        </p>
      ) : null}

      {previewAlerts.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Alerte de mesure</AlertTitle>
          <AlertDescription>
            {previewAlerts.join(" · ")} — contrôlez la mesure et prévenez le médecin si elle se
            confirme. Aide à la surveillance, pas une décision médicale.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="border-border bg-card flex-1 space-y-4 rounded-2xl border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-extrabold">
              {correctingId ? "Corriger une mesure" : "Nouvelle prise de constantes"}
            </h2>
            <span className="text-muted-foreground text-xs">
              Horodatage automatique · immuable après enregistrement
            </span>
          </div>

          {correctingId ? (
            <div className="space-y-2">
              <Label htmlFor="correct-reason">Motif de correction (obligatoire)</Label>
              <Textarea
                id="correct-reason"
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value)}
                rows={2}
                required
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {(
              [
                ["tas", "TAS", "mmHg"],
                ["tad", "TAD", "mmHg"],
                ["fc", "FC", "bpm"],
                ["spo2", "SpO₂", "%"],
                ["temp", "T°", "°C"],
                ["fr", "FR", "/min"],
                ["weight", "Poids", "kg"],
                ["eva", "EVA", "/10"],
              ] as const
            ).map(([key, label, unit]) => (
              <div key={key}>
                <Label htmlFor={key}>
                  {label} ({unit})
                </Label>
                <Input
                  id={key}
                  inputMode="decimal"
                  value={form[key]}
                  onChange={setField(key)}
                  className={cn(
                    key === "tas" && previewAlerts.some((a) => a.startsWith("TAS"))
                      ? "border-destructive"
                      : undefined,
                  )}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={pending}>
              {correctingId ? "Enregistrer la correction" : "Enregistrer les constantes"}
            </Button>
            {correctingId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCorrectingId(null);
                  setCorrectReason("");
                  setForm(emptyForm);
                }}
              >
                Annuler
              </Button>
            ) : null}
          </div>
        </section>

        <aside className="w-full max-w-sm space-y-4">
          <section className="border-border bg-card rounded-2xl border p-4">
            <h2 className="mb-3 text-base font-extrabold">Bilan entrées / sorties</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-2 text-sm">
              <dt className="text-muted-foreground">Apports</dt>
              <dd className="font-bold tabular-nums">{fluidTotals.intakeMl} mL</dd>
              <dt className="text-muted-foreground">Diurèse</dt>
              <dd className="font-bold tabular-nums">{fluidTotals.diuresisMl} mL</dd>
              <dt className="text-muted-foreground">Bilan</dt>
              <dd
                className={cn(
                  "font-extrabold tabular-nums",
                  fluidTotals.bilan < 0 ? "text-success" : undefined,
                )}
              >
                {fluidTotals.bilan > 0 ? "+" : ""}
                {fluidTotals.bilan} mL
              </dd>
            </dl>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="intake">Apports</Label>
                <Input
                  id="intake"
                  inputMode="numeric"
                  value={intake}
                  onChange={(e) => setIntake(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="output">Sorties</Label>
                <Input
                  id="output"
                  inputMode="numeric"
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="diuresis">Diurèse</Label>
                <Input
                  id="diuresis"
                  inputMode="numeric"
                  value={diuresis}
                  onChange={(e) => setDiuresis(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              className="mt-3 w-full"
              size="sm"
              variant="outline"
              onClick={saveFluid}
              disabled={pending}
            >
              Ajouter au bilan
            </Button>
          </section>

          <section className="border-border bg-card space-y-2 rounded-2xl border p-4">
            <h2 className="text-base font-extrabold">Transmission ciblée</h2>
            <Label htmlFor="tx-target">Destinataire</Label>
            <Input id="tx-target" value={txTarget} onChange={(e) => setTxTarget(e.target.value)} />
            <Label htmlFor="tx-body">Message</Label>
            <Textarea
              id="tx-body"
              rows={3}
              value={txBody}
              onChange={(e) => setTxBody(e.target.value)}
            />
            <Button type="button" size="sm" onClick={saveTx} disabled={pending || !txBody.trim()}>
              Envoyer
            </Button>
            <ul className="mt-2 space-y-2 text-sm">
              {transmissions.slice(0, 3).map((t) => (
                <li key={t.id} className="border-border rounded-lg border p-2">
                  <p className="font-semibold">{t.target}</p>
                  <p className="text-muted-foreground">{t.body}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t.authorLabel} · {formatDateTime(t.recordedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border-border bg-card rounded-2xl border p-4">
          <h2 className="mb-2 text-base font-extrabold">Pression artérielle — 24 h</h2>
          {chartData.length > 0 ? (
            <TrendChart
              data={chartData}
              ariaLabel="Surveillance TA sur 24 h"
              series={[
                { key: "tas", label: "TAS", color: "#0B4FB3" },
                { key: "tad", label: "TAD", color: "#7FA6E6" },
              ]}
              unit="mmHg"
              thresholds={[
                { y: 90, label: "TAS min", color: "#B81E2A" },
                { y: 180, label: "TAS max", color: "#B81E2A" },
              ]}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Pas encore de mesures sur 24 h.</p>
          )}
        </section>

        <section className="border-border bg-card rounded-2xl border p-4">
          <h2 className="mb-2 text-base font-extrabold">FC et SpO₂ — 24 h</h2>
          {chartData.length > 0 ? (
            <TrendChart
              data={chartData}
              ariaLabel="Surveillance FC et SpO2 sur 24 h"
              series={[
                { key: "fc", label: "FC", color: "#D42A35" },
                { key: "spo2", label: "SpO₂", color: "#0E7490", strokeDasharray: "6 4" },
              ]}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Pas encore de mesures sur 24 h.</p>
          )}
        </section>

        <section className="border-border bg-card rounded-2xl border p-4">
          <h2 className="mb-2 text-base font-extrabold">Diurèse</h2>
          {diuresisBars.length > 0 ? (
            <BarTrendChart
              data={diuresisBars}
              xKey="slot"
              yKey="ml"
              ariaLabel="Diurèse enregistrée"
            />
          ) : (
            <p className="text-muted-foreground text-sm">Aucune diurèse saisie.</p>
          )}
        </section>

        <section className="border-border overflow-hidden rounded-2xl border bg-white">
          <div className="border-border border-b px-4 py-3">
            <h2 className="text-base font-extrabold">Dernières mesures</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horodatage</TableHead>
                  <TableHead>TA</TableHead>
                  <TableHead>FC</TableHead>
                  <TableHead>SpO₂</TableHead>
                  <TableHead>Alertes</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((v) => (
                  <TableRow
                    key={v.id}
                    className={cn(v.cancelledAt ? "text-muted-foreground opacity-60" : undefined)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(v.recordedAt)}
                      {v.cancelledAt ? (
                        <span className="block text-[11px]">annulée · {v.cancelReason}</span>
                      ) : null}
                      {v.supersedesId ? (
                        <span className="block text-[11px]">correction</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {v.tasMmHg ?? "—"}/{v.tadMmHg ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{v.fcBpm ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {v.spo2Pct != null ? `${v.spo2Pct} %` : "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] text-xs">
                      {v.alertLabels?.length ? v.alertLabels.join(" · ") : "—"}
                    </TableCell>
                    <TableCell>{v.authorLabel}</TableCell>
                    <TableCell>
                      {!v.cancelledAt ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => startCorrect(v)}
                        >
                          Corriger
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
