"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const ANNUAL_DISCOUNT = 0.1;

export type PricingPlan = {
  title: string;
  audience: string;
  seatsLabel: string;
  seatsDetail: string;
  /** Prix catalogue mensuel HT (€). null = sur devis. */
  priceMonthlyHt: number | null;
  cta: string;
  href: string;
  includes: string[];
  note: string;
  featured?: boolean;
  outline?: boolean;
};

type BillingPeriod = "mensuel" | "annuel";

function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(n);
}

/** Équivalent mensuel annuel : −10 % puis arrondi à l’euro le plus proche. */
function monthlyEquivalent(priceMonthly: number, period: BillingPeriod): number {
  if (period === "mensuel") return priceMonthly;
  return Math.round(priceMonthly * (1 - ANNUAL_DISCOUNT));
}

/** Total annuel = 12 × mensuel déjà arrondi (prix nets ronds). */
function annualTotal(priceMonthly: number): number {
  return monthlyEquivalent(priceMonthly, "annuel") * 12;
}

export function PricingPlans({ plans }: { plans: PricingPlan[] }) {
  const [period, setPeriod] = useState<BillingPeriod>("mensuel");

  return (
    <section id="tarifs" className="border-t border-[#E3E9F4] bg-[#F4F7FC]/60">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.75rem,3vw,2.35rem)] font-extrabold">
            Une offre par taille de structure
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#3E4D6A]">
            Prix hors taxes. Chaque cabinet dispose d’une base et d’un sous-domaine dédiés. Les
            modules à finalité médicale restent désactivables par feature flag.
          </p>

          <div
            className="mt-8 inline-flex rounded-full border border-[#DCE4F2] bg-white p-1"
            role="group"
            aria-label="Période de facturation"
          >
            <button
              type="button"
              onClick={() => setPeriod("mensuel")}
              className={cn(
                "rounded-full px-4 py-2 text-[14px] font-bold transition-colors",
                period === "mensuel"
                  ? "bg-[#0B4FB3] text-white"
                  : "text-[#3E4D6A] hover:text-[#0A1F44]",
              )}
              aria-pressed={period === "mensuel"}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setPeriod("annuel")}
              className={cn(
                "rounded-full px-4 py-2 text-[14px] font-bold transition-colors",
                period === "annuel"
                  ? "bg-[#0B4FB3] text-white"
                  : "text-[#3E4D6A] hover:text-[#0A1F44]",
              )}
              aria-pressed={period === "annuel"}
            >
              Annuel{" "}
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-extrabold",
                  period === "annuel" ? "bg-white/20 text-white" : "bg-[#E6F5EE] text-[#0F7A4D]",
                )}
              >
                −10 %
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard key={plan.title} plan={plan} period={period} />
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] leading-relaxed text-[#52627F]">
          TVA en sus selon régime. Mensuel : sans engagement, résiliable à tout moment. Annuel :
          facturation une fois par an (−10 %). Hébergement de données de santé : contractualisation
          HDS requise avant production. {APP_NAME} n’émet aucune décision médicale automatique.
        </p>
      </div>
    </section>
  );
}

function PricingCard({ plan, period }: { plan: PricingPlan; period: BillingPeriod }) {
  const {
    title,
    audience,
    seatsLabel,
    seatsDetail,
    priceMonthlyHt,
    cta,
    href,
    includes,
    note,
    featured,
    outline,
  } = plan;

  const showPrice = priceMonthlyHt != null;
  const monthly = showPrice ? monthlyEquivalent(priceMonthlyHt, period) : null;
  const yearly = showPrice ? annualTotal(priceMonthlyHt) : null;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-7",
        featured
          ? "border-2 border-[#0B4FB3] shadow-[0_12px_40px_rgba(11,79,179,0.08)]"
          : "border-[#DCE4F2]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-extrabold">{title}</h3>
          <p className="mt-1 text-[13px] font-semibold text-[#0B4FB3]">{audience}</p>
        </div>
        {featured ? (
          <span className="shrink-0 rounded-full bg-[#E0313B] px-2.5 py-1 text-xs font-extrabold text-white">
            Le plus choisi
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        {monthly != null ? (
          <>
            <div className="text-[34px] leading-none font-extrabold tabular-nums">
              {formatEur(monthly)}{" "}
              <span className="text-[15px] font-semibold text-[#52627F]">€ HT / mois</span>
            </div>
            {period === "annuel" && yearly != null ? (
              <p className="mt-2 text-[13px] font-semibold text-[#0F7A4D]">
                soit {formatEur(yearly)} € HT / an (−10 %)
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-[#52627F]">
                Sans engagement · résiliable à tout moment
              </p>
            )}
          </>
        ) : (
          <div className="text-[28px] font-extrabold">Sur devis</div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-[#F4F7FC] px-3.5 py-3">
        <p className="text-[14px] font-bold text-[#0A1F44]">{seatsLabel}</p>
        <p className="mt-0.5 text-[13px] text-[#52627F]">{seatsDetail}</p>
      </div>

      <ul className="mt-5 flex list-none flex-col gap-2.5 p-0">
        {includes.map((item) => {
          const isHeader = item.endsWith("plus :");
          return (
            <li
              key={item}
              className={cn(
                "flex gap-2.5 text-[14px] leading-snug",
                isHeader ? "font-bold text-[#0A1F44]" : "text-[#3E4D6A]",
              )}
            >
              {!isHeader ? (
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#0B4FB3]" aria-hidden />
              ) : (
                <span className="w-1.5 shrink-0" aria-hidden />
              )}
              <span>{item}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-[12.5px] text-[#52627F]">{note}</p>

      <Link
        href={href}
        className={cn(
          buttonVariants({ variant: featured ? "default" : "outline" }),
          "mt-5 h-auto w-full rounded-full py-3 text-center font-bold",
          featured && "bg-[#0B4FB3] hover:bg-[#083A85]",
          outline && "border-[#0B4FB3] text-[#0B4FB3]",
        )}
      >
        {cta}
      </Link>
    </div>
  );
}
