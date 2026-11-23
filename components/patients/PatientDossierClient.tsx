"use client";

import { useMemo, useState } from "react";
import type { Patient } from "@/types/domain";
import {
  jeanneDfgSeries,
  jeanneFcSeries,
  jeanneFevgSeries,
  jeanneLdlSeries,
  jeanneNtProBnpSeries,
  jeanneQtcSeries,
  jeanneTadSeries,
  jeanneTasSeries,
  jeanneWeightSeries,
} from "@/lib/mock/series";
import { TrendChart } from "@/components/charts/TrendChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateLong, patientDisplayName, ageAt } from "@/lib/format";

type Period = "6m" | "1a" | "all";

function filterByPeriod<T extends { date: string }>(series: T[], period: Period): T[] {
  const cut =
    period === "6m"
      ? new Date("2026-05-01")
      : period === "1a"
        ? new Date("2025-11-01")
        : new Date("1900-01-01");
  return series.filter((p) => new Date(p.date) >= cut);
}

export function PatientDossierClient({ patient }: { patient: Patient }) {
  const [period, setPeriod] = useState<Period>("1a");
  const isJeanne = patient.id === "CC-000184";

  const charts = useMemo(() => {
    if (!isJeanne) return null;
    const fevg = filterByPeriod(jeanneFevgSeries, period);
    const dates = [...new Set([...fevg.map((p) => p.date)])].sort();
    const taData = dates.map((date) => ({
      date,
      tas: jeanneTasSeries.find((p) => p.date === date)?.value ?? null,
      tad: jeanneTadSeries.find((p) => p.date === date)?.value ?? null,
    }));

    return {
      fevg: fevg.map((p) => ({ date: p.date, fevg: p.value })),
      ta: taData,
      fc: filterByPeriod(jeanneFcSeries, period).map((p) => ({ date: p.date, fc: p.value })),
      weight: filterByPeriod(jeanneWeightSeries, period).map((p) => ({ date: p.date, weight: p.value })),
      bnp: filterByPeriod(jeanneNtProBnpSeries, period).map((p) => ({ date: p.date, bnp: p.value })),
      dfg: filterByPeriod(jeanneDfgSeries, period).map((p) => ({ date: p.date, dfg: p.value })),
      qtc: filterByPeriod(jeanneQtcSeries, period).map((p) => ({ date: p.date, qtc: p.value })),
      ldl: filterByPeriod(jeanneLdlSeries, period).map((p) => ({ date: p.date, ldl: p.value })),
    };
  }, [isJeanne, period]);

  const age = ageAt(patient.birthDate, "2026-11-23");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {patientDisplayName(patient.firstName, patient.lastName)}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {age} ans · {patient.sex} · né(e) le {formatDateLong(patient.birthDate)} · {patient.id}
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[160px]" aria-label="Période des courbes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6m">6 mois</SelectItem>
            <SelectItem value="1a">1 an</SelectItem>
            <SelectItem value="all">Tout l&apos;historique</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="courbes">
        <TabsList>
          <TabsTrigger value="courbes">Courbes</TabsTrigger>
          <TabsTrigger value="synthese">Synthèse</TabsTrigger>
        </TabsList>
        <TabsContent value="synthese" className="bg-card border-border mt-4 rounded-2xl border p-4 text-sm">
          <p>
            <strong>Pathologies :</strong> {patient.pathologies.join(" · ")}
          </p>
          <p className="mt-2">
            <strong>Allergie :</strong> {patient.allergies.join(", ") || "aucune"}
          </p>
          {patient.alertLabel ? (
            <p className="text-warning mt-2 font-semibold">{patient.alertLabel}</p>
          ) : null}
        </TabsContent>
        <TabsContent value="courbes" className="mt-4 grid gap-4 lg:grid-cols-2">
          {charts ? (
            <>
              <ChartCard title="FEVG" ariaLabel="Évolution FEVG">
                <TrendChart
                  ariaLabel="FEVG"
                  unit="%"
                  data={charts.fevg}
                  series={[{ key: "fevg", label: "FEVG", color: "#0B4FB3" }]}
                  zones={[
                    { y1: 0, y2: 40, color: "#FDECEE" },
                    { y1: 40, y2: 50, color: "#FFF4E0" },
                    { y1: 50, y2: 100, color: "#E6F5EE" },
                  ]}
                  showArea
                />
              </ChartCard>
              <ChartCard title="Pression artérielle" ariaLabel="TAS et TAD">
                <TrendChart
                  ariaLabel="Pression artérielle"
                  unit="mmHg"
                  data={charts.ta}
                  series={[
                    { key: "tas", label: "TAS", color: "#E0313B" },
                    { key: "tad", label: "TAD", color: "#0B4FB3", strokeDasharray: "4 4" },
                  ]}
                  thresholds={[{ y: 140, label: "Cible TAS 140", color: "#B45309" }]}
                />
              </ChartCard>
              <ChartCard title="FC" ariaLabel="Fréquence cardiaque">
                <TrendChart
                  ariaLabel="FC"
                  unit="bpm"
                  data={charts.fc}
                  series={[{ key: "fc", label: "FC", color: "#0A1F44" }]}
                />
              </ChartCard>
              <ChartCard title="Poids" ariaLabel="Poids">
                <TrendChart
                  ariaLabel="Poids"
                  unit="kg"
                  data={charts.weight}
                  series={[{ key: "weight", label: "Poids", color: "#0F7A4D" }]}
                />
              </ChartCard>
              <ChartCard title="NT-proBNP" ariaLabel="NT-proBNP">
                <TrendChart
                  ariaLabel="NT-proBNP"
                  unit="pg/mL"
                  data={charts.bnp}
                  series={[{ key: "bnp", label: "NT-proBNP", color: "#B45309" }]}
                />
              </ChartCard>
              <ChartCard title="DFG" ariaLabel="DFG">
                <TrendChart
                  ariaLabel="DFG"
                  unit="mL/min"
                  data={charts.dfg}
                  series={[{ key: "dfg", label: "DFG", color: "#52627F" }]}
                  thresholds={[{ y: 45, label: "Seuil 45", color: "#D42A35" }]}
                />
              </ChartCard>
              <ChartCard title="QTc" ariaLabel="QTc">
                <TrendChart
                  ariaLabel="QTc"
                  unit="ms"
                  data={charts.qtc}
                  series={[{ key: "qtc", label: "QTc", color: "#0B4FB3" }]}
                />
              </ChartCard>
              <ChartCard title="LDL" ariaLabel="LDL">
                <TrendChart
                  ariaLabel="LDL"
                  unit="g/L"
                  data={charts.ldl}
                  series={[{ key: "ldl", label: "LDL", color: "#E0313B" }]}
                  thresholds={[{ y: 0.55, label: "Objectif 0,55", color: "#0F7A4D" }]}
                />
              </ChartCard>
            </>
          ) : (
            <p className="text-muted-foreground col-span-2 text-sm">
              Jeux de séries complets disponibles pour le dossier démo CC-000184.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartCard({
  title,
  ariaLabel,
  children,
}: {
  title: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border-border rounded-2xl border p-4" aria-label={ariaLabel}>
      <h2 className="mb-3 text-base font-extrabold">{title}</h2>
      {children}
    </section>
  );
}