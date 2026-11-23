import Link from "next/link";
import { MockAgendaRepository, MockTenantRepository } from "@/lib/data/repositories";
import { TENANT_MARTIN_ID } from "@/lib/mock/patients";
import { consultationsParSemaine, motifs12Mois } from "@/lib/mock/series";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Props = PageProps<"/t/[tenant]/tableau-de-bord">;

export const metadata = { title: "Tableau de bord" };

export default async function TableauDeBordPage({ params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await MockTenantRepository.getBySlug(slug);
  if (!tenant || tenant.id !== TENANT_MARTIN_ID) return null;

  const agenda = (await MockAgendaRepository.listWeek(tenant.id)).filter((a) => a.day.startsWith("Lun"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1 text-sm">Lundi 23 novembre 2026 · cabinet fictif</p>
      </div>

      <section aria-label="Indicateurs clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Consultations ce mois" value="312" hint="+8 % vs octobre" spark={[31, 26, 23, 19, 21, 15, 12, 3]} color="#0B4FB3" />
        <KpiCard label="Patients IC suivis" value="52" hint="dont 9 FEVG < 40 %" spark={[31, 28, 23, 23, 18, 16, 11, 3]} color="#E0313B" />
        <KpiCard label="Délai moyen de RDV" value="12 j" hint="−9 j depuis mars" spark={[3, 6, 9, 12, 12, 19, 22, 31]} color="#0F7A4D" />
        <KpiCard label="Documents à valider" value="4" hint="2 CR · 2 ordonnances" spark={[11, 3, 15, 19, 7, 23, 27, 31]} color="#B45309" />
      </section>

      <div className="flex flex-col gap-4 xl:flex-row">
        <section className="bg-card border-border flex-3 rounded-2xl border">
          <div className="border-separator flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-extrabold">Agenda du jour</h2>
            <Link href="/agenda" className="text-primary text-sm font-bold">
              Ouvrir l&apos;agenda
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
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
                {agenda.slice(0, 6).map((row) => (
                  <tr key={row.id} className="border-separator border-t">
                    <td className="px-5 py-3 font-bold tabular-nums">{row.time}</td>
                    <td className="px-2 py-3 font-semibold">{row.patientLabel}</td>
                    <td className="px-2 py-3">{row.motif}</td>
                    <td className="px-2 py-3 text-sm">{row.detail || "—"}</td>
                    <td className="px-5 py-3">
                      {row.status ? (
                        <Badge variant="secondary">{row.status}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-card border-border flex-2 rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Alertes à revoir</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="bg-destructive/5 rounded-xl p-3">
              <p className="text-destructive font-extrabold">RED FLAG · Aorte 60 mm</p>
              <Link href="/consultations/enc-ett-lefevre/aorte" className="text-primary mt-1 inline-block text-xs font-bold">
                Voir
              </Link>
            </li>
            <li className="rounded-xl border p-3">
              <p className="font-bold">K+ 5,8 — à confirmer</p>
            </li>
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="bg-card border-border flex-3 rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Consultations par semaine</h2>
          <BarTrendChart
            ariaLabel="Consultations par semaine sur 12 semaines"
            data={consultationsParSemaine}
            xKey="semaine"
            yKey="consultations"
            highlightKey="current"
            height={240}
          />
        </section>
        <section className="bg-card border-border flex-2 rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Motifs (12 mois)</h2>
          <DonutChart
            ariaLabel="Répartition des motifs"
            data={motifs12Mois.map((m) => ({ label: m.label, value: m.pct }))}
          />
          <p className="text-muted-foreground mt-2 text-center text-xs">
            {formatNumber(1284)} consultations
          </p>
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  spark,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  spark: number[];
  color: string;
}) {
  return (
    <div className="bg-card border-border flex items-end justify-between gap-2 rounded-2xl border p-4">
      <div>
        <p className="text-muted-foreground text-sm font-semibold">{label}</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
        <p className="text-success mt-1 text-xs font-bold">{hint}</p>
      </div>
      <Sparkline points={spark} color={color} ariaLabel={`Tendance ${label}`} />
    </div>
  );
}