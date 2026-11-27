"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ROOT_DOMAIN } from "@/lib/tenant-host";
import { cn } from "@/lib/utils";
import { getProvisioningStatus, retrySignupProvision } from "@/server/actions/inscription";

const PROVISION_STEPS = [
  { id: "create_role_db", label: "Création de la base isolée" },
  { id: "migrate", label: "Installation du schéma métier" },
  { id: "dek", label: "Préparation du chiffrement" },
  { id: "admin_member", label: "Compte administrateur" },
  { id: "done", label: "Espace prêt" },
] as const;

function stepIndex(step: string | null): number {
  if (!step) return 0;
  const i = PROVISION_STEPS.findIndex((s) => s.id === step);
  return i >= 0 ? i : 0;
}

export function ProvisioningWaitClient({
  tenantId,
  adminEmail,
}: {
  tenantId: string;
  adminEmail?: string | null;
}) {
  const search = useSearchParams();
  const slugHint = search.get("slug");
  const emailHint = search.get("email") ?? adminEmail ?? null;
  const [status, setStatus] = useState("provisioning");
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(slugHint);
  const [ready, setReady] = useState(false);
  const [resending, setResending] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const s = await getProvisioningStatus(tenantId);
      if (cancelled) return;
      setStatus(s.status);
      setStep(s.step);
      setError(s.error);
      const nextSlug = s.slug ?? slugHint;
      setSlug(nextSlug);
      if (s.status === "active" || s.status === "trial") {
        setReady(true);
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tenantId, slugHint]);

  const retry = async () => {
    setRetrying(true);
    setError(null);
    try {
      const s = await retrySignupProvision(tenantId);
      setStatus(s.status);
      setStep(s.step);
      setError(s.error);
      if (s.slug) setSlug(s.slug);
      if (s.status === "active" || s.status === "trial") {
        setReady(true);
        toast.success("Espace prêt.");
      } else if (s.error) {
        toast.error("La reprise a échoué. Réessayez ou contactez le support.");
      }
    } catch {
      toast.error("Impossible de reprendre le provisioning.");
    } finally {
      setRetrying(false);
    }
  };

  const resendVerification = async () => {
    if (!emailHint) {
      toast.error("Adresse e-mail indisponible pour le renvoi.");
      return;
    }
    setResending(true);
    try {
      const { error: sendError } = await authClient.sendVerificationEmail({
        email: emailHint,
        callbackURL: slug
          ? `/inscription/email-verifie?slug=${encodeURIComponent(slug)}`
          : "/inscription/email-verifie",
      });
      if (sendError) {
        toast.error("Impossible d’envoyer l’e-mail. Réessayez dans un instant.");
        return;
      }
      toast.success("E-mail de confirmation renvoyé.");
    } catch {
      toast.error("Impossible d’envoyer l’e-mail. Réessayez dans un instant.");
    } finally {
      setResending(false);
    }
  };

  const failed = status === "provisioning_failed";
  const currentIdx = ready || step === "done" ? PROVISION_STEPS.length - 1 : stepIndex(step);
  const progressPct = useMemo(() => {
    if (failed) return Math.max(8, Math.round((currentIdx / (PROVISION_STEPS.length - 1)) * 100));
    if (ready || step === "done") return 100;
    const base = currentIdx / (PROVISION_STEPS.length - 1);
    return Math.min(92, Math.round((base + 0.08) * 100));
  }, [currentIdx, failed, ready, step]);

  const connexionHref =
    slug == null
      ? null
      : typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname.endsWith(".localhost"))
        ? `${window.location.protocol}//${slug}.localhost:${window.location.port || "3000"}/connexion`
        : `https://${slug}.${ROOT_DOMAIN}/connexion`;

  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(11,79,179,0.08),_transparent_55%)]"
        aria-hidden
      />
      <header className="border-separator relative flex items-center border-b px-6 py-5">
        <Logo variant="clair" width={180} />
      </header>

      <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
        <div className="border-border bg-card rounded-3xl border p-7 shadow-[0_18px_50px_rgba(10,31,68,0.06)] sm:p-9">
          <p className="text-primary text-[12px] font-extrabold tracking-[0.14em] uppercase">
            {failed ? "Incident" : ready ? "Dernière étape" : "Provisioning"}
          </p>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-extrabold tracking-tight">
            {failed
              ? "La préparation a échoué"
              : ready
                ? "Espace prêt — confirmez votre e-mail"
                : "Préparation de votre espace"}
          </h1>
          <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
            {ready ? (
              <>
                Votre cabinet{" "}
                {slug ? (
                  <strong className="text-foreground">
                    {slug}.{ROOT_DOMAIN}
                  </strong>
                ) : (
                  "est prêt"
                )}
                . Confirmez votre adresse pour activer le compte — aucune donnée de santé n&apos;est
                collectée à cette étape.
              </>
            ) : (
              <>
                Nous créons la base isolée
                {slug ? (
                  <>
                    {" "}
                    de{" "}
                    <strong className="text-foreground">
                      {slug}.{ROOT_DOMAIN}
                    </strong>
                  </>
                ) : null}
                . Cela prend généralement moins d&apos;une minute.
              </>
            )}
          </p>

          {!failed ? (
            <div className="mt-7 space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold">
                  {ready
                    ? "Terminé"
                    : `Étape ${Math.min(currentIdx + 1, PROVISION_STEPS.length)} sur ${PROVISION_STEPS.length}`}
                </span>
                <span className="text-muted-foreground tabular-nums">{progressPct} %</span>
              </div>
              <div
                className="bg-muted h-2.5 w-full overflow-hidden rounded-full"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                aria-label="Progression du provisioning"
              >
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : null}

          <ol className="mt-7 flex list-none flex-col gap-2.5 p-0">
            {PROVISION_STEPS.map((s, index) => {
              const done =
                ready ||
                (!failed && index < currentIdx) ||
                (step === "done" && index <= currentIdx);
              const active = !ready && !failed && index === currentIdx && step !== "done";
              const errored = failed && index === currentIdx;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm",
                    active && "border-primary/30 bg-primary-soft",
                    done && !active && "border-border bg-background",
                    errored && "border-destructive/30 bg-destructive/5",
                    !done && !active && !errored && "border-transparent bg-transparent opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                      done && "bg-success text-white",
                      active && "bg-primary text-primary-foreground",
                      errored && "bg-destructive text-white",
                      !done && !active && !errored && "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="size-4" aria-hidden />
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : errored ? (
                      <X className="size-4" aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className={cn("font-semibold", active && "text-primary")}>{s.label}</span>
                </li>
              );
            })}
          </ol>

          {failed ? (
            <div className="border-destructive/30 bg-destructive/5 mt-7 rounded-2xl border p-5 text-sm">
              <p className="font-semibold">La création a échoué.</p>
              <p className="text-muted-foreground mt-1.5 leading-relaxed">
                Vous pouvez relancer la préparation. Si l’erreur persiste, contactez le support.
              </p>
              {error ? (
                <p className="text-muted-foreground mt-3 font-mono text-xs break-all">{error}</p>
              ) : null}
              <Button
                type="button"
                className="mt-4 rounded-full"
                disabled={retrying}
                onClick={() => void retry()}
              >
                {retrying ? "Reprise…" : "Réessayer la préparation"}
              </Button>
            </div>
          ) : null}

          {ready ? (
            <div className="border-border bg-background mt-7 space-y-4 rounded-2xl border p-5">
              <div className="flex items-start gap-3">
                <span className="bg-primary-soft text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Mail className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 text-sm leading-relaxed">
                  <p className="font-bold">Confirmez votre adresse e-mail</p>
                  <p className="text-muted-foreground mt-1">
                    Un message a été envoyé
                    {emailHint ? (
                      <>
                        {" "}
                        à <strong className="text-foreground">{emailHint}</strong>
                      </>
                    ) : null}
                    . Cliquez sur le lien pour activer le compte, puis connectez-vous.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={resending || !emailHint}
                  onClick={() => void resendVerification()}
                >
                  {resending ? "Envoi…" : "Renvoyer l’e-mail"}
                </Button>
                {connexionHref ? (
                  <Button
                    type="button"
                    className="rounded-full"
                    onClick={() => {
                      window.location.href = connexionHref;
                    }}
                  >
                    Aller à la connexion
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!ready && !failed ? (
            <p className="text-muted-foreground mt-6 flex items-center gap-2 text-xs leading-relaxed">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              Isolation stricte par cabinet · hébergement prévu pour HDS · aucune donnée clinique
              ici
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
