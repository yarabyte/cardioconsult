import Link from "next/link";
import { listAgenda } from "@/server/agenda/service";
import { loadAgendaPatientMeta } from "@/server/agenda/patient-meta";
import { listOpenEncounterLinksByPatient } from "@/server/consultation/open-today";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { computeCabinetStats } from "@/server/services/stats/cabinet";
import { STATUS_LABELS, type AppointmentStatus } from "@/lib/agenda/status";
import { can } from "@/lib/rbac";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { ageAt, formatDateLong, formatNumber } from "@/lib/format";
import { AlertsToReview } from "@/components/clinical/AlertsToReview";
import { Button } from "@/components/ui/button";
import type { AgendaSlot } from "@/lib/agenda/types";

type Props = PageProps<"/t/[tenant]/tableau-de-bord">;

export const metadata = { title: "Tableau de bord" };

const AGENDA_VISIBLE = 8;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function prepSummary(prep: { vitals: boolean; ecg: boolean; weight: boolean }): {
  text: string;
  tone: "ready" | "partial" | "empty";
} {
  const parts: string[] = [];
  if (prep.vitals) parts.push("constantes");
  if (prep.ecg) parts.push("ECG");
  if (prep.weight) parts.push("poids");
  if (parts.length === 0) return { text: "—", tone: "empty" };
  const all = prep.vitals && prep.ecg && prep.weight;
  return {
    text: all ? `${parts.join(" + ")} prêts` : `${parts.join(" + ")} prêts`,
    tone: all || parts.length >= 2 ? "ready" : "partial",
  };
}

function statusTone(status: AppointmentStatus): "done" | "waiting" | "active" | "soon" | "muted" {
  if (status === "termine") return "done";
  if (status === "en_consultation") return "active";
  if (status === "arrive" || status === "en_preparation" || status === "pret") return "waiting";
  if (status === "prevu") return "soon";
  return "muted";
}

function statusBadgeClass(tone: ReturnType<typeof statusTone>): string {
  switch (tone) {
    case "done":
      return "bg-emerald-50 text-emerald-800";
    case "waiting":
      return "bg-amber-50 text-amber-800";
    case "active":
      return "bg-primary text-primary-foreground";
    case "soon":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusDisplayLabel(status: AppointmentStatus): string {
  if (status === "arrive" || status === "en_preparation" || status === "pret") {
    return "Salle d'attente";
  }
  if (status === "prevu") return "À venir";
  if (status === "en_consultation") return "En cours";
  return STATUS_LABELS[status];
}

function greetingName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  // Conservé tel quel (souvent « Dr … » déjà en base).
  return trimmed;
}

function patientSubline(
  meta: { birthDate: string | null; sex: string | null } | undefined,
  atIso: string,
): string | null {
  if (!meta) return null;
  const bits: string[] = [];
  if (meta.birthDate) {
    try {
      bits.push(`${ageAt(meta.birthDate, atIso)} ans`);
    } catch {
      /* ignore invalid date */
    }
  }
  if (meta.sex === "F" || meta.sex === "H") bits.push(meta.sex);
  else if (meta.sex && meta.sex !== "Autre") bits.push(meta.sex);
  return bits.length > 0 ? bits.join(" · ") : null;
}

export default async function TableauDeBordPage({ params }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "patient.read" });
  if (ctx.tenant.slug !== slug) return null;

  const subject = { role: ctx.role, isTenantAdmin: ctx.user.isTenantAdmin };
  const canStats = can(subject, "stats.read");

  const anchor = new Date().toISOString().slice(0, 10);
  const [agendaItems, stats, openByPatient] = await Promise.all([
    listAgenda(ctx.tenant.id, { view: "day", anchor }),
    computeCabinetStats(ctx.tenant.id, {
      actorId: ctx.user.id,
      isTenantAdmin: ctx.member?.isTenantAdmin ?? false,
    }),
    listOpenEncounterLinksByPatient(ctx.tenant.id, anchor),
  ]);

  const agenda = agendaItems
    .filter((a) => !a.adminBlock && !a.waitlist)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const patientMeta = await loadAgendaPatientMeta(
    ctx.tenant.id,
    agenda.map((a) => a.patientId),
  );

  const visible = agenda.slice(0, AGENDA_VISIBLE);
  const hiddenCount = Math.max(0, agenda.length - AGENDA_VISIBLE);

  const todayLabel = formatDateLong(new Date());
  const hello = greetingName(ctx.user.name);
  const rdvCount = agenda.length;
  const rdvLabel =
    rdvCount === 0
      ? "aucun rendez-vous aujourd'hui"
      : rdvCount === 1
        ? "1 rendez-vous aujourd'hui"
        : `${rdvCount} rendez-vous aujourd'hui`;

  const weeklyChart = stats.objectives.map((o, i) => ({
    semaine: `S${i + 1}`,
    consultations: o.pct,
    current: i === stats.objectives.length - 1,
  }));
  const motifChart = stats.objectives.map((o) => ({ label: o.label, pct: o.pct }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {hello ? `Bonjour ${hello}` : "Tableau de bord"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {todayLabel} · {rdvLabel}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/patients" />}>
          Voir les patients
        </Button>
      </header>

      <section aria-label="Indicateurs clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Consultations ce mois"
          value={formatNumber(stats.consultationsThisMonth)}
          hint={
            stats.consultationsThisMonth > 0
              ? "Depuis le 1er du mois"
              : "Aucune consultation ce mois"
          }
          spark={[stats.consultationsThisMonth, stats.fileActive, stats.icCohortSize, 0]}
          color="#0B4FB3"
          href={canStats ? "/statistiques" : undefined}
        />
        <KpiCard
          label="Patients IC suivis"
          value={formatNumber(stats.icCohortSize)}
          hint={stats.icCohortSize > 0 ? "FEVG < 40 % (ETT)" : "Cohorte vide"}
          spark={[stats.icCohortSize, stats.fileActive, 0, 0]}
          color="#E0313B"
        />
        <KpiCard
          label="File active"
          value={formatNumber(stats.fileActive)}
          hint="Patients non archivés · ouvrir la liste"
          spark={[stats.fileActive, 0, 0, 0]}
          color="#0F7A4D"
          href="/patients"
        />
        <KpiCard
          label="CR signés"
          value={`${stats.crSignedPct} %`}
          hint={`Ordonnances validées : ${stats.rxValidatedPct} % · documents`}
          spark={[stats.crSignedPct, stats.rxValidatedPct, 0, 0]}
          color="#B45309"
          href="#documents-a-valider"
        />
      </section>

      <div className="flex flex-col gap-4 xl:flex-row">
        <section className="surface-card min-w-0 flex-3">
          <div className="border-separator flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-extrabold">Agenda du jour</h2>
            <Link href="/agenda" className="text-primary text-sm font-bold">
              Ouvrir l&apos;agenda
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-5 py-3 font-bold">Heure</th>
                  <th className="px-2 py-3 font-bold">Patient</th>
                  <th className="px-2 py-3 font-bold">Motif</th>
                  <th className="px-2 py-3 font-bold">Préparation IDE</th>
                  <th className="px-5 py-3 font-bold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {agenda.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-5 py-8 text-center">
                      Aucun rendez-vous aujourd&apos;hui.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <AgendaRow
                      key={row.id}
                      row={row}
                      subline={patientSubline(
                        row.patientId ? patientMeta.get(row.patientId) : undefined,
                        row.startsAt,
                      )}
                      resumeHref={
                        row.patientId ? openByPatient.get(row.patientId)?.href : undefined
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {hiddenCount > 0 ? (
            <div className="border-separator border-t px-5 py-3">
              <Link href="/agenda" className="text-primary text-sm font-bold">
                +{hiddenCount} autre{hiddenCount > 1 ? "s" : ""} — ouvrir l&apos;agenda
              </Link>
            </div>
          ) : null}
        </section>

        <div className="flex-2 space-y-4">
          <AlertsToReview />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="surface-card flex-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-extrabold">Consultations par semaine</h2>
            <span className="text-muted-foreground text-xs">Semaine en cours mise en évidence</span>
          </div>
          {weeklyChart.length > 0 ? (
            <>
              <BarTrendChart
                ariaLabel="Consultations par semaine"
                data={weeklyChart}
                xKey="semaine"
                yKey="consultations"
                highlightKey="current"
                height={240}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Légende : barre mise en avant = semaine en cours.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground mt-6 text-sm">
              Indicateur non encore alimenté en base.
            </p>
          )}
        </section>
        <section className="surface-card flex-2 p-5">
          <h2 className="text-base font-extrabold">Motifs (12 mois)</h2>
          {motifChart.length > 0 ? (
            <>
              <DonutChart
                ariaLabel="Répartition des motifs"
                data={motifChart.map((m) => ({ label: m.label, value: m.pct }))}
              />
              <p className="text-muted-foreground mt-2 text-center text-xs">
                {formatNumber(stats.consultationsThisMonth)} consultations ce mois
              </p>
            </>
          ) : (
            <p className="text-muted-foreground mt-6 text-sm">Aucune répartition disponible.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function AgendaRow({
  row,
  subline,
  resumeHref,
}: {
  row: AgendaSlot;
  subline: string | null;
  resumeHref?: string;
}) {
  const tone = statusTone(row.status);
  const prep = prepSummary(row.prep);
  const showResume =
    Boolean(resumeHref) &&
    (row.status === "en_consultation" || row.status === "pret" || row.status === "en_preparation");
  const highlight = row.status === "en_consultation";

  return (
    <tr className={`border-separator border-t ${highlight ? "bg-primary/4" : ""}`}>
      <td className="px-5 py-3 font-bold tabular-nums">{timeLabel(row.startsAt)}</td>
      <td className="px-2 py-3">
        {row.patientId ? (
          <Link
            href={`/patients/${row.patientId}`}
            className="hover:text-primary font-semibold text-[var(--foreground)] hover:underline"
          >
            {row.patientLabel}
          </Link>
        ) : (
          <span className="font-semibold">{row.patientLabel}</span>
        )}
        {subline ? <p className="text-muted-foreground mt-0.5 text-xs">{subline}</p> : null}
      </td>
      <td className="px-2 py-3">{row.motif || "—"}</td>
      <td
        className={`px-2 py-3 text-sm font-semibold ${
          prep.tone === "ready"
            ? "text-emerald-700"
            : prep.tone === "partial"
              ? "text-amber-700"
              : "text-muted-foreground font-normal"
        }`}
      >
        {prep.text}
      </td>
      <td className="px-5 py-3">
        {showResume && resumeHref ? (
          <Link
            href={resumeHref}
            className="bg-primary text-primary-foreground inline-flex rounded-full px-3 py-1.5 text-xs font-bold no-underline"
          >
            Reprendre
          </Link>
        ) : (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(tone)}`}
          >
            {statusDisplayLabel(row.status)}
          </span>
        )}
      </td>
    </tr>
  );
}

function KpiCard({
  label,
  value,
  hint,
  spark,
  color,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  spark: number[];
  color: string;
  href?: string;
}) {
  const inner = (
    <>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="pl-2">
        <p className="text-muted-foreground text-[13px] font-semibold">{label}</p>
        <p className="mt-1 text-[1.85rem] font-extrabold tracking-tight tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-1.5 text-xs font-semibold">{hint}</p>
      </div>
      <Sparkline points={spark} color={color} ariaLabel={`Tendance ${label}`} />
    </>
  );

  const className =
    "surface-card relative flex items-end justify-between gap-3 overflow-hidden p-5 transition-colors";

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} hover:border-primary/30 text-inherit no-underline`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
