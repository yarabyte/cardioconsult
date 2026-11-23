"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROOT_DOMAIN,
  checkSubdomainAvailability,
  type SubdomainAvailability,
} from "@/lib/tenant-host";
import { cn } from "@/lib/utils";

const WIZARD_STEPS = [
  { id: 0, title: "Votre compte", subtitle: "Identité et e-mail professionnel" },
  { id: 1, title: "Cabinet & RPPS", subtitle: "Établissement et vérif. annuaire santé" },
  { id: 2, title: "Votre espace", subtitle: "Sous-domaine et équipe" },
  { id: 3, title: "Offre & essai", subtitle: "Aucun paiement aujourd'hui" },
] as const;

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const inscriptionSchema = z
  .object({
    prenom: z.string().min(1, "Le prénom est requis."),
    nom: z.string().min(1, "Le nom est requis."),
    email: z.string().email("Adresse e-mail invalide."),
    password: z.string().min(8, "Au moins 8 caractères."),
    cabinetName: z.string().min(2, "Nom du cabinet requis."),
    rpps: z
      .string()
      .regex(/^\d{11}$/, "Le numéro RPPS comporte 11 chiffres."),
    adresse: z.string().min(5, "Adresse du cabinet requise."),
    subdomain: z.string().min(1, "Choisissez un sous-domaine."),
    displayName: z.string().min(2, "Nom affiché requis."),
    cgu: z.boolean(),
    plan: z.enum(["solo", "cabinet", "clinique"]),
  });

type InscriptionForm = z.infer<typeof inscriptionSchema>;

const stepFields: (keyof InscriptionForm)[][] = [
  ["prenom", "nom", "email", "password"],
  ["cabinetName", "rpps", "adresse"],
  ["subdomain", "displayName", "cgu"],
  ["plan"],
];

const defaultValues: InscriptionForm = {
  prenom: "Claire",
  nom: "Martin",
  email: "c.martin@cabinet-martin.fr",
  password: "",
  cabinetName: "Cabinet de cardiologie Martin",
  rpps: "10001234567",
  adresse: "12 rue des Lilas, 69003 Lyon",
  subdomain: "cabinet-martin",
  displayName: "Cabinet de cardiologie Martin",
  cgu: true,
  plan: "cabinet",
};

function SubdomainFeedback({
  availability,
  slug,
}: {
  availability: SubdomainAvailability;
  slug: string;
}) {
  if (availability.status === "available") {
    return (
      <p className="flex items-center gap-2 text-sm font-bold text-success">
        <Check className="size-4" aria-hidden />
        {slug}.{ROOT_DOMAIN} est disponible
      </p>
    );
  }
  if ("message" in availability) {
    return <p className="text-sm font-bold text-destructive">{availability.message}</p>;
  }
  return null;
}

export default function InscriptionPage() {
  const [step, setStep] = useState(0);
  const form = useForm<InscriptionForm>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues,
    mode: "onChange",
  });

  const subdomainRaw = form.watch("subdomain");
  const slug = useMemo(() => normalizeSlug(subdomainRaw) || "votre-cabinet", [subdomainRaw]);
  const availability = useMemo(
    () => checkSubdomainAvailability(slug),
    [slug],
  );
  const subOk = availability.status === "available";

  const errors = form.formState.errors;

  async function goNext() {
    const fields = stepFields[step];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;

    if (step === 2) {
      if (!form.getValues("cgu")) {
        form.setError("cgu", { message: "Vous devez accepter les CGU." });
        return;
      }
      if (availability.status !== "available") {
        form.setError("subdomain", {
          message:
            "message" in availability ? availability.message : "Sous-domaine indisponible.",
        });
        return;
      }
    }

    if (step < WIZARD_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      const finalSlug = normalizeSlug(form.getValues("subdomain"));
      const finalCheck = checkSubdomainAvailability(finalSlug);
      if (finalCheck.status !== "available") {
        form.setError("subdomain", {
          message: "message" in finalCheck ? finalCheck.message : "Sous-domaine indisponible.",
        });
        setStep(2);
        return;
      }
      toast.success(`Espace ${finalSlug}.${ROOT_DOMAIN} créé (démo).`);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-background text-foreground">
      <aside className="flex min-h-screen min-w-0 flex-1 basis-[340px] max-w-[460px] flex-col gap-9 bg-foreground px-8 py-10 text-primary-foreground">
        <Logo variant="sombre" width={240} className="-ml-2" />
        <div>
          <h1 className="text-[28px] leading-tight font-extrabold">
            Créez l&apos;espace de votre cabinet
          </h1>
          <p className="mt-2 leading-relaxed text-[#c3d1ea]">
            30 jours d&apos;essai, données fictives de démonstration incluses.
          </p>
        </div>
        <ol className="flex list-none flex-col gap-1.5 p-0">
          {WIZARD_STEPS.map((s, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <li
                key={s.id}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl p-3",
                  current && "bg-[#13305f]",
                )}
              >
                <span
                  className={cn(
                    "flex size-[30px] items-center justify-center rounded-full text-sm font-extrabold",
                    done && "bg-success text-white",
                    current && !done && "bg-brand-red text-white",
                    !done && !current && "border-2 border-[#3d5a8a] text-[#9fb3d9]",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : index + 1}
                </span>
                <span>
                  <strong className={!current && !done ? "text-[#c3d1ea]" : undefined}>
                    {s.title}
                  </strong>
                  <br />
                  <span className="text-[13px] text-[#9fb3d9]">
                    {done && index === 0
                      ? `Dr ${form.watch("prenom")} ${form.watch("nom")} · e-mail vérifié`
                      : done && index === 1
                        ? "RPPS vérifié via l'annuaire santé"
                        : s.subtitle}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-auto text-[12.5px] leading-relaxed text-[#9fb3d9]">
          Chaque espace dispose d&apos;une base de données isolée. Aucun autre cabinet ne peut
          accéder à vos patients.
        </p>
      </aside>

      <main className="min-w-0 flex-[999] basis-[560px] px-6 py-12 sm:px-12">
        <form
          className="mx-auto flex max-w-3xl flex-col gap-7"
          onSubmit={(e) => e.preventDefault()}
        >
          <p className="text-[13px] font-bold text-muted-foreground">
            Étape {step + 1} sur {WIZARD_STEPS.length}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight">{WIZARD_STEPS[step]?.title}</h2>

          {step === 0 && (
            <fieldset className="flex flex-col gap-4 border-0 p-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" className="h-11" {...form.register("prenom")} />
                  {errors.prenom ? (
                    <p className="text-sm text-destructive">{errors.prenom.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" className="h-11" {...form.register("nom")} />
                  {errors.nom ? (
                    <p className="text-sm text-destructive">{errors.nom.message}</p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail professionnelle</Label>
                <Input id="email" type="email" className="h-11" {...form.register("email")} />
                {errors.email ? (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  className="h-11"
                  autoComplete="new-password"
                  {...form.register("password")}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                ) : null}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="flex flex-col gap-4 border-0 p-0">
              <div className="space-y-2">
                <Label htmlFor="cabinetName">Nom du cabinet</Label>
                <Input id="cabinetName" className="h-11" {...form.register("cabinetName")} />
                {errors.cabinetName ? (
                  <p className="text-sm text-destructive">{errors.cabinetName.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rpps">Numéro RPPS</Label>
                <Input id="rpps" inputMode="numeric" className="h-11" {...form.register("rpps")} />
                {errors.rpps ? (
                  <p className="text-sm text-destructive">{errors.rpps.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse du cabinet</Label>
                <Input id="adresse" className="h-11" {...form.register("adresse")} />
                {errors.adresse ? (
                  <p className="text-sm text-destructive">{errors.adresse.message}</p>
                ) : null}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="flex flex-col gap-5 border-0 p-0">
              <div className="rounded-2xl border border-border bg-card p-7">
                <Label htmlFor="subdomain" className="text-[15px] font-bold">
                  Sous-domaine
                </Label>
                <div
                  className={cn(
                    "mt-2 flex overflow-hidden rounded-xl border-[1.5px]",
                    subOk ? "border-success" : "border-destructive",
                  )}
                >
                  <span className="shrink-0 self-center pl-4 text-[17px] text-muted-foreground">
                    https://
                  </span>
                  <Input
                    id="subdomain"
                    className="h-auto min-w-0 flex-1 border-0 text-[17px] font-bold shadow-none focus-visible:ring-0"
                    spellCheck={false}
                    autoComplete="off"
                    {...form.register("subdomain")}
                  />
                  <span className="border-l border-border bg-background px-4 py-3.5 text-[17px] text-muted-foreground">
                    .{ROOT_DOMAIN}
                  </span>
                </div>
                <div className="mt-3">
                  <SubdomainFeedback availability={availability} slug={slug} />
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  3 à 30 caractères : lettres minuscules, chiffres et tirets. Modifiable plus tard par
                  le support.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nom affiché du cabinet</Label>
                  <Input id="displayName" className="h-11" {...form.register("displayName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hds">Hébergement des données</Label>
                  <Input
                    id="hds"
                    readOnly
                    value="France — hébergeur HDS"
                    className="h-11 bg-background text-muted-foreground"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card px-7 py-6">
                <h3 className="text-[17px] font-extrabold">Rôles créés par défaut</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-separator p-4">
                    <div className="flex justify-between gap-2">
                      <strong>Médecin</strong>
                      <Badge className="bg-primary-soft text-primary">Vous · admin du cabinet</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#3e4d6a]">
                      Dossiers, consultations, validation et signature des comptes rendus et
                      ordonnances.
                    </p>
                  </div>
                  <div className="rounded-xl border border-separator p-4">
                    <strong>Infirmière</strong>
                    <p className="mt-2 text-sm leading-relaxed text-[#3e4d6a]">
                      Accueil, constantes, ECG, surveillance et transmissions. Pas de signature ni
                      de prescription.
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Vous inviterez votre équipe depuis Paramètres → Équipe & rôles.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="cgu"
                  checked={form.watch("cgu")}
                  onCheckedChange={(v) => form.setValue("cgu", v === true, { shouldValidate: true })}
                />
                <Label htmlFor="cgu" className="text-sm leading-relaxed font-normal text-[#3e4d6a]">
                  J&apos;accepte les <Link href="/">CGU</Link> et le{" "}
                  <Link href="/">contrat de sous-traitance (art. 28 RGPD)</Link>. Je reste
                  responsable du traitement des données de mes patients.
                </Label>
              </div>
              {errors.cgu ? (
                <p className="text-sm text-destructive">{errors.cgu.message}</p>
              ) : null}
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="grid gap-4 border-0 p-0 sm:grid-cols-3">
              {(
                [
                  { id: "solo" as const, name: "Solo", detail: "1 cardiologue · 1 infirmière" },
                  {
                    id: "cabinet" as const,
                    name: "Cabinet",
                    detail: "Jusqu'à 5 médecins",
                    featured: true,
                  },
                  {
                    id: "clinique" as const,
                    name: "Clinique / service",
                    detail: "Sur devis · SSO",
                  },
                ] as const
              ).map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => form.setValue("plan", offer.id)}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-colors",
                    form.watch("plan") === offer.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border bg-card",
                    "featured" in offer && offer.featured && "border-primary",
                  )}
                >
                  <strong className="block text-lg font-bold">{offer.name}</strong>
                  <span className="mt-2 block text-sm text-muted-foreground">{offer.detail}</span>
                  {offer.id !== "clinique" ? (
                    <span className="mt-3 block text-2xl font-extrabold tabular-nums">
                      [PRIX] <span className="text-sm font-semibold text-muted-foreground">€ HT</span>
                    </span>
                  ) : (
                    <span className="mt-3 block text-2xl font-extrabold">Sur devis</span>
                  )}
                </button>
              ))}
            </fieldset>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            {step === 0 ? (
              <Link
                href="/"
                className={cn(
                  "inline-flex h-auto items-center justify-center rounded-xl border border-[#c9d5ea] bg-card px-5 py-3.5 text-sm font-bold",
                )}
              >
                Retour
              </Link>
            ) : (
              <Button type="button" variant="outline" className="h-auto px-5 py-3.5" onClick={goBack}>
                <ChevronLeft className="size-4" aria-hidden />
                Précédent
              </Button>
            )}
            <Button
              type="button"
              className="h-auto px-6 py-3.5 text-base font-bold"
              onClick={goNext}
            >
              {step === WIZARD_STEPS.length - 1 ? (
                <>Créer {slug}.{ROOT_DOMAIN}</>
              ) : (
                <>
                  Suivant
                  <ChevronRight className="size-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}