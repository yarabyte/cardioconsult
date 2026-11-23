"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ETT_RUBRICS, rubricCompleteness, type RubricState } from "@/lib/consultation/rubrics";
import { Progress } from "@/components/ui/progress";

const STATE_STYLES: Record<RubricState, string> = {
  fait: "bg-success-soft text-success",
  courant: "bg-primary text-white",
  incomplet: "bg-warning-soft text-warning",
  alerte: "bg-destructive/10 text-destructive",
  vide: "border-border text-muted-foreground border",
};

export function RubricStepper({ consultationId, currentSlug }: { consultationId: string; currentSlug: string }) {
  const pathname = usePathname();
  const { done, total } = rubricCompleteness();
  const pct = Math.round((done / total) * 100);
  const items = ETT_RUBRICS.map((r, index) => ({
    ...r,
    showGroup: index === 0 || r.group !== ETT_RUBRICS[index - 1]?.group,
  }));

  return (
    <nav
      aria-label="Rubriques de la consultation"
      className="bg-card border-border flex max-w-[260px] min-w-[230px] flex-1 flex-col gap-0.5 rounded-2xl border p-3"
    >
      <CompletenessHeader done={done} total={total} pct={pct} />

      {items.map((r) => {
        const href = r.href?.(consultationId) ?? `/consultations/${consultationId}/${r.slug}`;
        const active = currentSlug === r.slug || pathname.includes(`/${r.slug}`);
        return (
          <div key={r.slug}>
            {r.showGroup ? (
              <p className="text-muted-foreground px-2.5 pt-2 pb-1 text-[12px] font-extrabold tracking-wider uppercase">
                {r.group}
              </p>
            ) : null}
            <Link
              href={href}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm font-semibold transition-colors",
                active && "bg-primary-soft text-primary font-extrabold",
                !active && "text-foreground/80 hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold",
                  STATE_STYLES[r.state],
                )}
              >
                {r.state === "fait" ? "✓" : r.state === "incomplet" || r.state === "alerte" ? "!" : r.order}
              </span>
              <span className="min-w-0 truncate">{r.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function CompletenessHeader({ done, total, pct }: { done: number; total: number; pct: number }) {
  return (
    <div className="border-separator mb-2 border-b px-1 pb-3">
      <p className="text-sm font-extrabold">Complétude</p>
      <p className="text-primary mt-0.5 text-sm font-bold">
        {done} / {total} rubriques
      </p>
      <Progress value={pct} className="mt-2 h-2" />
    </div>
  );
}