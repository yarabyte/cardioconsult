import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { STATS_MOCK } from "@/lib/mock/infirmiere";
import { formatNumber } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Statistiques" };

export default function StatistiquesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="File active" value={formatNumber(1284)} hint="patients vus sur 12 mois" />
        <StatCard label="Consultations / mois" value="312" hint="moyenne glissante" />
        <StatCard label="CR signés" value="94 %" hint="dans les 48 h" />
        <StatCard label="Ordonnances validées" value="98 %" hint="contrôles passés" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card border-border rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Distribution FEVG</h2>
          <BarTrendChart
            ariaLabel="Distribution FEVG"
            data={STATS_MOCK.fevgDistribution}
            xKey="label"
            yKey="value"
            height={220}
          />
        </section>
        <section className="bg-card border-border rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">CHA₂DS₂-VA (cohorte FA)</h2>
          <BarTrendChart
            ariaLabel="Distribution CHA2DS2VA"
            data={STATS_MOCK.cha2ds2}
            xKey="label"
            yKey="value"
            height={220}
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card border-border rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Motifs IC — traitements</h2>
          <DonutChart
            ariaLabel="Objectifs thérapeutiques IC"
            data={STATS_MOCK.icCohort.map((r) => ({ label: r.label, value: r.pct }))}
          />
        </section>
        <section className="bg-card border-border space-y-4 rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Atteinte des objectifs</h2>
          {STATS_MOCK.icCohort.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-sm font-semibold">
                <span>{row.label}</span>
                <span className="tabular-nums">{row.pct} %</span>
              </div>
              <Progress value={row.pct} className="h-2" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Statistiques</h1>
      <p className="text-muted-foreground mt-1 text-sm">Indicateurs cabinet · données fictives</p>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4">
      <p className="text-muted-foreground text-sm font-semibold">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  );
}