import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { TrendChart } from "@/components/charts/TrendChart";
import { Button } from "@/components/ui/button";
import { toSingleSeries } from "@/lib/chart-data";
import { jeanneFevgSeries } from "@/lib/mock/series";

export const metadata: Metadata = {
  title: "Identité visuelle",
  robots: { index: false, follow: false },
};

const COLORS = [
  { name: "Bleu médical", hex: "#0B4FB3", note: "actions, liens", tall: true },
  { name: "Bleu nuit", hex: "#0A1F44", note: "texte, fonds", tall: true },
  { name: "Rouge cardio", hex: "#E0313B", note: "marque", tall: true },
  { name: "Rouge alerte", hex: "#D42A35", note: "alertes seules", tall: true },
  { name: "Fond", hex: "#F4F7FC", note: "#F4F7FC", tall: false, border: true },
  { name: "Bleu 50", hex: "#EAF1FD", note: "#EAF1FD", tall: false },
  { name: "À valider", hex: "#FFF4E0", note: "#B45309", tall: false },
  { name: "Validé", hex: "#E6F5EE", note: "#0F7A4D", tall: false },
] as const;

const BADGE_VARIANTS = [
  "non-renseigne",
  "calcule",
  "incomplet",
  "valide",
  "alerte",
  "red-flag",
] as const;

const fevgDemo = toSingleSeries(jeanneFevgSeries.slice(-5));

export default function DesignReferencePage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 text-foreground md:px-14 md:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6">
        <header className="col-span-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-brand-red mb-1.5 text-[13px] font-extrabold tracking-widest uppercase">
              Identité visuelle · proposition v1
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight">CardioConsult</h1>
          </div>
          <p className="max-w-md text-right text-sm text-muted-foreground">
            Cœur bicolore (bleu médical / rouge cardio) traversé d&apos;un complexe QRS. Lisible de
            24 à 512 px.
          </p>
        </header>

        <div className="col-span-12 flex flex-col justify-center gap-7 rounded-[20px] border border-border bg-card p-8 lg:col-span-7 lg:p-10">
          <Logo variant="clair" width={520} className="max-w-full" />
          <div className="flex flex-wrap items-end gap-7">
            <Logo variant="icone" width={96} height={96} />
            <Logo variant="icone" width={48} height={48} />
            <Logo variant="icone" width={24} height={24} />
            <Logo variant="icone" width={96} height={96} className="rounded-2xl" />
          </div>
        </div>

        <aside className="col-span-12 flex flex-col gap-6 lg:col-span-5">
          <div className="flex flex-1 items-center justify-center rounded-[20px] bg-foreground p-8">
            <Logo variant="sombre" width={400} className="max-w-full" />
          </div>
          <div className="flex flex-1 items-center justify-center rounded-[20px] border border-border bg-card p-7">
            <Logo variant="mono" width={340} className="max-w-full" />
          </div>
        </aside>

        <div className="col-span-12 flex flex-col gap-4 rounded-[20px] border border-border bg-card p-7 lg:col-span-7">
          <h2 className="text-lg font-extrabold">Couleurs</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.name}>
                <div
                  className="rounded-xl"
                  style={{
                    height: c.tall ? 72 : 44,
                    background: c.hex,
                    border: "border" in c && c.border ? "1px solid #DCE4F2" : undefined,
                  }}
                />
                <div className="mt-2 text-sm font-bold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 flex flex-col gap-3.5 rounded-[20px] border border-border bg-card p-7 lg:col-span-5">
          <h2 className="text-lg font-extrabold">Typographie — Plus Jakarta Sans</h2>
          <div className="text-[34px] font-extrabold tracking-tight">Titre 34 / ExtraBold</div>
          <div className="text-xl font-bold">Sous-titre 20 / Bold</div>
          <p className="text-[15px] leading-relaxed text-[#3e4d6a]">
            Texte courant 15 / Regular — FEVG 47 %, TAS 128 mmHg, QTc 443 ms : chiffres tabulaires
            pour les valeurs cliniques.
          </p>
          <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Libellé 12 / Bold capitales
          </div>
        </div>

        <div className="col-span-12 rounded-[20px] border border-border bg-card p-6 lg:p-7">
          <h2 className="mb-3 text-base font-extrabold">Graphique de démonstration</h2>
          <TrendChart
            data={fevgDemo}
            series={[{ key: "value", label: "FEVG", color: "#0B4FB3" }]}
            zones={[
              { y1: 20, y2: 40, color: "#FDECEE" },
              { y1: 40, y2: 50, color: "#FFF4E0" },
              { y1: 50, y2: 70, color: "#E6F5EE" },
            ]}
            unit="%"
            ariaLabel="Courbe FEVG — démonstration du design system"
            height={160}
            showArea
          />
        </div>

        <div className="col-span-12 flex flex-wrap items-center gap-3.5 rounded-[20px] border border-border bg-card px-6 py-6 lg:px-7">
          <h2 className="mr-3 text-base font-extrabold">Statuts cliniques</h2>
          {BADGE_VARIANTS.map((variant) => (
            <StatusBadge key={variant} variant={variant} />
          ))}
          <span className="flex-1" />
          <Button className="h-auto rounded-[10px] px-4 py-3 font-bold">Action principale</Button>
          <Button variant="outline" className="h-auto rounded-[10px] px-4 py-3 font-bold">
            Secondaire
          </Button>
        </div>
      </div>
    </div>
  );
}