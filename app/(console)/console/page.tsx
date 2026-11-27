import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getHostKind } from "@/lib/tenant";
import { requireContext } from "@/server/auth/require-context";
import { mrrSeries, nouveauxCabinets } from "@/lib/marketing/chart-fixtures";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { ConsoleOpsClient } from "@/components/admin/ConsoleOpsClient";
import { Logo } from "@/components/brand/Logo";
import { formatDecimal, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import * as consoleRepo from "@/server/console/repository";
import * as supportRepo from "@/server/support/repository";
import { resolvePlatformRole, platformCan } from "@/server/console/platform-rbac";
import { isConsoleIpAllowed } from "@/server/console/ip-allowlist";
import { headers } from "next/headers";
import { env } from "@/env";
import { ROOT_DOMAIN } from "@/lib/tenant-host";

export const metadata = { title: "Console plateforme" };

const NAV = [
  { href: "#overview", label: "Vue d'ensemble" },
  { href: "#tenants", label: "Cabinets" },
  { href: "#support", label: "Support" },
  { href: "#supervision", label: "Supervision" },
] as const;

export default async function ConsolePage() {
  const ctx = await requireContext({ permission: "console.manage" });
  const user = ctx.user;
  const kind = await getHostKind();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "127.0.0.1";

  if (ctx.role !== "SUPERADMIN") {
    redirect("/tableau-de-bord");
  }

  const platformRole = resolvePlatformRole(ctx.role);
  if (!platformRole || !platformCan(platformRole, "console.view")) {
    redirect("/");
  }

  if (!isConsoleIpAllowed(ip)) {
    notFound();
  }

  if (kind !== "console" && process.env.NODE_ENV === "production") {
    notFound();
  }

  // Passkey obligatoire hors démo (flag) — en démo on affiche l'exigence.
  const passkeyRequired = env.CONSOLE_REQUIRE_PASSKEY;

  const tenants = await consoleRepo.listTenants();
  const supervision = await consoleRepo.supervisionSnapshot();
  const support = await supportRepo.listAll();
  const mrrData = mrrSeries.map((p) => ({ mois: p.mois, k: p.k }));

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <div className="flex min-h-0 flex-1 flex-wrap">
        <aside className="border-border bg-card flex w-full max-w-[264px] flex-col gap-4 border-r p-4">
          <Logo variant="clair" width={160} height={40} />
          <div className="bg-muted rounded-xl border p-3 text-xs">
            <p className="font-bold">Plateforme</p>
            <p className="text-muted-foreground">console.{ROOT_DOMAIN}</p>
          </div>
          <nav aria-label="Console" className="flex flex-col gap-0.5 text-sm">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 font-semibold text-[#2A3A5C]",
                  item.href === "#overview" && "bg-primary-soft text-primary font-extrabold",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <p className="text-muted-foreground mt-auto border-t pt-4 text-xs">
            {user.name}
            <br />
            <span className="font-semibold">{platformRole}</span>
            {passkeyRequired ? (
              <span className="mt-1 block">MFA passkey / clé matérielle obligatoire</span>
            ) : null}
          </p>
        </aside>

        <main id="overview" className="min-w-0 flex-1 space-y-6 p-6 md:p-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Console plateforme</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              console.{ROOT_DOMAIN} · aucune donnée patient accessible depuis cette console
            </p>
          </div>

          <section
            aria-label="Indicateurs plateforme"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {[
              { label: "Cabinets actifs", value: "201", hint: "+22 ce mois" },
              { label: "MRR", value: "34,1 k€", hint: "+11,4 %" },
              { label: "Essais en cours", value: "23", hint: "conversion 64 %" },
              { label: "Utilisateurs", value: "612", hint: "318 méd. · 294 IDE" },
              { label: "Churn mensuel", value: "1,2 %", hint: "3 résiliations" },
            ].map((k) => (
              <div key={k.label} className="bg-card border-border rounded-2xl border p-4">
                <p className="text-muted-foreground text-sm font-semibold">{k.label}</p>
                <p className="mt-1 text-2xl font-extrabold">{k.value}</p>
                <p className="text-muted-foreground mt-1 text-xs font-semibold">{k.hint}</p>
              </div>
            ))}
          </section>
          <p className="text-muted-foreground -mt-3 text-xs">Chiffres fictifs de démonstration.</p>

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
            <p className="text-center text-sm font-extrabold">
              {formatNumber(201)} cabinets actifs
            </p>
          </section>

          <div id="tenants" />
          <div id="support" />
          <div id="supervision" />
          <ConsoleOpsClient
            initialTenants={tenants}
            supervision={supervision}
            initialSupport={support}
          />

          <p className="text-muted-foreground text-xs">
            Accès support clinique uniquement via session consentie (lecture seule, 60 min). Voir{" "}
            <Link href="/t/dr-martin/tableau-de-bord" className="text-primary font-semibold">
              espace cabinet
            </Link>{" "}
            pour bandeau / révocation.
          </p>
        </main>
      </div>
    </div>
  );
}
