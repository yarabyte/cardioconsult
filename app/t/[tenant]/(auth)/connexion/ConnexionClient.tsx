"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CreditCard, Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROOT_DOMAIN } from "@/lib/tenant-host";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(12, "Mot de passe : 12 caractères minimum."),
});

const mfaSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Saisissez les 6 chiffres du code.")),
  trustDevice: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type MfaForm = z.infer<typeof mfaSchema>;

const TENANT_LABELS: Record<string, { name: string }> = {
  "dr-martin": { name: "Cabinet de cardiologie Martin" },
};

const AUTH_ERROR = "Identifiants invalides";
const EMAIL_UNVERIFIED =
  "Confirmez votre adresse e-mail avant de vous connecter. Un nouveau lien peut être renvoyé.";

function isEmailNotVerifiedError(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false;
  const code = (error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toUpperCase();
  return code.includes("EMAIL_NOT_VERIFIED") || message.includes("EMAIL_NOT_VERIFIED");
}

export function ConnexionClient() {
  const params = useParams<{ tenant: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const tenant = params.tenant ?? "dr-martin";
  const tenantInfo = TENANT_LABELS[tenant] ?? {
    name: `Cabinet ${tenant}`,
  };
  const [phase, setPhase] = useState<"login" | "mfa">("login");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const justVerified = search.get("verified") === "1";

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mfaForm = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: "",
      trustDevice: false,
    },
  });

  const resendVerification = async (email: string) => {
    setResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: `/inscription/email-verifie?slug=${encodeURIComponent(tenant)}`,
      });
      if (error) {
        toast.error("Impossible d’envoyer l’e-mail. Réessayez.");
        return;
      }
      toast.success("E-mail de confirmation renvoyé.");
    } catch {
      toast.error("Impossible d’envoyer l’e-mail. Réessayez.");
    } finally {
      setResending(false);
    }
  };

  const onLogin = loginForm.handleSubmit(async (values) => {
    setFormError(null);
    setNeedsVerification(false);
    setPending(true);
    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: `/tableau-de-bord`,
      });
      if (error) {
        if (isEmailNotVerifiedError(error)) {
          setNeedsVerification(true);
          setFormError(EMAIL_UNVERIFIED);
          return;
        }
        setFormError(AUTH_ERROR);
        return;
      }
      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
        setPhase("mfa");
        return;
      }
      // MFA non enrôlée → forcer l'enrôlement
      router.push("/connexion/mfa-enroll");
    } catch {
      setFormError(AUTH_ERROR);
    } finally {
      setPending(false);
    }
  });

  const onMfa = mfaForm.handleSubmit(async (values) => {
    setFormError(null);
    setPending(true);
    try {
      const code = values.code.replace(/\s/g, "");
      const { error } = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: values.trustDevice,
      });
      if (error) {
        setFormError(AUTH_ERROR);
        return;
      }
      router.push("/tableau-de-bord");
    } catch {
      setFormError(AUTH_ERROR);
    } finally {
      setPending(false);
    }
  });

  const formatMfaInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    const parts = [digits.slice(0, 3), digits.slice(3, 6)].filter(Boolean);
    return parts.join(" ");
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-wrap">
      <main className="flex min-w-0 flex-1 basis-[520px] items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col gap-6">
          <Logo variant="clair" width={230} className="-ml-1" />
          <div className="bg-primary-soft flex items-center gap-2.5 rounded-xl px-3.5 py-3">
            <Shield className="text-primary size-[18px]" aria-hidden />
            <div className="text-sm">
              <strong>{tenantInfo.name}</strong>
              <br />
              <span className="text-[#3e4d6a]">
                {tenant}.{ROOT_DOMAIN}
              </span>
            </div>
          </div>

          {phase === "login" ? (
            <form className="flex flex-col gap-4" onSubmit={onLogin} noValidate>
              <h1 className="text-3xl font-extrabold tracking-tight">Connexion</h1>
              {justVerified ? (
                <p className="bg-primary-soft text-primary rounded-xl px-3.5 py-3 text-sm font-semibold">
                  Adresse e-mail confirmée. Vous pouvez vous connecter.
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled
                title="Pro Santé Connect — bientôt disponible (PSC_ENABLED=false)"
                className="relative h-auto w-full justify-center gap-2.5 py-3.5 text-[15px] font-bold"
              >
                <CreditCard className="text-primary size-5" aria-hidden />
                Se connecter avec Pro Santé Connect (e-CPS)
                <Badge
                  variant="secondary"
                  className="absolute -top-2 right-2 text-[10px] font-extrabold uppercase"
                >
                  À venir
                </Badge>
              </Button>
              <div className="text-muted-foreground flex items-center gap-3 text-[13px]">
                <span className="bg-border h-px flex-1" />
                ou avec votre e-mail
                <span className="bg-border h-px flex-1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mail">Adresse e-mail professionnelle</Label>
                <Input
                  id="mail"
                  type="email"
                  className="h-11"
                  autoComplete="username"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email ? (
                  <p className="text-destructive text-sm">
                    {loginForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <span className="flex justify-between">
                <Label htmlFor="pwd">Mot de passe</Label>
                <Link
                  href="/connexion/mot-de-passe-oublie"
                  className="text-primary text-sm font-semibold"
                >
                  Mot de passe oublié ?
                </Link>
              </span>
              <Input
                id="pwd"
                type="password"
                className="h-11"
                autoComplete="current-password"
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password ? (
                <p className="text-destructive text-sm">
                  {loginForm.formState.errors.password.message}
                </p>
              ) : null}
              {formError ? <p className="text-destructive text-sm">{formError}</p> : null}
              {needsVerification ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || resending}
                  className="h-auto w-full py-3.5 font-bold"
                  onClick={() => void resendVerification(loginForm.getValues("email"))}
                >
                  {resending ? "Envoi…" : "Renvoyer l’e-mail de confirmation"}
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={pending}
                className="h-auto w-full py-4 text-base font-bold"
              >
                Continuer
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onMfa} noValidate>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Vérification en deux étapes
              </h1>
              <p className="leading-relaxed text-[#3e4d6a]">
                Saisissez le code à 6 chiffres de votre application d&apos;authentification.
              </p>
              <Label htmlFor="code">Code de vérification</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="border-primary h-auto py-4 text-center text-[28px] font-extrabold tracking-[0.35em]"
                value={mfaForm.watch("code")}
                onChange={(e) =>
                  mfaForm.setValue("code", formatMfaInput(e.target.value), { shouldValidate: true })
                }
              />
              {mfaForm.formState.errors.code ? (
                <p className="text-destructive text-sm">{mfaForm.formState.errors.code.message}</p>
              ) : null}
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="trust"
                  checked={mfaForm.watch("trustDevice")}
                  onCheckedChange={(v) => mfaForm.setValue("trustDevice", v === true)}
                />
                <Label htmlFor="trust" className="text-sm font-normal text-[#3e4d6a]">
                  Faire confiance à ce poste pendant 12 h
                </Label>
              </div>
              {formError ? <p className="text-destructive text-sm">{formError}</p> : null}
              <Button
                type="submit"
                disabled={pending}
                className="h-auto w-full py-4 text-base font-bold"
              >
                Accéder à mon espace
              </Button>
              <Button
                type="button"
                variant="link"
                className="text-sm font-bold"
                onClick={() => {
                  setPhase("login");
                  setFormError(null);
                }}
              >
                Revenir à la connexion
              </Button>
            </form>
          )}

          <p className="text-muted-foreground text-[12.5px] leading-relaxed">
            Session verrouillée automatiquement après 15 min d&apos;inactivité. Chaque connexion est
            inscrite au journal d&apos;audit du cabinet.
          </p>
        </div>
      </main>

      <aside
        className="relative hidden min-h-[42vh] min-w-0 flex-1 basis-[520px] overflow-hidden bg-[#0A1F44] lg:block"
        aria-hidden
      >
        <Image
          src="/marketing/hero-cabinet.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center"
        />
      </aside>
    </div>
  );
}
