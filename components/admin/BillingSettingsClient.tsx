"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";

function subscribeMinute(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(id);
}
function getClientNow() {
  return Date.now();
}
function getServerNow() {
  return 0;
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  changePlanAction,
  loadBillingAction,
  openPortalAction,
  requestReversibilityExportAction,
  startCheckoutAction,
} from "@/server/actions/billing";
import type { Subscription } from "@/types/domain";
import type { BillingInvoice } from "@/server/billing/types";
import { cn } from "@/lib/utils";

type CatalogRow = {
  key: "solo" | "cabinet" | "clinique";
  label: string;
  seats: number;
  modules: string[];
  priceHtEur: number | null;
};

export function BillingSettingsClient() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [statusLabel, setStatusLabel] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [legalName, setLegalName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"solo" | "cabinet" | "clinique">("solo");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nowMs = useSyncExternalStore(subscribeMinute, getClientNow, getServerNow);

  const trialDaysLeft = (() => {
    if (!nowMs || !subscription?.trialEndsAt || subscription.status !== "trialing") {
      return null;
    }
    const ms = new Date(subscription.trialEndsAt).getTime() - nowMs;
    return Math.max(0, Math.ceil(ms / 86_400_000));
  })();

  const refresh = () => {
    startTransition(async () => {
      const r = await loadBillingAction();
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setSubscription(r.subscription);
      setInvoices(r.invoices);
      setCatalog(r.catalog);
      setStatusLabel(r.statusLabel);
      setReadOnly(r.readOnly);
      setProviderId(r.providerId);
      setLegalName(r.subscription.billingLegalName ?? "");
      setBillingEmail(r.subscription.billingEmail ?? "");
      setBillingAddress(r.subscription.billingAddress ?? "");
      const planKey =
        r.subscription.plan === "Solo"
          ? "solo"
          : r.subscription.plan === "Clinique"
            ? "clinique"
            : "cabinet";
      setSelectedPlan(planKey);
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const checkout = () => {
    startTransition(async () => {
      const r = await startCheckoutAction({
        planKey: selectedPlan,
        legalName,
        billingEmail,
        billingAddress,
      });
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setMessage(
        `Checkout ${providerId} — aucune carte saisie dans Cardio Soin. Redirection : ${r.url}`,
      );
      refresh();
    });
  };

  const portal = () => {
    startTransition(async () => {
      const r = await openPortalAction();
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setMessage(`Portail client ouvert (hébergé hors app) : ${r.url}`);
    });
  };

  const changePlan = () => {
    startTransition(async () => {
      const r = await changePlanAction({ planKey: selectedPlan });
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setMessage(`Offre mise à jour : ${r.subscription.plan}`);
      refresh();
    });
  };

  const exportData = () => {
    startTransition(async () => {
      const r = await requestReversibilityExportAction();
      setMessage(r.ok ? r.message : r.error);
    });
  };

  return (
    <div className="flex min-w-0 flex-[999] flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Abonnement & factures</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Offres Solo / Cabinet / Clinique · TVA française · paiement hors application (Stripe)
        </p>
      </div>

      {readOnly ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-semibold"
        >
          Cabinet en lecture seule — continuité des soins (consultation des dossiers) et export
          disponibles. Régularisez l&apos;abonnement pour retrouver l&apos;écriture.
        </p>
      ) : null}

      {message ? (
        <p role="status" className="text-primary text-sm font-semibold">
          {message}
        </p>
      ) : null}

      {subscription?.status === "trialing" && trialDaysLeft != null ? (
        <section className="rounded-2xl border border-[#0B4FB3]/25 bg-[#E8F0FB]/70 p-4">
          <p className="text-[12px] font-extrabold tracking-[0.12em] text-[#0B4FB3] uppercase">
            Essai en cours
          </p>
          <p className="mt-1 text-lg font-extrabold text-[#0A1F44]">
            {trialDaysLeft === 0
              ? "Dernier jour d’essai"
              : trialDaysLeft === 1
                ? "1 jour restant"
                : `${trialDaysLeft} jours restants`}
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Après l’essai, l’abonnement par défaut est Solo. Vous pouvez souscrire ou passer à
            Cabinet / Clinique ci-dessous. Des rappels e-mail sont envoyés à J-7 et J-1.
          </p>
          {subscription.trialEndsAt ? (
            <p className="mt-2 text-sm font-semibold">
              Fin d’essai : {formatDateTime(subscription.trialEndsAt)}
            </p>
          ) : null}
        </section>
      ) : null}

      {subscription ? (
        <section className="border-border bg-card space-y-3 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold">Offre actuelle</h2>
            <Badge>{subscription.plan}</Badge>
            <Badge variant="outline">{statusLabel}</Badge>
            <span className="text-muted-foreground text-xs">Fournisseur · {providerId}</span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Sièges</dt>
              <dd className="font-bold tabular-nums">{subscription.seats}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fin de période / essai</dt>
              <dd className="font-bold">
                {subscription.trialEndsAt
                  ? formatDateTime(subscription.trialEndsAt)
                  : subscription.currentPeriodEnd
                    ? formatDateTime(subscription.currentPeriodEnd)
                    : "—"}
              </dd>
            </div>
            {subscription.graceEndsAt ? (
              <div>
                <dt className="text-muted-foreground">Fin de grâce (impayé)</dt>
                <dd className="text-warning font-bold">
                  {formatDateTime(subscription.graceEndsAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="border-border bg-card space-y-4 rounded-2xl border p-4">
        <h2 className="text-base font-extrabold">Identité de facturation</h2>
        <p className="text-muted-foreground text-xs">
          Seuls la raison sociale, l&apos;adresse et l&apos;e-mail administrateur sont transmis au
          prestataire de paiement — jamais de donnée de santé ni de nom de patient.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="legal">Raison sociale</Label>
            <Input id="legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bemail">E-mail facturation</Label>
            <Input
              id="bemail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="baddr">Adresse de facturation</Label>
            <Input
              id="baddr"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold">Choisir ou upgrader l&apos;offre</h3>
          <div className="flex flex-wrap gap-2">
            {catalog.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPlan(p.key)}
                aria-pressed={selectedPlan === p.key}
                className={cn(
                  "border-border rounded-2xl border px-3 py-2.5 text-left text-sm",
                  selectedPlan === p.key && "border-primary ring-primary/30 ring-2",
                  p.key !== "solo" && subscription?.plan === "Solo" && "border-dashed",
                )}
              >
                <p className="font-extrabold">
                  {p.label}
                  {p.key !== "solo" && subscription?.plan === "Solo" ? (
                    <span className="text-primary ml-1 text-xs font-bold">Upgrade</span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {p.priceHtEur != null ? `${formatNumber(p.priceHtEur)} € HT / mois` : "Sur devis"}{" "}
                  · {p.seats} sièges
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-full" onClick={checkout} disabled={pending}>
            Payer / souscrire (Checkout)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={changePlan}
            disabled={pending}
          >
            Appliquer l&apos;offre sélectionnée
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={portal}
            disabled={pending}
          >
            Portail factures
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            onClick={exportData}
            disabled={pending}
          >
            Export de réversibilité
          </Button>
        </div>
      </section>

      <section className="border-border overflow-hidden rounded-2xl border bg-white">
        <div className="border-border border-b px-4 py-3">
          <h2 className="text-base font-extrabold">Factures</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>HT</TableHead>
              <TableHead>TVA</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Aucune facture pour l&apos;instant.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.number}</TableCell>
                  <TableCell>{formatDateTime(inv.issuedAt)}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(inv.amountHtEur)} €</TableCell>
                  <TableCell className="tabular-nums">{inv.vatRate * 100} %</TableCell>
                  <TableCell>{inv.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
