"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreditCard, Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROOT_DOMAIN } from "@/lib/tenant-host";
const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
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

export function ConnexionClient() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenant = params.tenant ?? "dr-martin";
  const tenantInfo = TENANT_LABELS[tenant] ?? {
    name: `Cabinet ${tenant}`,
  };

  const [phase, setPhase] = useState<"login" | "mfa">("login");

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "c.martin@cabinet-martin.fr",
      password: "motdepasse-demo",
    },
  });

  const mfaForm = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: "",
      trustDevice: false,
    },
  });

  const onLogin = loginForm.handleSubmit(() => {
    setPhase("mfa");
  });

  const onMfa = mfaForm.handleSubmit(() => {
    router.push("/tableau-de-bord");
  });

  const formatMfaInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    const parts = [digits.slice(0, 3), digits.slice(3, 6)].filter(Boolean);
    return parts.join(" ");
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-background text-foreground">
      <main className="flex min-w-0 flex-1 basis-[520px] items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col gap-6">
          <Logo variant="clair" width={230} className="-ml-1" />
          <div className="flex items-center gap-2.5 rounded-xl bg-primary-soft px-3.5 py-3">
            <Shield className="size-[18px] text-primary" aria-hidden />
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
              <Button
                type="button"
                variant="outline"
                disabled
                className="relative h-auto w-full justify-center gap-2.5 py-3.5 text-[15px] font-bold"
              >
                <CreditCard className="size-5 text-primary" aria-hidden />
                Se connecter avec Pro Santé Connect (e-CPS)
                <Badge
                  variant="secondary"
                  className="absolute -top-2 right-2 text-[10px] font-extrabold uppercase"
                >
                  À venir
                </Badge>
              </Button>
              <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou avec votre e-mail
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mail">Adresse e-mail professionnelle</Label>
                <Input id="mail" type="email" className="h-11" {...loginForm.register("email")} />
                {loginForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <span className="flex justify-between">
                <Label htmlFor="pwd">Mot de passe</Label>
                <Link href="#pwd" className="text-sm font-semibold text-primary">
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
                <p className="text-sm text-destructive">
                  {loginForm.formState.errors.password.message}
                </p>
              ) : null}
              <Button type="submit" className="h-auto w-full py-4 text-base font-bold">
                Continuer
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onMfa} noValidate>
              <h1 className="text-3xl font-extrabold tracking-tight">Vérification en deux étapes</h1>
              <p className="leading-relaxed text-[#3e4d6a]">
                Saisissez le code à 6 chiffres de votre application d&apos;authentification.
              </p>
              <Label htmlFor="code">Code de vérification</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="h-auto border-primary py-4 text-center text-[28px] font-extrabold tracking-[0.35em]"
                value={mfaForm.watch("code")}
                onChange={(e) =>
                  mfaForm.setValue("code", formatMfaInput(e.target.value), { shouldValidate: true })
                }
              />
              {mfaForm.formState.errors.code ? (
                <p className="text-sm text-destructive">{mfaForm.formState.errors.code.message}</p>
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
              <Button type="submit" className="h-auto w-full py-4 text-base font-bold">
                Accéder à mon espace
              </Button>
              <Button
                type="button"
                variant="link"
                className="text-sm font-bold"
                onClick={() => setPhase("login")}
              >
                Revenir à la connexion
              </Button>
            </form>
          )}

          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Session verrouillée automatiquement après 15 min d&apos;inactivité. Chaque connexion est
            inscrite au journal d&apos;audit du cabinet.
          </p>
        </div>
      </main>

      <aside className="flex min-w-0 flex-1 basis-[520px] flex-col justify-center gap-7 bg-foreground px-10 py-16 text-primary-foreground sm:px-14">
        <p className="text-brand-red text-[13px] font-extrabold tracking-widest uppercase">
          Aujourd&apos;hui au cabinet
        </p>
        <h2 className="text-4xl leading-tight font-extrabold tracking-tight">
          14 consultations, 3 ETT, 2 comptes rendus à valider.
        </h2>
        <div className="flex flex-col gap-3.5 rounded-[18px] bg-[#13305f] p-5">
          {[
            { time: "08:30 · Suivi IC", patient: "J. Dupont" },
            { time: "09:00 · ETT de contrôle", patient: "R. Lefèvre" },
            { time: "09:30 · Bilan préopératoire", patient: "M. Benali" },
          ].map((row) => (
            <div key={row.time} className="flex justify-between text-sm">
              <span className="text-[#c3d1ea]">{row.time}</span>
              <span className="font-bold">{row.patient}</span>
            </div>
          ))}
          <p className="text-xs text-[#9fb3d9]">
            Patients fictifs — aperçu visible uniquement après connexion.
          </p>
        </div>
      </aside>
    </div>
  );
}