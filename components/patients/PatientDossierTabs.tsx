"use client";

import Link from "next/link";
import type { Patient } from "@/types/domain";
import { TrendChart } from "@/components/charts/TrendChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateLong, formatDateTime, formatNumber } from "@/lib/format";
import type { loadLongitudinalAction } from "@/server/actions/dossier";
import type { SeriesPeriod } from "@/lib/dossier/series";

type DossierOk = Extract<
  Awaited<ReturnType<typeof loadLongitudinalAction>>,
  { ok: true }
>["dossier"];

const STATUS_FR: Record<string, string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  signe: "Signé",
  annule: "Annulé",
  remplace: "Remplacé",
  en_cours: "En cours",
  termine: "Clôturée",
  cloturee: "Clôturée",
};

const KIND_FR: Record<string, string> = {
  consultation: "Consultation",
  examen: "Examen",
  hospitalisation: "Hospitalisation",
  ordonnance: "Ordonnance",
  compte_rendu: "Compte rendu",
};

function statusLabel(s: string | null | undefined) {
  if (!s) return "—";
  return STATUS_FR[s] ?? s;
}

const ACCESS_ACTION_FR: Record<string, string> = {
  "patient.open": "Ouverture du dossier",
  "patient.update": "Modification du dossier",
  "patient.export": "Export du dossier",
  "patient.archive": "Archivage",
};

const ROLE_FR: Record<string, string> = {
  MEDECIN: "Médecin",
  INFIRMIERE: "Infirmière",
  SUPERADMIN: "Support",
};

function accessActionLabel(action: string) {
  return ACCESS_ACTION_FR[action] ?? action;
}

function accessActorLabel(e: {
  actorLabel?: string | null;
  actorRole?: string | null;
  actorId?: string | null;
}) {
  const role = e.actorRole ? (ROLE_FR[e.actorRole] ?? e.actorRole) : null;
  if (e.actorLabel?.trim()) {
    return role ? `${e.actorLabel.trim()} · ${role}` : e.actorLabel.trim();
  }
  return role ?? "Acteur non renseigné";
}

export function PatientDossierTabs({
  patient,
  dossier,
  accessLog,
  period,
  loading,
}: {
  patient: Patient;
  dossier: DossierOk | null;
  accessLog: {
    id: string;
    at: string;
    action: string;
    actorId: string | null | undefined;
    actorRole?: string | null;
    actorLabel?: string | null;
  }[];
  period: SeriesPeriod;
  loading?: boolean;
}) {
  const series = dossier?.series;
  const highlights = dossier?.highlights;
  const docsCount = dossier?.documents.length ?? 0;
  const txCount = dossier?.treatments.length ?? 0;
  const timelineCount = dossier?.timeline.length ?? 0;
  const consultCount = dossier?.consultations.length ?? 0;
  const periodLabel = period === "6m" ? "6 mois" : period === "1a" ? "1 an" : "tout l’historique";

  const chartRows = (key: string, valueKey: string) =>
    (series?.[key] ?? []).map((p) => ({
      date: p.date,
      [valueKey]: p.value,
      source: p.source ?? null,
    }));

  const hasSeries = series && Object.values(series).some((s) => s.length > 0);

  return (
    <Tabs defaultValue="synthese" className="gap-0">
      <TabsList
        variant="line"
        className="border-border h-auto w-full flex-wrap justify-start gap-0 rounded-none border-b bg-transparent p-0"
      >
        {(
          [
            { value: "synthese", label: "Synthèse" },
            {
              value: "consultations",
              label: "Consultations",
              count: consultCount,
            },
            { value: "traitements", label: "Traitements", count: txCount },
            { value: "documents", label: "Documents", count: docsCount },
            { value: "chronologie", label: "Chronologie", count: timelineCount },
            { value: "courbes", label: "Courbes" },
            { value: "comparaison", label: "Comparaison" },
            { value: "acces", label: "Accès dossier" },
          ] as const
        ).map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-none rounded-none px-2.5 py-2 text-[13px] font-semibold"
          >
            {tab.label}
            {"count" in tab && tab.count > 0 ? (
              <span className="text-muted-foreground ml-0.5 text-[11px] tabular-nums">
                ({tab.count})
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>

      {loading && !dossier ? (
        <p className="text-muted-foreground mt-6 text-sm">Chargement du dossier…</p>
      ) : null}

      <TabsContent value="synthese" className="mt-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-3">
            <section className="surface-card space-y-2 p-3.5">
              <h2 className="text-sm font-extrabold">Problèmes actifs</h2>
              {(dossier?.problemDetails.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun problème renseigné.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {dossier?.problemDetails.map((p) => (
                    <li key={`${p.label}-${p.since ?? ""}`}>
                      <p className="font-bold">{p.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {[p.status, p.since ? `depuis ${formatDateLong(p.since)}` : null, p.comment]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="surface-card space-y-2 p-3.5">
              <h2 className="text-sm font-extrabold">Allergies & alertes</h2>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const allergies = [
                    ...new Set([...patient.allergies, ...(dossier?.draftAllergies ?? [])]),
                  ];
                  if (allergies.length === 0) {
                    return <Badge variant="secondary">Aucune allergie renseignée</Badge>;
                  }
                  return allergies.map((a) => (
                    <Badge key={a} variant="destructive">
                      Allergie : {a}
                    </Badge>
                  ));
                })()}
                {patient.alertLabel ? (
                  <Badge variant="outline" className="border-warning text-warning">
                    {patient.alertLabel}
                  </Badge>
                ) : null}
              </div>
            </section>

            <section className="surface-card space-y-2 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold">Traitement en cours</h2>
                {txCount > 0 ? (
                  <span className="text-muted-foreground text-xs">{txCount} ligne(s)</span>
                ) : null}
              </div>
              {(dossier?.treatments.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun traitement en cours.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {dossier?.treatments.slice(0, 6).map((t, i) => (
                    <li key={`${t.dci}-${i}`} className="min-w-0">
                      <p className="font-semibold">
                        {t.dci}
                        {t.dosage ? (
                          <span className="text-muted-foreground font-medium"> · {t.dosage}</span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                        {t.frequency?.trim() || "Posologie non renseignée"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-3">
            <section className="surface-card p-3.5">
              <h2 className="mb-2 text-sm font-extrabold">Repères cliniques</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Highlight
                  label="FEVG"
                  value={
                    highlights?.fevgPct != null ? `${formatNumber(highlights.fevgPct)} %` : null
                  }
                />
                <Highlight
                  label="TA"
                  value={
                    highlights?.tas != null && highlights?.tad != null
                      ? `${highlights.tas}/${highlights.tad}`
                      : null
                  }
                  unit="mmHg"
                />
                <Highlight
                  label="FC"
                  value={highlights?.fc != null ? String(highlights.fc) : null}
                  unit="bpm"
                />
                <Highlight
                  label="Poids"
                  value={highlights?.weightKg != null ? formatNumber(highlights.weightKg) : null}
                  unit="kg"
                />
                <Highlight
                  label="NT-proBNP"
                  value={highlights?.ntprobnp != null ? formatNumber(highlights.ntprobnp) : null}
                  unit="pg/mL"
                />
                <Highlight
                  label="DFG"
                  value={highlights?.dfg != null ? formatNumber(highlights.dfg) : null}
                  unit="mL/min"
                />
              </div>
              {highlights?.asOf ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  Dernière mise à jour · {formatDateLong(highlights.asOf)}
                </p>
              ) : null}
            </section>

            <section className="surface-card p-3.5">
              <h2 className="mb-1 text-sm font-extrabold">Chronologie récente</h2>
              <p className="text-muted-foreground mb-2 text-xs">Période · {periodLabel}</p>
              {(dossier?.timeline.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune entrée sur cette période.</p>
              ) : (
                <ol className="border-border relative space-y-2.5 border-l-2 pl-4">
                  {dossier?.timeline.slice(0, 5).map((e) => (
                    <li key={e.id} className="relative text-sm">
                      <span className="bg-primary border-background absolute top-1.5 -left-[1.15rem] size-2.5 rounded-full border-2" />
                      <p className="text-muted-foreground text-xs tabular-nums">{e.at}</p>
                      <p className="font-semibold">
                        {KIND_FR[e.kind] ?? e.kind}
                        {e.status ? ` · ${statusLabel(e.status)}` : ""}
                      </p>
                      {e.href ? (
                        <Link
                          href={e.href}
                          className="text-primary text-sm underline-offset-2 hover:underline"
                        >
                          {e.label}
                        </Link>
                      ) : (
                        <p>{e.label}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="consultations" className="mt-3">
        <section className="surface-card p-3.5">
          <h2 className="mb-1 text-sm font-extrabold">Consultations</h2>
          <p className="text-muted-foreground mb-2.5 text-xs">
            Période · {periodLabel}
            {period !== "all"
              ? " — choisissez « Toutes les consultations » pour tout l’historique."
              : null}
          </p>
          {(dossier?.consultations.length ?? 0) === 0 ? (
            <EmptyState message="Aucune consultation sur cette période." />
          ) : (
            <ul className="divide-border divide-y">
              {dossier?.consultations.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold tabular-nums">{formatDateLong(c.at)}</span>
                      <Badge variant="secondary">{statusLabel(c.status)}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {c.motif?.trim() || "Motif non renseigné"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" render={<Link href={c.href} />}>
                    Ouvrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>

      <TabsContent value="traitements" className="mt-3">
        <section className="surface-card p-3.5">
          <h2 className="mb-1 text-sm font-extrabold">Traitements en cours</h2>
          <p className="text-muted-foreground mb-2.5 text-xs">
            Issus de l’ordonnance validée ou du brouillon de consultation.
          </p>
          {(dossier?.treatments.length ?? 0) === 0 ? (
            <EmptyState message="Aucun traitement en cours renseigné." />
          ) : (
            <ul className="divide-border divide-y">
              {dossier?.treatments.map((t, i) => (
                <li
                  key={`${t.dci}-${i}`}
                  className="flex flex-wrap items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    {t.href ? (
                      <Link
                        href={t.href}
                        className="text-primary text-sm font-bold underline-offset-2 hover:underline"
                      >
                        {t.dci}
                      </Link>
                    ) : (
                      <p className="text-sm font-bold">{t.dci}</p>
                    )}
                    {t.dosage ? (
                      <p className="text-sm font-semibold tabular-nums">{t.dosage}</p>
                    ) : null}
                    <p className="text-muted-foreground text-sm leading-snug">
                      {t.frequency?.trim() || "Posologie non renseignée"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Mis à jour le {formatDateTime(t.updatedAt)}
                      {t.updatedBy ? ` · ${t.updatedBy}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>

      <TabsContent value="documents" className="mt-3">
        <section className="surface-card p-3.5">
          <h2 className="mb-2.5 text-sm font-extrabold">Ordonnances & comptes rendus</h2>
          {(dossier?.documents.length ?? 0) === 0 ? (
            <EmptyState message="Aucune ordonnance ni compte rendu enregistré." />
          ) : (
            <ul className="space-y-2">
              {dossier?.documents.map((d) => (
                <li
                  key={d.id}
                  className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {d.kind === "ordonnance" ? "Ordonnance" : "Compte rendu"}
                      </Badge>
                      <Badge variant="outline">{statusLabel(d.status)}</Badge>
                    </div>
                    <p className="truncate text-sm font-bold">{d.title}</p>
                    <p className="text-muted-foreground text-xs">{formatDateLong(d.at)}</p>
                  </div>
                  <Button size="sm" variant="outline" render={<Link href={d.href} />}>
                    Ouvrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>

      <TabsContent value="chronologie" className="mt-3">
        <section className="surface-card p-3.5">
          <h2 className="mb-1 text-sm font-extrabold">Chronologie du dossier</h2>
          <p className="text-muted-foreground mb-2.5 text-xs">Période · {periodLabel}</p>
          {(dossier?.timeline.length ?? 0) === 0 ? (
            <EmptyState message="Aucune entrée chronologique sur cette période." />
          ) : (
            <ol className="border-border relative space-y-2.5 border-l-2 pl-4">
              {dossier?.timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={
                      e.kind === "hospitalisation"
                        ? "bg-destructive border-background absolute top-1.5 -left-[1.15rem] size-2.5 rounded-full border-2"
                        : e.kind === "examen"
                          ? "bg-chart-2 border-background absolute top-1.5 -left-[1.15rem] size-2.5 rounded-full border-2"
                          : "bg-primary border-background absolute top-1.5 -left-[1.15rem] size-2.5 rounded-full border-2"
                    }
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs tabular-nums">{e.at}</span>
                    <Badge variant="secondary">{KIND_FR[e.kind] ?? e.kind}</Badge>
                    {e.status ? (
                      <span className="text-muted-foreground text-xs">{statusLabel(e.status)}</span>
                    ) : null}
                  </div>
                  {e.href ? (
                    <Link
                      href={e.href}
                      className="text-primary mt-0.5 inline-block text-sm font-semibold underline-offset-2 hover:underline"
                    >
                      {e.label}
                    </Link>
                  ) : (
                    <p className="mt-0.5 text-sm font-semibold">{e.label}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </TabsContent>

      <TabsContent value="courbes" className="mt-3">
        <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold">Courbes de suivi</h2>
            <p className="text-muted-foreground text-xs">Période · {periodLabel}</p>
          </div>
        </div>
        {hasSeries ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {(series?.fevg?.length ?? 0) > 0 ? (
              <ChartCard
                title="FEVG"
                hint="% · zones &lt; 40 / 40–49 / ≥ 50"
                ariaLabel="Évolution FEVG"
              >
                <TrendChart
                  ariaLabel="FEVG"
                  unit="%"
                  data={chartRows("fevg", "fevg")}
                  series={[{ key: "fevg", label: "FEVG", color: "#0B4FB3" }]}
                  zones={[
                    { y1: 0, y2: 40, color: "#FDECEE" },
                    { y1: 40, y2: 50, color: "#FFF4E0" },
                    { y1: 50, y2: 100, color: "#E6F5EE" },
                  ]}
                  showArea
                />
              </ChartCard>
            ) : null}
            {(series?.tas?.length ?? 0) > 0 ? (
              <ChartCard title="Pression artérielle" hint="mmHg" ariaLabel="TAS et TAD">
                <TrendChart
                  ariaLabel="Pression artérielle"
                  unit="mmHg"
                  data={(series?.tas ?? []).map((p) => ({
                    date: p.date,
                    tas: p.value,
                    tad: series?.tad?.find((x) => x.date === p.date)?.value ?? null,
                    source: p.source ?? null,
                  }))}
                  series={[
                    { key: "tas", label: "TAS", color: "#E0313B" },
                    { key: "tad", label: "TAD", color: "#0B4FB3", strokeDasharray: "4 4" },
                  ]}
                  thresholds={[{ y: 140, label: "Cible TAS 140", color: "#B45309" }]}
                />
              </ChartCard>
            ) : null}
            {(series?.fc?.length ?? 0) > 0 ? (
              <ChartCard title="FC" hint="bpm" ariaLabel="Fréquence cardiaque">
                <TrendChart
                  ariaLabel="FC"
                  unit="bpm"
                  data={chartRows("fc", "fc")}
                  series={[{ key: "fc", label: "FC", color: "#0A1F44" }]}
                />
              </ChartCard>
            ) : null}
            {(series?.weight?.length ?? 0) > 0 ? (
              <ChartCard title="Poids" hint="kg" ariaLabel="Poids">
                <TrendChart
                  ariaLabel="Poids"
                  unit="kg"
                  data={chartRows("weight", "weight")}
                  series={[{ key: "weight", label: "Poids", color: "#0F7A4D" }]}
                />
              </ChartCard>
            ) : null}
            {(series?.ntprobnp?.length ?? 0) > 0 ? (
              <ChartCard title="NT-proBNP" hint="pg/mL" ariaLabel="NT-proBNP">
                <TrendChart
                  ariaLabel="NT-proBNP"
                  unit="pg/mL"
                  data={chartRows("ntprobnp", "bnp")}
                  series={[{ key: "bnp", label: "NT-proBNP", color: "#B45309" }]}
                />
              </ChartCard>
            ) : null}
            {(series?.dfg?.length ?? 0) > 0 ? (
              <ChartCard title="DFG" hint="mL/min" ariaLabel="DFG">
                <TrendChart
                  ariaLabel="DFG"
                  unit="mL/min"
                  data={chartRows("dfg", "dfg")}
                  series={[{ key: "dfg", label: "DFG", color: "#52627F" }]}
                  thresholds={[{ y: 45, label: "Seuil 45", color: "#D42A35" }]}
                />
              </ChartCard>
            ) : null}
            {(series?.qtc?.length ?? 0) > 0 ? (
              <ChartCard title="QTc" hint="ms" ariaLabel="QTc">
                <TrendChart
                  ariaLabel="QTc"
                  unit="ms"
                  data={chartRows("qtc", "qtc")}
                  series={[{ key: "qtc", label: "QTc", color: "#0B4FB3" }]}
                />
              </ChartCard>
            ) : null}
            {(series?.ldl?.length ?? 0) > 0 ? (
              <ChartCard title="LDL" hint="g/L" ariaLabel="LDL">
                <TrendChart
                  ariaLabel="LDL"
                  unit="g/L"
                  data={chartRows("ldl", "ldl")}
                  series={[{ key: "ldl", label: "LDL", color: "#E0313B" }]}
                  thresholds={[{ y: 0.55, label: "Objectif 0,55", color: "#0F7A4D" }]}
                />
              </ChartCard>
            ) : null}
            {(series?.aorteAsc?.length ?? 0) > 0 ? (
              <ChartCard title="Aorte ascendante" hint="mm" ariaLabel="Diamètre aorte ascendante">
                <TrendChart
                  ariaLabel="Aorte ascendante"
                  unit="mm"
                  data={chartRows("aorteAsc", "asc")}
                  series={[{ key: "asc", label: "Ascendante", color: "#E0313B" }]}
                  thresholds={[
                    { y: 50, label: "50 mm", color: "#B45309" },
                    { y: 55, label: "55 mm", color: "#D42A35" },
                  ]}
                />
              </ChartCard>
            ) : null}
            {(series?.aorteSinus?.length ?? 0) > 0 ? (
              <ChartCard title="Sinus de Valsalva" hint="mm" ariaLabel="Diamètre sinus">
                <TrendChart
                  ariaLabel="Sinus"
                  unit="mm"
                  data={chartRows("aorteSinus", "sinus")}
                  series={[{ key: "sinus", label: "Sinus", color: "#0B4FB3" }]}
                />
              </ChartCard>
            ) : null}
          </div>
        ) : (
          <EmptyState message="Aucune série pour ce patient / cette période." />
        )}
      </TabsContent>

      <TabsContent value="comparaison" className="mt-3">
        <section className="surface-card overflow-x-auto p-3.5">
          <h2 className="mb-1 text-sm font-extrabold">Comparaison chronologique</h2>
          <p className="text-muted-foreground mb-2.5 text-xs">
            Trois dernières mesures disponibles par indicateur.
          </p>
          {(dossier?.comparison.length ?? 0) === 0 ? (
            <EmptyState message="Pas assez de mesures pour comparer." />
          ) : (
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Mesure</th>
                  <th className="pr-3 font-semibold">Date 1</th>
                  <th className="pr-3 font-semibold">Date 2</th>
                  <th className="pr-3 font-semibold">Date 3</th>
                  <th className="font-semibold">Δ (3−1)</th>
                </tr>
              </thead>
              <tbody>
                {(dossier?.comparison ?? []).map((row) => (
                  <tr key={row.metric} className="border-border border-t">
                    <td className="py-2 pr-3 font-semibold">
                      {row.metric}
                      <span className="text-muted-foreground font-normal"> ({row.unit})</span>
                    </td>
                    <td className="pr-3 tabular-nums">
                      {row.d1 ?? "—"}
                      <span className="text-muted-foreground block text-[10px]">
                        {row.dates[0] ?? ""}
                      </span>
                    </td>
                    <td className="pr-3 tabular-nums">
                      {row.d2 ?? "—"}
                      <span className="text-muted-foreground block text-[10px]">
                        {row.dates[1] ?? ""}
                      </span>
                    </td>
                    <td className="pr-3 tabular-nums">
                      {row.d3 ?? "—"}
                      <span className="text-muted-foreground block text-[10px]">
                        {row.dates[2] ?? ""}
                      </span>
                    </td>
                    <td
                      className={
                        row.delta == null
                          ? "font-bold tabular-nums"
                          : row.delta > 0
                            ? "text-warning font-bold tabular-nums"
                            : row.delta < 0
                              ? "text-success font-bold tabular-nums"
                              : "font-bold tabular-nums"
                      }
                    >
                      {row.delta == null ? "—" : row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </TabsContent>

      <TabsContent value="acces" className="mt-3">
        <section className="surface-card p-3.5">
          <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold">Historique des accès</h2>
              <p className="text-muted-foreground text-xs">
                Qui a ouvert ce dossier — visible avec le droit journal d’audit.
              </p>
            </div>
            {accessLog.length > 0 ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {accessLog.length} événement{accessLog.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          {accessLog.length === 0 ? (
            <EmptyState message="Aucun accès journalisé ou permission insuffisante." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-muted-foreground text-[11px] tracking-wide uppercase">
                  <tr className="border-border border-b">
                    <th className="py-1.5 pr-3 font-semibold">Date</th>
                    <th className="py-1.5 pr-3 font-semibold">Action</th>
                    <th className="py-1.5 font-semibold">Acteur</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLog.map((e) => (
                    <tr key={e.id} className="border-border border-b last:border-0">
                      <td className="text-muted-foreground py-1.5 pr-3 align-middle text-xs whitespace-nowrap tabular-nums">
                        {formatDateTime(e.at)}
                      </td>
                      <td className="py-1.5 pr-3 align-middle">
                        <Badge variant="secondary" className="font-semibold">
                          {accessActionLabel(e.action)}
                        </Badge>
                      </td>
                      <td className="max-w-[220px] truncate py-1.5 align-middle text-xs font-medium">
                        {accessActorLabel(e)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </TabsContent>
    </Tabs>
  );
}

function Highlight({ label, value, unit }: { label: string; value: string | null; unit?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-2.5 py-2">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-extrabold tabular-nums">
        {value ?? "—"}
        {value && unit ? (
          <span className="text-muted-foreground ml-1 text-[11px] font-semibold">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-border bg-muted/20 rounded-lg border border-dashed px-3 py-5 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  ariaLabel,
  children,
}: {
  title: string;
  hint?: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-3.5" aria-label={ariaLabel}>
      <div className="mb-2">
        <h3 className="text-sm font-extrabold">{title}</h3>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
