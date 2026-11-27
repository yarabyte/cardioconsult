"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateShort, formatNumber } from "@/lib/format";
import { exportStatsCsvAction, loadCabinetStatsAction } from "@/server/actions/stats";
import type { CabinetStats } from "@/server/services/stats/cabinet";

export function StatsClient() {
  const [stats, setStats] = useState<CabinetStats | null>(null);
  const [pending, start] = useTransition();
  const [stepUp, setStepUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    start(async () => {
      const r = await loadCabinetStatsAction();
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      setError(null);
      setStats(r.stats);
    });
  }, []);

  if (error && !stats) {
    return (
      <p className="text-destructive text-sm">Impossible de charger les statistiques : {error}</p>
    );
  }

  if (!stats) {
    return <p className="text-muted-foreground text-sm">Chargement des agrégats cabinet…</p>;
  }

  const avgPerMonth =
    stats.consultationsLast12Months > 0 ? Math.round(stats.consultationsLast12Months / 12) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Statistiques du cabinet
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Agrégats calculés depuis vos dossiers · généré le {formatDateShort(stats.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-semibold">
            Données réelles
          </Badge>
          {!stepUp ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setStepUp(true)}
            >
              Exporter CSV
            </Button>
          ) : (
            <div className="border-border flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 text-xs">
              <span className="text-muted-foreground">Ré-auth. export</span>
              <Button
                type="button"
                size="sm"
                className="h-7"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await exportStatsCsvAction({ stepUpConfirmed: true });
                    setStepUp(false);
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "stats-cabinet.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`Export OK · ${r.maskedCount} cellule(s) masquée(s) (< 5)`);
                  })
                }
              >
                Confirmer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => setStepUp(false)}
              >
                Annuler
              </Button>
            </div>
          )}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="File active"
          value={formatNumber(stats.fileActive)}
          hint={`patients vus · 12 mois (sur ${formatNumber(stats.patientsTotal)})`}
        />
        <StatCard
          label="Consultations"
          value={formatNumber(stats.consultationsThisMonth)}
          hint={`ce mois · ${formatNumber(stats.consultationsLast12Months)} / 12 mois`}
        />
        <StatCard
          label="Moyenne / mois"
          value={formatNumber(avgPerMonth)}
          hint="sur les 12 derniers mois"
        />
        <StatCard
          label="ETT avec FEVG"
          value={formatNumber(stats.echoCount)}
          hint={`cohorte IC (FEVG < 40 %) : ${stats.icCohortSize}`}
        />
        <StatCard
          label="Clôture"
          value={`${stats.closedPct} %`}
          hint="consultations terminées · 12 mois"
        />
      </section>

      <section className="bg-card border-border rounded-xl border p-3.5">
        <h2 className="text-sm font-extrabold">Consultations par mois</h2>
        <p className="text-muted-foreground mb-2 text-xs">Volume réel des 12 derniers mois</p>
        {stats.encountersByMonth.every((r) => r.value === 0) ? (
          <p className="text-muted-foreground text-sm">Aucune consultation sur la période.</p>
        ) : (
          <BarTrendChart
            ariaLabel="Consultations par mois"
            data={stats.encountersByMonth}
            xKey="label"
            yKey="value"
            height={200}
          />
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="bg-card border-border rounded-xl border p-3.5">
          <h2 className="text-sm font-extrabold">Distribution FEVG</h2>
          <p className="text-muted-foreground mb-2 text-xs">
            Dernière ETT par patient · sans FEVG : {stats.fevg.incompleteCount}
          </p>
          {stats.fevg.complete.every((r) => r.value === 0) ? (
            <p className="text-muted-foreground text-sm">Aucune FEVG documentée dans les ETT.</p>
          ) : (
            <>
              <BarTrendChart
                ariaLabel="Distribution FEVG"
                data={stats.fevg.complete}
                xKey="label"
                yKey="value"
                height={200}
              />
              <AltDistTable caption="Tableau alternatif FEVG" rows={stats.fevg.complete} />
            </>
          )}
        </section>
        <section className="bg-card border-border rounded-xl border p-3.5">
          <h2 className="text-sm font-extrabold">CHA₂DS₂-VA</h2>
          <p className="text-muted-foreground mb-2 text-xs">
            Dernier score enregistré par patient · incomplets : {stats.cha2ds2.incompleteCount}
          </p>
          {stats.cha2ds2.complete.every((r) => r.value === 0) ? (
            <p className="text-muted-foreground text-sm">
              Aucun CHA₂DS₂-VA calculé — saisissez-le dans la rubrique Scores.
            </p>
          ) : (
            <>
              <BarTrendChart
                ariaLabel="Distribution CHA2DS2VA"
                data={stats.cha2ds2.complete}
                xKey="label"
                yKey="value"
                height={200}
              />
              <AltDistTable caption="Tableau alternatif CHA2DS2VA" rows={stats.cha2ds2.complete} />
            </>
          )}
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="bg-card border-border space-y-3 rounded-xl border p-3.5">
          <div>
            <h2 className="text-sm font-extrabold">Qualité documentaire</h2>
            <p className="text-muted-foreground text-xs">
              Indicateurs calculés sur les dossiers du cabinet (pas d’objectifs thérapeutiques
              inventés).
            </p>
          </div>
          {stats.objectives.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between gap-2 text-sm font-semibold">
                <span className="min-w-0">{row.label}</span>
                <span className="shrink-0 tabular-nums">{row.pct} %</span>
              </div>
              <Progress value={row.pct} className="h-2" />
            </div>
          ))}
          <p className="text-muted-foreground text-[11px]">
            CR : {stats.crSignedPct} % sur {stats.crTotal} · Ordonnances : {stats.rxValidatedPct} %
            sur {stats.rxTotal}
          </p>
        </section>

        <section className="bg-card border-border rounded-xl border p-3.5">
          <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold">Patients à rappeler</h2>
              <p className="text-muted-foreground text-xs">
                IC FEVG &lt; 40 % sans consultation &gt; 6 mois, ou alerte ouverte
              </p>
            </div>
            {stats.recallList.length > 0 ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {stats.recallList.length}
              </span>
            ) : null}
          </div>
          {stats.recallList.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun patient à rappeler pour ces critères.
            </p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {stats.recallList.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-bold">{p.label}</p>
                    <p className="text-muted-foreground text-xs leading-snug">{p.reason}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {p.lastVisit
                        ? `Dernière consultation · ${formatDateShort(p.lastVisit)}`
                        : "Pas de consultation"}
                      {p.fevgPct != null ? ` · FEVG ${p.fevgPct} %` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    render={<Link href={`/patients/${p.id}`} />}
                  >
                    Dossier
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card border-border rounded-xl border p-3.5">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">{hint}</p>
    </div>
  );
}

function AltDistTable({
  caption,
  rows,
}: {
  caption: string;
  rows: { label: string; value: number }[];
}) {
  return (
    <table className="text-muted-foreground mt-2 w-full text-[11px]">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="py-1 text-left font-semibold">
            Classe
          </th>
          <th scope="col" className="py-1 text-right font-semibold">
            Effectif
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-border border-t">
            <td className="py-1">{r.label}</td>
            <td className="py-1 text-right tabular-nums">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
