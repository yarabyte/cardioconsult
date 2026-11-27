import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorPageAction =
  | { type: "link"; href: string; label: string; variant?: "default" | "outline" }
  | { type: "button"; label: string; onClick: () => void; variant?: "default" | "outline" };

export function ErrorPage({
  code,
  title,
  description,
  actions,
  requestId,
}: {
  code: string;
  title: string;
  description: string;
  actions: ErrorPageAction[];
  /** Identifiant technique uniquement — jamais de donnée clinique. */
  requestId?: string;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-[70vh] flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Logo variant="clair" width={200} className="mb-10" />
        <p
          className="text-primary mb-3 text-sm font-extrabold tracking-[0.2em] uppercase"
          aria-hidden
        >
          {code}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{description}</p>
        {requestId ? (
          <p className="text-muted-foreground mt-4 font-mono text-xs">
            Réf. technique&nbsp;: {requestId}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => {
            if (action.type === "link") {
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    buttonVariants({
                      variant: action.variant ?? "default",
                      size: "lg",
                    }),
                    "h-11 rounded-xl px-5 font-bold",
                  )}
                >
                  {action.label}
                </Link>
              );
            }
            return (
              <Button
                key={action.label}
                type="button"
                variant={action.variant ?? "default"}
                size="lg"
                className="h-11 rounded-xl px-5 font-bold"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-10 max-w-sm text-xs leading-relaxed">
          Si le problème persiste, contactez le support Cardio Soin en indiquant la référence
          technique ci-dessus (aucune donnée patient).
        </p>
      </div>
    </div>
  );
}
