import { redirect, notFound } from "next/navigation";
import { getDemoUser } from "@/lib/demo-user";
import { getHostKind } from "@/lib/tenant";
import { MockTenantRepository } from "@/lib/data/repositories";
import { mrrSeries, nouveauxCabinets } from "@/lib/mock/series";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { ConsoleTenantsClient } from "@/components/admin/ConsoleTenantsClient";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { DemoRoleSwitcher } from "@/components/layout/DemoRoleSwitcher";
import { Logo } from "@/components/brand/Logo";
import { formatDecimal, formatNumber } from "@/lib/format";

export const metadata = { title: "Console plateforme" };
export const instant = false;

export default async function ConsolePage() {
  const user = await getDemoUser("SUPERADMIN");
  const kind = await getHostKind();

  if (user.role !== "SUPERADMIN") {
    redirect("/tableau-de-bord");
  }

  const tenants = await MockTenantRepository.list();

  if (kind !== "console" && process.env.NODE_ENV === "production") {
    notFound();
  }

  const mrrData = mrrSeries.map((p) => ({ mois: p.mois, k: p.k }));

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex min-h-0 flex-1 flex-wrap">
        <ConsoleSidebar userName={user.name} />
        <main className="min-w-0 flex-1 p-6 md:p-8">
          <ConsoleMain tenants={tenants} mrrData={mrrData} />
        </main>
      </div>
      <DemoRoleSwitcher current="SUPERADMIN" />
    </div>
  );
}

function ConsoleSidebar({ userName }: { userName: string }) {
  return (
    <aside className="border-border bg-card w-full max-w-[264px] border-r p-4">
      <Logo variant="clair" width={160} height={40} className="mb-4" />
      <p className="bg-muted text-muted-foreground rounded-xl border p-3 text-xs">
        Plateforme · console.cardioconsult.fr
      </p>
      <p className="text-muted-foreground mt-6 text-xs">Connecté · {userName}</p>
    </aside>
  );
}

function ConsoleMain({
  tenants,
  mrrData,
}: {
  tenants: Awaited<ReturnType<typeof MockTenantRepository.list>>;
  mrrData: { mois: string; k: number }[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <ConsoleTitle />
      <ConsoleKpis />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card border-border rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Revenu mensuel récurrent</h2>
          <TrendChart
            ariaLabel="MRR mensuel"
            unit="k€"
            data={mrrData}
            xKey="mois"
            series={[{ key: "k", label: "MRR", color: "#0B4FB3" }]}
            showArea
            height={240}
          />
          <p className="text-primary text-sm font-bold">
            Dernier point : {formatDecimal(mrrData[mrrData.length - 1]?.k ?? 0, 1)} k€
          </p>
        </section>
        <section className="bg-card border-border rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">Nouveaux cabinets par mois</h2>
          <BarTrendChart
            ariaLabel="Nouveaux cabinets"
            data={nouveauxCabinets}
            xKey="mois"
            yKey="n"
            height={240}
          />
        </section>
      </div>
      <section className="bg-card border-border max-w-sm rounded-2xl border p-4">
        <h2 className="text-base font-extrabold">Abonnements</h2>
        <DonutChart
          ariaLabel="Répartition des offres"
          data={[
            { label: "Solo", value: 118 },
            { label: "Cabinet", value: 64 },
            { label: "Clinique", value: 19 },
          ]}
        />
        <p className="text-center text-sm font-extrabold">{formatNumber(201)} cabinets actifs</p>
      </section>
      <ConsoleTenantsClient tenants={tenants} />
      <p className="text-muted-foreground text-xs">
        Aucune donnée patient n&apos;est accessible depuis cette console — chiffres fictifs.
      </p>
    </div>
  );
}

function ConsoleTitle() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Console plateforme</h1>
      <p className="text-muted-foreground mt-1 text-sm">console.cardioconsult.fr · supervision des tenants</p>
    </div>
  );
}

function ConsoleKpis() {
  const items = [
    { label: "Cabinets actifs", value: "201", hint: "+22 ce mois" },
    { label: "MRR", value: "34,1 k€", hint: "+11,4 %" },
    { label: "Essais en cours", value: "23", hint: "conversion 64 %" },
    { label: "Utilisateurs", value: "612", hint: "318 médecins · 294 IDE" },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className="bg-card border-border rounded-2xl border p-4">
          <p className="text-muted-foreground text-sm font-semibold">{k.label}</p>
          <p className="mt-1 text-2xl font-extrabold">{k.value}</p>
          <p className="text-muted-foreground mt-1 text-xs font-semibold">{k.hint}</p>
        </div>
      ))}
    </section>
  );
}