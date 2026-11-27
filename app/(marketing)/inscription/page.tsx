"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROOT_DOMAIN, type SubdomainAvailability } from "@/lib/tenant-host";
import { CGU_VERSION, DPA_VERSION } from "@/lib/validation/inscription";
import { cn } from "@/lib/utils";
import { getSignupCaptcha } from "@/server/actions/captcha";
import { submitInscription } from "@/server/actions/inscription";
import { checkSubdomainServer } from "@/server/actions/subdomain";

const WIZARD_STEPS = [
  { id: 0, title: "Votre compte", subtitle: "Identité et e-mail professionnel" },
  { id: 1, title: "Cabinet & RPPS", subtitle: "Établissement et vérif. annuaire santé" },
  { id: 2, title: "Votre espace", subtitle: "Sous-domaine et équipe" },
  { id: 3, title: "Essai 30 jours", subtitle: "Solo inclus · sans carte bancaire" },
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

const inscriptionSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis."),
  nom: z.string().min(1, "Le nom est requis."),
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(12, "Au moins 12 caractères."),
  cabinetName: z.string().min(2, "Nom du cabinet requis."),
  rpps: z.string().regex(/^\d{11}$/, "Le numéro RPPS comporte 11 chiffres."),
  adresse: z.string().min(5, "Adresse du cabinet requise."),
  subdomain: z.string().min(1, "Choisissez un sous-domaine."),
  displayName: z.string().min(2, "Nom affiché requis."),
  cgu: z.boolean(),
  dpa: z.boolean(),
  demoData: z.boolean(),
  captchaAnswer: z.string().min(1, "Répondez à la question anti-abus."),
});

type InscriptionForm = z.infer<typeof inscriptionSchema>;

const stepFields: (keyof InscriptionForm)[][] = [
  ["prenom", "nom", "email", "password"],
  ["cabinetName", "rpps", "adresse"],
  ["subdomain", "displayName", "cgu", "dpa"],
  ["demoData", "captchaAnswer"],
];

const defaultValues: InscriptionForm = {
  prenom: "",
  nom: "",
  email: "",
  password: "",
  cabinetName: "",
  rpps: "",
  adresse: "",
  subdomain: "",
  displayName: "",
  cgu: false,
  dpa: false,
  demoData: true,
  captchaAnswer: "",
};

function SubdomainFeedback({
  availability,
  slug,
}: {
  availability: SubdomainAvailability | null;
  slug: string;
}) {
  if (!availability) {
    return <p className="text-muted-foreground text-sm">Vérification…</p>;
  }
  if (availability.status === "available") {
    return (
      <p className="text-success flex items-center gap-2 text-sm font-bold">
        <Check className="size-4" aria-hidden />
        {slug}.{ROOT_DOMAIN} est disponible
      </p>
    );
  }
  if ("message" in availability) {
    return <p className="text-destructive text-sm font-bold">{availability.message}</p>;
  }
  return null;
}

export default function InscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [availability, setAvailability] = useState<SubdomainAvailability | null>(null);
  const [captcha, setCaptcha] = useState<{ question: string; token: string } | null>(null);
  const form = useForm<InscriptionForm>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues,
    mode: "onChange",
  });

  const subdomainRaw = form.watch("subdomain");
  const slug = useMemo(() => normalizeSlug(subdomainRaw) || "votre-cabinet", [subdomainRaw]);
  const subOk = availability?.status === "available";
  const errors = form.formState.errors;

  const refreshCaptcha = useCallback(async () => {
    const c = await getSignupCaptcha();
    setCaptcha(c);
    form.setValue("captchaAnswer", "");
  }, [form]);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        const result = await checkSubdomainServer(slug);
        if (!cancelled) setAvailability(result);
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug, step]);

  async function goNext() {
    const fields = stepFields[step];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;

    if (step === 2) {
      if (!form.getValues("cgu") || !form.getValues("dpa")) {
        form.setError("cgu", { message: "Acceptez les CGU et le contrat de sous-traitance." });
        return;
      }
      const check = await checkSubdomainServer(slug);
      setAvailability(check);
      if (check.status !== "available") {
        form.setError("subdomain", {
          message: "message" in check ? check.message : "Sous-domaine indisponible.",
        });
        return;
      }
      if (!form.getValues("displayName")) {
        form.setValue("displayName", form.getValues("cabinetName"));
      }
    }

    if (step < WIZARD_STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    if (!captcha) {
      toast.error("Captcha indisponible. Actualisez la page.");
      return;
    }

    setSubmitting(true);
    try {
      const values = form.getValues();
      const result = await submitInscription({
        prenom: values.prenom,
        nom: values.nom,
        email: values.email,
        password: values.password,
        cabinetName: values.cabinetName,
        rpps: values.rpps,
        adresse: values.adresse,
        subdomain: normalizeSlug(values.subdomain),
        displayName: values.displayName || values.cabinetName,
        cgu: true as const,
        dpa: true as const,
        demoData: values.demoData,
        captchaToken: captcha.token,
        captchaAnswer: values.captchaAnswer,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        if (result.error.code === "captcha") await refreshCaptcha();
        if (result.error.code === "slug" || result.error.code === "slug_taken") setStep(2);
        if (result.error.code === "rpps") setStep(1);
        return;
      }
      router.push(
        `/inscription/attente/${result.tenantId}?slug=${encodeURIComponent(result.slug)}&email=${encodeURIComponent(values.email)}`,
      );
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
      await refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col lg:flex-row">
      <aside className="bg-foreground text-primary-foreground flex w-full shrink-0 flex-col gap-8 px-8 py-10 lg:sticky lg:top-0 lg:h-screen lg:w-1/2 lg:max-w-none lg:overflow-y-auto lg:px-12 lg:py-12">
        <Logo variant="sombre" width={240} className="-ml-2" />
        <div>
          <h1 className="text-[28px] leading-tight font-extrabold">
            Créez l&apos;espace de votre cabinet
          </h1>
          <p className="mt-2 leading-relaxed text-[#c3d1ea]">
            30 jours d&apos;essai. Aucune donnée de santé n&apos;est collectée à l&apos;inscription.
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
                      ? `${form.watch("prenom")} ${form.watch("nom")}`
                      : done && index === 1
                        ? "RPPS soumis — revue manuelle"
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

      <main className="flex min-h-0 min-w-0 flex-1 items-start justify-center px-6 py-12 sm:px-12 lg:overflow-y-auto lg:py-16">
        <form className="flex w-full max-w-xl flex-col gap-7" onSubmit={(e) => e.preventDefault()}>
          <p className="text-muted-foreground text-[13px] font-bold">
            Étape {step + 1} sur {WIZARD_STEPS.length}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight">{WIZARD_STEPS[step]?.title}</h2>

          {step === 0 && (
            <fieldset className="flex flex-col gap-4 border-0 p-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    className="h-11"
                    autoComplete="given-name"
                    {...form.register("prenom")}
                  />
                  {errors.prenom ? (
                    <p className="text-destructive text-sm">{errors.prenom.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    className="h-11"
                    autoComplete="family-name"
                    {...form.register("nom")}
                  />
                  {errors.nom ? (
                    <p className="text-destructive text-sm">{errors.nom.message}</p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail professionnelle</Label>
                <Input
                  id="email"
                  type="email"
                  className="h-11"
                  autoComplete="email"
                  {...form.register("email")}
                />
                {errors.email ? (
                  <p className="text-destructive text-sm">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="h-11 pr-11"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1.5"
                    aria-label={
                      showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                <p className="text-muted-foreground text-xs">
                  12 caractères minimum. MFA à activer à la première connexion.
                </p>
                {errors.password ? (
                  <p className="text-destructive text-sm">{errors.password.message}</p>
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
                  <p className="text-destructive text-sm">{errors.cabinetName.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rpps">Numéro RPPS</Label>
                <Input id="rpps" inputMode="numeric" className="h-11" {...form.register("rpps")} />
                <p className="text-muted-foreground text-xs">
                  Vérification provisoire : revue manuelle par le support. L&apos;essai reste
                  possible.
                </p>
                {errors.rpps ? (
                  <p className="text-destructive text-sm">{errors.rpps.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse du cabinet</Label>
                <Input id="adresse" className="h-11" {...form.register("adresse")} />
                {errors.adresse ? (
                  <p className="text-destructive text-sm">{errors.adresse.message}</p>
                ) : null}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="flex flex-col gap-5 border-0 p-0">
              <div className="border-border bg-card rounded-2xl border p-7">
                <Label htmlFor="subdomain" className="text-[15px] font-bold">
                  Sous-domaine
                </Label>
                <div
                  className={cn(
                    "mt-2 flex overflow-hidden rounded-xl border-[1.5px]",
                    subOk
                      ? "border-success"
                      : availability
                        ? "border-destructive"
                        : "border-border",
                  )}
                >
                  <span className="text-muted-foreground shrink-0 self-center pl-4 text-[17px]">
                    https://
                  </span>
                  <Input
                    id="subdomain"
                    className="h-auto min-w-0 flex-1 border-0 text-[17px] font-bold shadow-none focus-visible:ring-0"
                    spellCheck={false}
                    autoComplete="off"
                    {...form.register("subdomain")}
                  />
                  <span className="border-border bg-background text-muted-foreground border-l px-4 py-3.5 text-[17px]">
                    .{ROOT_DOMAIN}
                  </span>
                </div>
                <div className="mt-3">
                  <SubdomainFeedback availability={availability} slug={slug} />
                </div>
                <p className="text-muted-foreground mt-2 text-[13px]">
                  3 à 30 caractères : lettres minuscules, chiffres et tirets.
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
                    className="bg-background text-muted-foreground h-11"
                  />
                </div>
              </div>

              <div className="border-border bg-card rounded-2xl border px-7 py-6">
                <h3 className="text-[17px] font-extrabold">Rôles créés par défaut</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="border-separator rounded-xl border p-4">
                    <div className="flex justify-between gap-2">
                      <strong>Médecin</strong>
                      <Badge className="bg-primary-soft text-primary">
                        Vous · admin du cabinet
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#3e4d6a]">
                      Dossiers, consultations, validation et signature des comptes rendus et
                      ordonnances.
                    </p>
                  </div>
                  <div className="border-separator rounded-xl border p-4">
                    <strong>Infirmière</strong>
                    <p className="mt-2 text-sm leading-relaxed text-[#3e4d6a]">
                      Accueil, constantes, ECG, surveillance et transmissions. Pas de signature ni
                      de prescription.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="cgu"
                    className="mt-0.5"
                    checked={form.watch("cgu")}
                    onCheckedChange={(v) =>
                      form.setValue("cgu", v === true, { shouldValidate: true })
                    }
                  />
                  <Label
                    htmlFor="cgu"
                    className="block min-w-0 flex-1 text-sm leading-relaxed font-normal text-[#3e4d6a]"
                  >
                    J&apos;accepte les{" "}
                    <Link
                      href="/cgu"
                      className="text-primary font-semibold underline-offset-2 hover:underline"
                    >
                      CGU
                    </Link>{" "}
                    (version {CGU_VERSION}).
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="dpa"
                    className="mt-0.5"
                    checked={form.watch("dpa")}
                    onCheckedChange={(v) =>
                      form.setValue("dpa", v === true, { shouldValidate: true })
                    }
                  />
                  <Label
                    htmlFor="dpa"
                    className="block min-w-0 flex-1 text-sm leading-relaxed font-normal text-[#3e4d6a]"
                  >
                    J&apos;accepte le{" "}
                    <Link
                      href="/sous-traitance"
                      className="text-primary font-semibold underline-offset-2 hover:underline"
                    >
                      contrat de sous-traitance (art. 28 RGPD)
                    </Link>{" "}
                    (version {DPA_VERSION}). Je reste responsable du traitement des données de mes
                    patients.
                  </Label>
                </div>
                {errors.cgu ? (
                  <p className="text-destructive text-sm">{errors.cgu.message}</p>
                ) : null}
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="flex flex-col gap-6 border-0 p-0">
              <div className="rounded-2xl border border-[#0B4FB3]/25 bg-[#E8F0FB]/60 p-6">
                <p className="text-[13px] font-extrabold tracking-[0.12em] text-[#0B4FB3] uppercase">
                  Inclus dès aujourd&apos;hui
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-[#0A1F44]">
                  Essai 30 jours — offre Solo
                </h3>
                <ul className="mt-4 list-none space-y-2 p-0 text-[14.5px] leading-relaxed text-[#3E4D6A]">
                  <li>Aucun paiement aujourd&apos;hui · sans carte bancaire.</li>
                  <li>
                    Après l&apos;essai : abonnement Solo (jusqu&apos;à 2 utilisateurs). Vous pourrez
                    passer à Cabinet ou Clinique depuis Paramètres → Abonnement.
                  </li>
                  <li>
                    Deux rappels e-mail une semaine et la veille de la fin d&apos;essai (aucune
                    donnée clinique dans les messages).
                  </li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="demoData"
                  checked={form.watch("demoData")}
                  onCheckedChange={(v) => form.setValue("demoData", v === true)}
                />
                <Label
                  htmlFor="demoData"
                  className="text-sm leading-relaxed font-normal text-[#3e4d6a]"
                >
                  Inclure un jeu de <strong>données de démonstration synthétiques</strong> (patients
                  fictifs clairement étiquetés). Désactivable.
                </Label>
              </div>

              <div className="border-border bg-card space-y-2 rounded-2xl border p-5">
                <Label htmlFor="captchaAnswer">
                  {captcha?.question ?? "Chargement anti-abus…"}
                </Label>
                <Input
                  id="captchaAnswer"
                  className="h-11 max-w-[12rem]"
                  inputMode="numeric"
                  autoComplete="off"
                  {...form.register("captchaAnswer")}
                />
                <button
                  type="button"
                  className="text-primary text-xs font-bold underline"
                  onClick={() => void refreshCaptcha()}
                >
                  Nouvelle question
                </button>
                {errors.captchaAnswer ? (
                  <p className="text-destructive text-sm">{errors.captchaAnswer.message}</p>
                ) : null}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            {step === 0 ? (
              <Link
                href="/"
                className={cn(
                  "bg-card inline-flex h-auto items-center justify-center rounded-full border border-[#c9d5ea] px-5 py-3.5 text-sm font-bold",
                )}
              >
                Retour
              </Link>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-auto rounded-full px-5 py-3.5"
                onClick={goBack}
                disabled={submitting}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Précédent
              </Button>
            )}
            <Button
              type="button"
              className="h-auto rounded-full px-6 py-3.5 text-base font-bold"
              onClick={() => void goNext()}
              disabled={submitting}
            >
              {step === WIZARD_STEPS.length - 1 ? (
                submitting ? (
                  "Création…"
                ) : (
                  <>
                    Créer {slug}.{ROOT_DOMAIN}
                  </>
                )
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
