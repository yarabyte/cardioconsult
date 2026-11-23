"use client";

import { useState } from "react";
import type { Vitals } from "@/types/domain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export function VitalsSurveillanceClient({
  patientLabel,
  initial,
}: {
  patientLabel: string;
  initial: Vitals[];
}) {
  const [history, setHistory] = useState(initial);
  const [tas, setTas] = useState("");
  const [tad, setTad] = useState("");
  const [fc, setFc] = useState("");

  const tasNum = tas ? Number(tas) : null;
  const alert =
    tasNum != null && (tasNum < 90 || tasNum > 180)
      ? tasNum < 90
        ? "Hypotension — TAS < 90 mmHg"
        : "Hypertension — TAS > 180 mmHg"
      : null;

  const save = () => {
    if (!tas || !tad) return;
    const row: Vitals = {
      id: `v-${Date.now()}`,
      patientId: history[0]?.patientId ?? "hosp-arnaud",
      recordedAt: new Date().toISOString(),
      authorLabel: "S. Laurent",
      tasMmHg: Number(tas),
      tadMmHg: Number(tad),
      fcBpm: fc ? Number(fc) : null,
      spo2Pct: null,
      temperatureC: null,
      frPerMin: null,
      weightKg: null,
      eva: null,
    };
    setHistory((h) => [row, ...h]);
    setTas("");
    setTad("");
    setFc("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Surveillance · constantes</h1>
        <p className="text-muted-foreground mt-1 text-sm">{patientLabel} · données fictives</p>
      </div>

      {alert ? (
        <Alert variant="destructive">
          <AlertTitle>Alerte tensionnelle</AlertTitle>
          <AlertDescription>{alert} — vérification clinique requise.</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="bg-card border-border grid gap-3 rounded-2xl border p-4 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <Label htmlFor="tas">TAS (mmHg)</Label>
          <Input id="tas" inputMode="numeric" value={tas} onChange={(e) => setTas(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="tad">TAD (mmHg)</Label>
          <Input id="tad" inputMode="numeric" value={tad} onChange={(e) => setTad(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="fc">FC (bpm)</Label>
          <Input id="fc" inputMode="numeric" value={fc} onChange={(e) => setFc(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Enregistrer
          </Button>
        </div>
      </form>

      <div className="border-border overflow-x-auto rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Horodatage</TableHead>
              <TableHead>TAS/TAD</TableHead>
              <TableHead>FC</TableHead>
              <TableHead>Auteur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{formatDateTime(v.recordedAt)}</TableCell>
                <TableCell className="tabular-nums">
                  {v.tasMmHg}/{v.tadMmHg} mmHg
                </TableCell>
                <TableCell className="tabular-nums">{v.fcBpm ?? "—"}</TableCell>
                <TableCell>{v.authorLabel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}