import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  Globe2,
  HardDrive,
  HeartPulse,
  Hospital,
  KeyRound,
  LineChart,
  ListChecks,
  Lock,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
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
} from "@/lib/marketing/chart-fixtures";
import { APP_NAME } from "@/lib/brand";
import { ROOT_DOMAIN } from "@/lib/tenant-host";
import { cn } from "@/lib/utils";
import { getPlanCatalog } from "@/server/billing/plans";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PricingPlans, type PricingPlan } from "@/components/marketing/PricingPlans";

/** Fonctionnalités alignées sur le produit actuel (V15 inclus). */
const FEATURES_PRIMARY: {
  title: string;
  body: string;
  icon: LucideIcon;
  tint: string;
}[] = [
  {
    title: "Consultation guidée",
    body: "21 rubriques du motif à la clôture, complétude en direct, jamais de valeur clinique préremplie.",
    icon: Stethoscope,
    tint: "bg-[#E8F0FB] text-[#0B4FB3]",
  },
  {
    title: "Examens complémentaires",
    body: "24 bilans versionnés (cardiologie, infectiologie, endocrinologie, HTA secondaire) en brouillon documentaire.",
    icon: FlaskConical,
    tint: "bg-[#FDECEE] text-[#E0313B]",
  },
  {
    title: "Agenda & tableau de bord",
    body: "Journée actionnable : salle d’attente, reprise de consultation, documents et alertes à traiter.",
    icon: CalendarDays,
    tint: "bg-[#E6F5EE] text-[#0F7A4D]",
  },
];

const FEATURES: {
  n: string;
  accent: "primary" | "red";
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    n: "01",
    accent: "primary",
    title: "Consultation guidée",
    body: "21 rubriques, indicateur de complétude, « non renseigné » jamais confondu avec « normal ».",
    icon: ListChecks,
  },
  {
    n: "02",
    accent: "primary",
    title: "ECG & ETT structurés",
    body: "Unités explicites, valves multiparamétriques, probabilité échographique d’HTP.",
    icon: Activity,
  },
  {
    n: "03",
    accent: "red",
    title: "Module aorte",
    body: "Mesures par segment, croissance datée, alertes graduées — aides à la documentation, pas une décision.",
    icon: HeartPulse,
  },
  {
    n: "04",
    accent: "primary",
    title: "Scores contextuels",
    body: "CHA₂DS₂-VA, HAS-BLED, GRACE, TIMI, RCRI… avec source, version et données manquantes.",
    icon: ClipboardList,
  },
  {
    n: "05",
    accent: "primary",
    title: "Examens complémentaires",
    body: "Bibliothèque V15 : filtres par spécialité, bilan de base, indication et aperçu — sans envoi labo.",
    icon: FlaskConical,
  },
  {
    n: "06",
    accent: "primary",
    title: "Compte rendu & ordonnance",
    body: "Aperçu A4, brouillon / validé / signé, modèles par motif, export PDF.",
    icon: FileText,
  },
  {
    n: "07",
    accent: "primary",
    title: "Dossier longitudinal",
    body: "TA, FEVG, DFG, NT-proBNP, QTc, LDL et aorte en courbes, consultation après consultation.",
    icon: LineChart,
  },
  {
    n: "08",
    accent: "primary",
    title: "Équipe & hospitalisation",
    body: "Rôles médecin / IDE, agenda partagé, vue de service et transmissions.",
    icon: Hospital,
  },
];

const TRUST = [
  "Données de santé hébergées en France*",
  "MFA obligatoire",
  "Isolation par cabinet",
  "Journal d’audit",
  "Interface 100 % française",
] as const;

const SECURITY_PILLARS: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Isolation par cabinet",
    body: "Un sous-domaine et une base dédiés. Aucun accès croisé entre tenants.",
    icon: Database,
  },
  {
    title: "Accès fort",
    body: "Comptes nominatifs, MFA TOTP obligatoire, sessions courtes et ré-auth sensible.",
    icon: KeyRound,
  },
  {
    title: "Preuves & droits",
    body: "Journal d’audit, documents versionnés, export prévu pour la portabilité RGPD.",
    icon: ScrollText,
  },
];

const SECURITY_ITEMS: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Isolation stricte par tenant",
    body: "Le cabinet est déduit de l’hôte ; chaque lecture et écriture est contrôlée côté serveur.",
    icon: Lock,
  },
  {
    title: "Authentification forte (MFA)",
    body: "TOTP obligatoire avant tout accès aux données. Pas de compte partagé.",
    icon: ShieldCheck,
  },
  {
    title: "Journal d’audit horodaté",
    body: "Qui a consulté ou modifié un dossier — sans journaliser le contenu clinique.",
    icon: ScrollText,
  },
  {
    title: "Documents versionnés",
    body: "Brouillon, validé, signé. Pas de modification silencieuse d’un acte signé.",
    icon: FileText,
  },
  {
    title: "Sauvegardes chiffrées",
    body: "Volumes et bases chiffrés ; chiffrement applicatif prévu pour l’identité patient.",
    icon: HardDrive,
  },
  {
    title: "Export de vos données",
    body: "Portabilité et réversibilité prévues : export chiffré, sous ré-authentification.",
    icon: Database,
  },
];

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
    <div className="bg-[#F4F7FC] text-[#0A1F44]">
      <MarketingHeader />

      {/* Hero — image pleine largeur, marque au premier plan */}
      <section className="marketing-hero relative overflow-hidden border-b border-[#E3E9F4]">
        <div className="relative isolate">
          <Image
            src="/marketing/hero-cabinet.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[78%_45%]"
            aria-hidden
          />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "linear-gradient(105deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.92) 38%, rgba(244,247,252,0.72) 58%, rgba(244,247,252,0.35) 78%, rgba(10,31,68,0.12) 100%), linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 28%, rgba(244,247,252,0.75) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 12% 25%, rgba(11,79,179,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 88% 18%, rgba(224,49,59,0.08), transparent 55%)",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-14 md:px-8 md:pt-24 md:pb-20">
            <p className="marketing-fade-up text-[13px] font-extrabold tracking-[0.14em] text-[#E0313B] uppercase">
              {APP_NAME}
            </p>
            <h1 className="marketing-fade-up marketing-fade-up-delay-1 mt-4 max-w-3xl text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">
              Le soin cardiologique, <span className="text-[#0B4FB3]">structuré</span> du motif au
              compte rendu.
            </h1>
            <p className="marketing-fade-up marketing-fade-up-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-[#3E4D6A]">
              Clinique, ECG, ETT, aorte, scores, examens complémentaires et ordonnance dans un seul
              parcours — pour les cabinets et services en France.
            </p>
            <div className="marketing-fade-up marketing-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/inscription"
                className={cn(
                  buttonVariants(),
                  "h-auto rounded-full bg-[#0B4FB3] px-6 py-3.5 text-base font-bold hover:bg-[#083A85]",
                )}
              >
                Créer l&apos;espace de mon cabinet
              </Link>
              <Link
                href="/t/dr-martin/tableau-de-bord"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto rounded-full border-[#C9D5EA] bg-white/90 px-6 py-3.5 text-base font-bold text-[#0A1F44] backdrop-blur-sm",
                )}
              >
                Voir la démonstration
              </Link>
            </div>
            <p className="marketing-fade-up marketing-fade-up-delay-3 mt-4 text-sm text-[#52627F]">
              Adresse dédiée <strong className="text-[#0A1F44]">votre-cabinet.{ROOT_DOMAIN}</strong>{" "}
              · essai sans carte bancaire
            </p>
          </div>
        </div>

        {/* Bandeau produit pleine largeur — ancre visuelle, pas une carte flottante */}
        <div className="marketing-fade-up marketing-fade-up-delay-4 relative border-t border-[#E3E9F4] bg-white">
          <div className="mx-auto grid max-w-6xl gap-0 lg:grid-cols-[1fr_1.15fr]">
            <div className="flex flex-col justify-center gap-5 border-b border-[#E3E9F4] px-5 py-10 md:px-8 lg:border-r lg:border-b-0">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#EAF1FD] text-sm font-extrabold text-[#0B4FB3]">
                  JD
                </div>
                <div>
                  <p className="text-base font-extrabold">Jeanne Dupont · 67 ans</p>
                  <p className="text-[13px] text-[#52627F]">
                    IC à FE réduite · FA · données fictives
                  </p>
                </div>
                <StatusBadge
                  variant="valide"
                  label="FEVG +15 pts"
                  className="ml-auto shrink-0 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#52627F]">CHA₂DS₂-VA</p>
                  <p className="text-2xl font-extrabold tabular-nums">3</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#52627F]">NT-proBNP</p>
                  <p className="text-2xl font-extrabold tabular-nums">590</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#B81E2A]">Aorte asc.</p>
                  <p className="text-2xl font-extrabold text-[#B81E2A] tabular-nums">60 mm</p>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-[#52627F]">
                Les courbes et alertes aident à documenter le suivi. Elles n’imposent aucune
                décision médicale.
              </p>
            </div>
            <div className="px-5 py-8 md:px-8">
              <p className="mb-2 text-[13px] font-bold text-[#52627F]">
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
                height={200}
                showArea
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E3E9F4] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-5 text-[13px] font-bold text-[#3E4D6A] md:px-8">
          {TRUST.map((line) => (
            <span key={line} className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#0B4FB3]" aria-hidden />
              {line}
            </span>
          ))}
        </div>
      </section>

      <section
        id="fonctionnalites"
        className="relative overflow-hidden border-b border-[#E3E9F4] bg-[#F4F7FC]"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(11,79,179,0.07),_transparent_65%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-extrabold tracking-[0.14em] text-[#E0313B] uppercase">
              Fonctionnalités
            </p>
            <h2 className="text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold tracking-tight">
              Du cabinet à l’hospitalisation, sans ressaisie.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-[#3E4D6A]">
              Parcours de consultation complet, bilans complémentaires V15, suivi longitudinal et
              coordination IDE — dans un espace isolé par cabinet.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
            {FEATURES_PRIMARY.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-[#DCE4F2] bg-white p-6 shadow-[0_8px_28px_rgba(10,31,68,0.04)] transition-[border-color,box-shadow] hover:border-[#B8CAE8] hover:shadow-[0_12px_36px_rgba(11,79,179,0.08)]"
                >
                  <div
                    className={cn(
                      "mb-5 flex size-11 items-center justify-center rounded-xl",
                      f.tint,
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.25} aria-hidden />
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#3E4D6A]">{f.body}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-14 flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-extrabold tracking-[0.12em] text-[#0B4FB3] uppercase">
                Modules cliniques
              </p>
              <p className="mt-1 text-[15px] text-[#52627F]">
                Huit briques pour documenter sans improvisation.
              </p>
            </div>
            <div className="hidden h-px flex-1 bg-[#DCE4F2] sm:block" aria-hidden />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const isRed = f.accent === "red";
              return (
                <article
                  key={f.n}
                  className={cn(
                    "flex min-w-0 flex-col rounded-2xl border bg-white p-5 transition-[border-color,background-color]",
                    isRed
                      ? "border-[#F5C2C6] hover:bg-[#FFF8F8]"
                      : "border-[#E3E9F4] hover:border-[#C5D4EC] hover:bg-[#FAFCFF]",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg",
                        isRed ? "bg-[#FDECEE] text-[#E0313B]" : "bg-[#E8F0FB] text-[#0B4FB3]",
                      )}
                    >
                      <Icon className="size-4" strokeWidth={2.25} aria-hidden />
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[12px] font-bold tracking-wider",
                        isRed ? "text-[#E0313B]" : "text-[#7FA6E6]",
                      )}
                    >
                      {f.n}
                    </span>
                  </div>
                  <h3 className="text-[15.5px] leading-snug font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#52627F]">{f.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="courbes" className="border-t border-[#E3E9F4] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="mb-2 text-sm font-extrabold tracking-[0.14em] text-[#E0313B] uppercase">
            Courbes & suivi
          </p>
          <h2 className="text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold tracking-tight">
            Des courbes qui parlent cardiologie.
          </h2>
          <p className="mt-3 mb-10 max-w-2xl text-[16px] leading-relaxed text-[#3E4D6A]">
            Chaque valeur saisie alimente le suivi : cibles affichées, seuils configurables, zones
            FEVG réduite / modérément réduite / préservée.
          </p>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[#E3E9F4] bg-[#F4F7FC]/50 p-5">
              <div className="font-extrabold">Pression artérielle</div>
              <div className="mb-2 text-[13px] text-[#52627F]">TAS / TAD · cible configurable</div>
              <TrendChart
                data={taData}
                series={[
                  { key: "tas", label: "TAS", color: "#0B4FB3" },
                  { key: "tad", label: "TAD", color: "#7FA6E6" },
                ]}
                thresholds={[{ y: 140, label: "Cible TAS 140", color: "#D42A35" }]}
                unit="mmHg"
                ariaLabel="Évolution de la pression artérielle sur 12 consultations"
                height={220}
              />
            </div>
            <div className="rounded-2xl border border-[#E3E9F4] bg-[#F4F7FC]/50 p-5">
              <div className="font-extrabold">LDL-c</div>
              <div className="mb-2 text-[13px] text-[#52627F]">
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
            <div className="rounded-2xl border border-[#E3E9F4] bg-[#F4F7FC]/50 p-5 lg:col-span-2 xl:col-span-1">
              <div className="font-extrabold">Aorte ascendante</div>
              <div className="mb-2 text-[13px] text-[#52627F]">mm · mesures datées par segment</div>
              <TrendChart
                data={aorteData}
                series={[
                  { key: "ascendante", label: "Ascendante", color: "#D42A35" },
                  { key: "sinus", label: "Sinus", color: "#0B4FB3", strokeDasharray: "6 4" },
                ]}
                thresholds={[
                  { y: 55, label: "Seuil 55 mm", color: "#B45309" },
                  { y: 50, label: "50 mm", color: "#7C8AA5" },
                ]}
                unit="mm"
                ariaLabel="Diamètre de l'aorte ascendante tubulaire"
                height={240}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0A1F44] text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(11,79,179,0.35),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(224,49,59,0.18),_transparent_50%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 text-sm font-extrabold tracking-[0.14em] text-[#FF6B73] uppercase">
                Mise en route
              </p>
              <h2 className="text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold tracking-tight">
                Votre espace {APP_NAME}, isolé, en quelques minutes.
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-[#C3D1EA]">
                Trois étapes pour ouvrir un cabinet dédié — sous-domaine, base isolée, équipe
                nominative. Essai 30 jours, sans carte bancaire.
              </p>
            </div>
            <Link
              href="/inscription"
              className={cn(
                buttonVariants(),
                "h-auto shrink-0 gap-2 self-start rounded-full bg-[#E0313B] px-6 py-3.5 text-[15px] font-bold text-white hover:bg-[#C42831] lg:self-end",
              )}
            >
              Commencer l’essai
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <ol className="relative mt-12 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
            <div
              className="pointer-events-none absolute top-[2.75rem] right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-white/25 to-transparent md:block"
              aria-hidden
            />
            {(
              [
                {
                  n: "01",
                  title: "Créez votre compte",
                  body: "Identité, numéro RPPS et adresse du cabinet. MFA activée dès la première connexion.",
                  icon: UserPlus,
                  detail: "Compte nominatif",
                },
                {
                  n: "02",
                  title: "Choisissez votre adresse",
                  body: `votre-cabinet.${ROOT_DOMAIN} — sous-domaine et base PostgreSQL dédiés à votre tenant.`,
                  icon: Globe2,
                  detail: "Isolation complète",
                },
                {
                  n: "03",
                  title: "Invitez votre équipe",
                  body: "Médecins et infirmières, chacun avec ses droits. Tableau de bord partagé dès le jour 1.",
                  icon: Users,
                  detail: "Rôles & permissions",
                },
              ] as const
            ).map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.n}
                  className="relative rounded-2xl border border-white/12 bg-white/[0.06] p-6 backdrop-blur-sm transition-[background-color,border-color] hover:border-white/25 hover:bg-white/[0.1]"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#E0313B]/20 text-[#FF6B73]">
                      <Icon className="size-5" strokeWidth={2.25} aria-hidden />
                    </span>
                    <span className="font-mono text-[13px] font-extrabold tracking-wider text-[#FF6B73]">
                      {step.n}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold tracking-[0.1em] text-[#9FB3D9] uppercase">
                    {step.detail}
                  </p>
                  <h3 className="mt-1.5 text-lg font-extrabold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#C3D1EA]">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section
        id="securite"
        className="relative overflow-hidden border-t border-[#E3E9F4] bg-white"
      >
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_right,_rgba(11,79,179,0.06),_transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-end lg:gap-14">
            <div>
              <p className="mb-2 text-sm font-extrabold tracking-[0.14em] text-[#E0313B] uppercase">
                Sécurité & conformité
              </p>
              <h2 className="text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold tracking-tight">
                Le secret médical, par conception.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[#3E4D6A]">
                Isolation des cabinets, accès nominatifs et traçabilité : le socle est pensé pour le
                cadre français des données de santé. Scores et alertes restent des aides à la
                documentation — jamais une décision médicale.
              </p>
            </div>

            <aside className="rounded-2xl bg-[#0A1F44] p-6 text-white shadow-[0_16px_40px_rgba(10,31,68,0.18)] md:p-7">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FF6B73]">
                  <ShieldCheck className="size-5" strokeWidth={2.25} aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-extrabold">Hébergement de données de santé</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#C3D1EA]">
                    En production, données prévues chez un hébergeur certifié HDS*.
                    Contractualisation requise avant toute mise en service réelle.
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                {[
                  ["France*", "Localisation"],
                  ["MFA", "Obligatoire"],
                  ["Audit", "Horodaté"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-[11px] font-semibold tracking-wide text-[#9FB3D9] uppercase">
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-[15px] font-extrabold">{value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {SECURITY_PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <article
                  key={p.title}
                  className="rounded-2xl border border-[#DCE4F2] bg-[#F4F7FC]/70 p-5"
                >
                  <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#E8F0FB] text-[#0B4FB3]">
                    <Icon className="size-5" strokeWidth={2.25} aria-hidden />
                  </span>
                  <h3 className="text-[16px] font-extrabold">{p.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#3E4D6A]">{p.body}</p>
                </article>
              );
            })}
          </div>

          <ul className="mt-6 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex gap-3.5 rounded-2xl border border-[#E3E9F4] bg-white p-4 transition-[border-color] hover:border-[#C5D4EC]"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FB] text-[#0B4FB3]">
                    <Icon className="size-4" strokeWidth={2.25} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-bold text-[#0A1F44]">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#52627F]">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 text-[12.5px] leading-relaxed text-[#52627F]">
            * Hébergeur certifié HDS à contractualiser avant production. {APP_NAME} n’affirme pas
            une conformité RGPD ou HDS achevée : les preuves et audits restent à constituer.
          </p>
        </div>
      </section>

      <TarifsSection />

      <footer className="bg-[#0A1F44] text-[#C3D1EA]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8 px-5 py-12 md:px-8">
          <Logo variant="sombre" height={40} />
          <nav aria-label="Liens légaux" className="flex flex-wrap gap-5 text-sm">
            {(
              [
                ["Mentions légales", "/mentions-legales"],
                ["CGU", "/cgu"],
                ["Confidentialité", "/confidentialite"],
                ["Sous-traitance", "/sous-traitance"],
                ["Sous-traitants", "/sous-traitants"],
              ] as const
            ).map(([label, href]) => (
              <Link key={href} href={href} className="transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
          <p className="w-full text-[12.5px] leading-relaxed text-[#9FB3D9]">
            * Hébergeur certifié HDS à contractualiser avant toute mise en production. {APP_NAME}{" "}
            est un outil d&apos;aide à la documentation clinique ; les scores et alertes ne
            constituent pas une décision médicale.
          </p>
        </div>
      </footer>
    </div>
  );
}

function TarifsSection() {
  const catalog = getPlanCatalog();
  const solo = catalog.find((p) => p.key === "solo");
  const cabinet = catalog.find((p) => p.key === "cabinet");
  const clinique = catalog.find((p) => p.key === "clinique");

  const plans: PricingPlan[] = [
    {
      title: "Solo",
      audience: "Cardiologue libéral",
      seatsLabel: `Jusqu’à ${solo?.seats ?? 2} utilisateurs`,
      seatsDetail: "1 médecin + 1 infirmière",
      priceMonthlyHt: solo?.priceHtEur ?? null,
      cta: "Commencer l'essai",
      href: "/inscription",
      includes: [
        "Espace isolé votre-cabinet." + ROOT_DOMAIN,
        "Consultation guidée (21 rubriques)",
        "Dossier patient & courbes longitudinales",
        "ECG, ETT, module aorte, scores",
        "Examens complémentaires (brouillon V15)",
        "Compte rendu & ordonnance PDF",
        "Agenda du jour & reprise de consultation",
        "MFA obligatoire · journal d’audit",
      ],
      note: "Essai 30 jours · sans carte bancaire",
    },
    {
      title: "Cabinet",
      audience: "Cabinet de groupe",
      seatsLabel: `Jusqu’à ${cabinet?.seats ?? 6} utilisateurs`,
      seatsDetail: "Plusieurs médecins · IDE · admin cabinet",
      priceMonthlyHt: cabinet?.priceHtEur ?? null,
      cta: "Commencer l'essai",
      href: "/inscription",
      featured: true,
      includes: [
        "Tout Solo, plus :",
        "Équipe multi-médecins, droits par rôle",
        "Tableau de bord partagé (agenda, alertes, documents)",
        "Statistiques & indicateurs cabinet",
        "Préparation IDE (constantes, ECG) puis validation médecin",
        "Invitations & gestion d’équipe",
        "Export / portabilité des données du tenant",
      ],
      note: "Le plus adapté aux structures à plusieurs praticiens",
    },
    {
      title: "Clinique / service",
      audience: "Établissement & service hospitalier",
      seatsLabel: `Jusqu’à ${clinique?.seats ?? 50} utilisateurs`,
      seatsDetail: "Service de cardiologie · équipes élargies",
      priceMonthlyHt: clinique?.priceHtEur ?? null,
      cta: "Nous contacter",
      href: "mailto:contact@" + ROOT_DOMAIN,
      outline: true,
      includes: [
        "Tout Cabinet, plus :",
        "Vue hospitalisation (lits, sorties, examens en attente)",
        "Transmissions de service",
        "SSO établissement (prévu)",
        "Accompagnement contractualisation HDS",
        "Paramétrage et formation sur devis",
      ],
      note: "Devis selon effectifs et périmètre établissement",
    },
  ];

  return <PricingPlans plans={plans} />;
}
