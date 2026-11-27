import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { ROOT_DOMAIN } from "@/lib/tenant-host";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ slug?: string; error?: string }>;
};

function tenantConnexionHref(slug: string): string {
  if (process.env.NODE_ENV === "development") {
    return `http://${slug}.localhost:3000/connexion?verified=1`;
  }
  return `https://${slug}.${ROOT_DOMAIN}/connexion?verified=1`;
}

export const metadata = { title: "E-mail confirmé" };

export default async function EmailVerifiePage({ searchParams }: Props) {
  const { slug, error } = await searchParams;
  const failed = Boolean(error);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Logo variant="clair" width={200} className="mb-10" />
        {failed ? (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Lien invalide ou expiré</h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Demandez un nouvel e-mail de confirmation depuis l&apos;écran de connexion de votre
              cabinet, puis réessayez.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Adresse e-mail confirmée</h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Votre compte est activé. Vous pouvez vous connecter à l&apos;espace cabinet
              {slug ? (
                <>
                  {" "}
                  <strong>
                    {slug}.{ROOT_DOMAIN}
                  </strong>
                </>
              ) : null}
              .
            </p>
          </>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {slug && !failed ? (
            <Link
              href={tenantConnexionHref(slug)}
              className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-xl px-5 font-bold")}
            >
              Se connecter
            </Link>
          ) : null}
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: slug && !failed ? "outline" : "default", size: "lg" }),
              "h-11 rounded-xl px-5 font-bold",
            )}
          >
            Accueil Cardio Soin
          </Link>
        </div>
      </div>
    </div>
  );
}
