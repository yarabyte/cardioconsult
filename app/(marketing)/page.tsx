import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Logo } from "@/components/brand/Logo";
import { TrendChart } from "@/components/charts/TrendChart";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { mergeTaSeries, toSingleSeries } from "@/lib/chart-data";
import {
  aorteAscendanteSeries,
  aorteSinusSeries,
  jeanneFevgSeries,
  jeanneLdlSeries,
  jeanneTadSeries,
  jeanneTasSeries,
} from "@/lib/mock/series";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#courbes", label: "Courbes & suivi" },
  { href: "#securite", label: "Sécurité & conformité" },
  { href: "#tarifs", label: "Tarifs" },
] as const;

const FEATURES = [
  {
    n: "01",
    color: "text-primary",
    title: "Consultation guidée",
    body: "20 rubriques, indicateur de complétude, « non renseigné » jamais confondu avec « normal ».",
  },
  {
    n: "02",
    color: "text-primary",
    title: "ECG & ETT structurés",
    body: "Unités explicites, valves multiparamétriques, probabilité échographique d'HTP.",
  },
  {
    n: "03",
    color: "text-brand-red",
    title: "Module Aorte",
    body: "Mesures par segment, vitesse de croissance datée, alertes graduées et justifiées.",
  },
  {
    n: "04",
    color: "text-primary",
    title: "Scores contextuels",
    body: "CHA₂DS₂-VA, HAS-BLED, GRACE, TIMI, RCRI… avec « pourquoi ce résultat » et données manquantes.",
  },
  {
    n: "05",
    color: "text-primary",
    title: "Compte rendu & ordonnance",
    body: "Aperçu A4, brouillon / validé / signé, modèles par motif, export PDF.",
  },
  {
    n: "06",
    color: "text-primary",
    title: "Dossier longitudinal",
    body: "TA, FC, poids, FEVG, DFG, NT-proBNP, QTc, LDL et aorte en courbes.",
  },
  {
    n: "07",
    color: "text-primary",
    title: "Médecin & infirmière",
    body: "L'IDE prépare constantes et ECG, le médecin valide. Droits par rôle.",
  },
  {
    n: "08",
    color: "text-primary",
    title: "Vue hospitalisation",
    body: "Portefeuille de lits, transmissions, sorties prévues, examens en attente.",
  },
] as const;

const TRUST = [
  "Hébergement de données de santé en France*",
  "Connexion Pro Santé Connect / e-CPS (prévu)",
  "Chiffrement au repos et en transit",
  "Journal d'audit de chaque accès",
  "Interface 100 % en français",
] as const;

const SECURITY_ITEMS = [
  "Isolation stricte par tenant",
  "Authentification forte (MFA)",
  "Journal d'audit horodaté",
  "Notes signées versionnées",
  "Sauvegardes chiffrées testées",
  "Export RGPD de vos données",
] as const;

const fevgHero = toSingleSeries(jeanneFevgSeries.slice(-6));
const taData = mergeTaSeries(jeanneTasSeries, jeanneTadSeries);
const ldlData = toSingleSeries(jeanneLdlSeries);
const aorteData = aorteAscendanteSeries.map((p, i) => ({
  date: format(new Date(p.date), "yyyy", { locale: fr }),
  ascendante: p.value,
  sinus: aorteSinusSeries[i]?.value ?? null,
}));

export default function MarketingHomePage() {
  return (
    <div className="bg-card text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6 py-4 md:gap-8 md:px-8">
          <Link href="/" className="shrink-0">
            <Logo variant="clair" height={40} priority />
          </Link>
          <nav
            aria-label="Navigation principale"
            className="flex flex-1 flex-wrap gap-6 text-[15px] font-semibold"
          >
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-foreground hover:text-primary">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/t/dr-martin/connexion"
              className="px-2 py-3 text-[15px] font-bold text-primary"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className={cn(
                buttonVariants(),
                "h-auto rounded-[10px] px-5 py-3 text-[15px] font-bold",
              )}
            >
              Essai gratuit 30 jours
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-12 px-6 py-16 md:px-8 md:py-20">
          <div className="flex min-w-0 flex-1 basis-[460px] flex-col gap-6">
            <span className="bg-alert-soft text-alert-fg self-start rounded-full px-3 py-1.5 text-[13px] font-bold">
              Conçu avec des cardiologues hospitaliers et libéraux
            </span>
            <h1 className="text-[clamp(2rem,5vw,3.375rem)] leading-[1.08] font-extrabold tracking-tight">
              La consultation de cardiologie,{" "}
              <span className="text-primary">structurée</span> du motif au{" "}
              <span className="text-brand-red">compte rendu</span>.
            </h1>
            <p className="text-lg leading-relaxed text-[#3e4d6a]">
              Clinique, ECG, ETT, aorte, scores et ordonnance dans un seul parcours. Les courbes de
              suivi se construisent toutes seules, consultation après consultation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/inscription"
                className={cn(
                  buttonVariants(),
                  "h-auto rounded-xl px-6 py-4 text-base font-bold",
                )}
              >
                Créer l&apos;espace de mon cabinet
              </Link>
              <Link
                href="/t/dr-martin/tableau-de-bord"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto rounded-xl border-[#c9d5ea] px-6 py-4 text-base font-bold",
                )}
              >
                Voir la démonstration
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Votre adresse dédiée :{" "}
              <strong className="text-foreground">dr-martin</strong>.cardioconsult.fr · sans carte
              bancaire
            </p>
          </div>

          <div className="flex min-w-0 flex-1 basis-[520px] flex-col gap-4 rounded-[20px] border border-border bg-card p-5 shadow-[0_24px_60px_rgba(10,31,68,0.1)]">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-sm font-extrabold text-primary">
                JD
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-extrabold">Jeanne Dupont · 67 ans</div>
                <div className="text-[13px] text-muted-foreground">
                  IC à FE réduite · FA paroxystique · patiente fictive
                </div>
              </div>
              <StatusBadge variant="valide" label="FEVG +15 pts" className="shrink-0 text-xs" />
            </div>
            <div className="rounded-xl border border-separator p-3 pb-1">
              <p className="mb-1 text-[13px] font-bold text-muted-foreground">
                FEVG (%) — 6 dernières ETT
              </p>
              <TrendChart
                data={fevgHero}
                series={[{ key: "value", label: "FEVG", color: "#0B4FB3" }]}
                zones={[
                  { y1: 20, y2: 40, color: "#FDECEE" },
                  { y1: 40, y2: 50, color: "#FFF4E0" },
                  { y1: 50, y2: 70, color: "#E6F5EE" },
                ]}
                unit="%"
                ariaLabel="FEVG mesurée en échocardiographie"
                height={180}
                showArea
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-background p-3">
                <div className="text-xs text-muted-foreground">CHA₂DS₂-VA</div>
                <div className="text-[22px] font-extrabold tabular-nums">3</div>
              </div>
              <div className="rounded-xl bg-background p-3">
                <div className="text-xs text-muted-foreground">NT-proBNP</div>
                <div className="text-[22px] font-extrabold tabular-nums">590</div>
              </div>
              <div className="bg-alert-soft rounded-xl p-3">
                <div className="text-alert-fg text-xs">Aorte asc.</div>
                <div className="text-alert-fg text-[22px] font-extrabold tabular-nums">60 mm</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-8 px-6 py-6 text-sm font-bold text-[#3e4d6a] md:px-8">
          {TRUST.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </section>

      <section id="fonctionnalites" className="mx-auto max-w-7xl px-6 py-20 md:px-8">
        <p className="mb-2 text-sm font-extrabold tracking-widest text-brand-red uppercase">
          Fonctionnalités
        </p>
        <h2 className="mb-10 max-w-3xl text-4xl font-extrabold tracking-tight">
          Tout ce que fait votre consultation, sans ressaisie.
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.n} className="rounded-2xl border border-separator p-6">
              <div className={cn("text-[13px] font-extrabold", f.color)}>{f.n}</div>
              <h3 className="mt-2 text-lg font-bold">{f.title}</h3>
              <p className="mt-0 text-[15px] leading-relaxed text-[#3e4d6a]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="courbes" className="mx-auto max-w-7xl px-6 py-14 md:px-8">
        <p className="mb-2 text-sm font-extrabold tracking-widest text-brand-red uppercase">
          Courbes & suivi
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight">Des courbes qui parlent cardiologie.</h2>
        <p className="mt-3 mb-9 max-w-2xl text-[17px] leading-relaxed text-[#3e4d6a]">
          Chaque valeur saisie alimente le suivi : cibles affichées, seuils configurables, zones FEVG
          réduite / modérément réduite / préservée.
        </p>
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-separator p-5">
            <div className="font-extrabold">Pression artérielle</div>
            <div className="mb-2 text-[13px] text-muted-foreground">
              TAS / TAD (mmHg) · cible configurable
            </div>
            <TrendChart
              data={taData}
              series={[
                { key: "tas", label: "TAS", color: "#0B4FB3" },
                { key: "tad", label: "TAD", color: "#7FA6E6" },
              ]}
              thresholds={[{ y: 140, label: "Cible TAS 140", color: "#D42A35" }]}
              unit="mmHg"
              ariaLabel="Évolution de la pression artérielle sur 12 consultations"
              height={230}
            />
          </div>
          <div className="rounded-2xl border border-separator p-5">
            <div className="font-extrabold">LDL-c</div>
            <div className="mb-2 text-[13px] text-muted-foreground">
              g/L · objectif selon niveau de risque
            </div>
            <TrendChart
              data={ldlData}
              series={[{ key: "value", label: "LDL-c", color: "#0B4FB3" }]}
              thresholds={[{ y: 0.55, label: "Objectif 0,55 g/L", color: "#0F7A4D" }]}
              unit="g/L"
              ariaLabel="LDL-c par rapport à l'objectif"
              height={170}
            />
          </div>
          <div className="rounded-2xl border border-separator p-5 lg:col-span-2 xl:col-span-1">
            <div className="font-extrabold">Aorte ascendante</div>
            <div className="mb-2 text-[13px] text-muted-foreground">
              mm · mesures datées par segment
            </div>
            <TrendChart
              data={aorteData}
              series={[
                { key: "ascendante", label: "Ascendante", color: "#D42A35" },
                { key: "sinus", label: "Sinus", color: "#0B4FB3", strokeDasharray: "6 4" },
              ]}
              thresholds={[
                { y: 55, label: "Seuil configurable 55 mm", color: "#B45309" },
                { y: 50, label: "50 mm", color: "#7C8AA5" },
              ]}
              unit="mm"
              ariaLabel="Diamètre de l'aorte ascendante tubulaire"
              height={260}
            />
          </div>
        </div>
      </section>

      <section className="bg-foreground text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-9 px-6 py-20 md:px-8">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Votre espace cabinet, isolé, en 3 minutes.
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                n: "1",
                title: "Créez votre compte",
                body: "Identité, numéro RPPS et adresse du cabinet.",
              },
              {
                n: "2",
                title: "Choisissez votre adresse",
                body: (
                  <>
                    <strong className="text-white">votre-cabinet</strong>.cardioconsult.fr — base de
                    données dédiée à votre tenant.
                  </>
                ),
              },
              {
                n: "3",
                title: "Invitez votre équipe",
                body: "Médecins et infirmières, chacun avec ses droits.",
              },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl bg-[#13305f] p-6">
                <div className="text-brand-red text-[32px] font-extrabold">{step.n}</div>
                <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                <p className="mt-0 leading-relaxed text-[#c3d1ea]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="securite"
        className="mx-auto flex max-w-7xl flex-wrap gap-12 px-6 py-20 md:px-8"
      >
        <div className="min-w-0 flex-1 basis-[380px]">
          <p className="mb-2 text-sm font-extrabold tracking-widest text-brand-red uppercase">
            Sécurité & conformité
          </p>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight">
            Le secret médical, par conception.
          </h2>
          <p className="text-base leading-relaxed text-[#3e4d6a]">
            Les scores et alertes sont des aides à la documentation et au raisonnement : ils affichent
            leur source, leur version et les données manquantes, et ne remplacent jamais le jugement
            du cardiologue.
          </p>
        </div>
        <ul className="grid min-w-0 flex-1 basis-[480px] list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {SECURITY_ITEMS.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-separator p-4 text-[15px] font-semibold"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section id="tarifs" className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-8">
          <h2 className="mb-9 text-center text-4xl font-extrabold">
            Une offre par taille de structure
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-7">
              <h3 className="text-xl font-bold">Solo</h3>
              <div className="text-[34px] font-extrabold tabular-nums">
                [PRIX]{" "}
                <span className="text-[15px] font-semibold text-muted-foreground">€ HT / mois</span>
              </div>
              <p className="text-[#3e4d6a]">1 cardiologue · 1 infirmière</p>
              <Link
                href="/inscription"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto w-full py-3 text-center font-bold",
                )}
              >
                Commencer l&apos;essai
              </Link>
            </div>
            <div className="flex flex-col gap-3.5 rounded-2xl border-2 border-primary bg-card p-7">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Cabinet</h3>
                <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-extrabold text-white">
                  Le plus choisi
                </span>
              </div>
              <div className="text-[34px] font-extrabold tabular-nums">
                [PRIX]{" "}
                <span className="text-[15px] font-semibold text-muted-foreground">€ HT / mois</span>
              </div>
              <p className="text-[#3e4d6a]">Jusqu&apos;à 5 médecins · statistiques avancées</p>
              <Link
                href="/inscription"
                className={cn(buttonVariants(), "h-auto w-full py-3.5 text-center font-bold")}
              >
                Commencer l&apos;essai
              </Link>
            </div>
            <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-7">
              <h3 className="text-xl font-bold">Clinique / service</h3>
              <div className="text-[34px] font-extrabold">Sur devis</div>
              <p className="text-[#3e4d6a]">Vue hospitalisation · SSO établissement</p>
              <Link
                href="#tarifs"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto w-full py-3 text-center font-bold",
                )}
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-[#c3d1ea]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-8 px-6 py-11 md:px-8">
          <Logo variant="sombre" height={48} />
          <nav aria-label="Liens légaux" className="flex flex-wrap gap-5 text-sm">
            {["Mentions légales", "CGU", "Politique de confidentialité", "Contact DPO"].map(
              (label) => (
                <a key={label} href="#tarifs" className="hover:text-white">
                  {label}
                </a>
              ),
            )}
          </nav>
          <p className="w-full text-[12.5px] leading-relaxed text-[#9fb3d9]">
            * Hébergeur certifié HDS à contractualiser avant toute mise en production. CardioConsult
            est un outil d&apos;aide à la documentation clinique ; les scores et alertes ne
            constituent pas une décision médicale.
          </p>
        </div>
      </footer>
    </div>
  );
}