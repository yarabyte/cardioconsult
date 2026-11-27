"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETT_RUBRICS, rubricCompleteness, type RubricState } from "@/lib/consultation/rubrics";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const STATE_STYLES: Record<RubricState, string> = {
  fait: "bg-success-soft text-success",
  courant: "bg-primary text-white",
  incomplet: "bg-warning-soft text-warning",
  alerte: "bg-destructive/10 text-destructive",
  vide: "border-border text-muted-foreground border",
};

const STATE_ARIA: Record<RubricState, string> = {
  fait: "fait",
  courant: "en cours",
  incomplet: "incomplet",
  alerte: "alerte",
  vide: "vide",
};

function StepperNav({
  consultationId,
  currentSlug,
  states,
  done,
  total,
  onBeforeNavigate,
  className,
}: {
  consultationId: string;
  currentSlug: string;
  states?: Record<string, RubricState>;
  done: number;
  total: number;
  onBeforeNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const pct = Math.round((done / total) * 100);
  const items = ETT_RUBRICS.map((r, index) => ({
    ...r,
    state: (states?.[r.slug] ?? r.state) as RubricState,
    showGroup: index === 0 || r.group !== ETT_RUBRICS[index - 1]?.group,
  }));

  return (
    <nav
      aria-label="Rubriques de la consultation"
      className={cn(
        "surface-card flex max-w-[260px] min-w-[230px] flex-1 flex-col gap-0.5 p-3",
        className,
      )}
    >
      <div className="border-separator mb-2 border-b px-1 pb-3">
        <p className="text-sm font-extrabold">Complétude</p>
        <p className="text-primary mt-0.5 text-sm font-bold">
          {done} / {total} rubriques
        </p>
        <Progress value={pct} className="mt-2 h-2.5" />
      </div>

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
              onClick={onBeforeNavigate}
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
                aria-label={`État : ${STATE_ARIA[r.state]}`}
              >
                {r.state === "fait"
                  ? "✓"
                  : r.state === "incomplet" || r.state === "alerte"
                    ? "!"
                    : r.order}
              </span>
              <span className="min-w-0 truncate">{r.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function RubricStepper({
  consultationId,
  currentSlug,
  states,
  done: doneProp,
  total: totalProp,
  onBeforeNavigate,
}: {
  consultationId: string;
  currentSlug: string;
  states?: Record<string, RubricState>;
  done?: number;
  total?: number;
  onBeforeNavigate?: () => void;
}) {
  const base = rubricCompleteness(
    ETT_RUBRICS.map((r) => ({
      ...r,
      state: states?.[r.slug] ?? r.state,
    })),
  );
  const done = doneProp ?? base.done;
  const total = totalProp ?? base.total;

  return (
    <>
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button type="button" variant="outline" className="w-full justify-start gap-2" />
            }
          >
            <Menu className="size-4" />
            Rubriques · {done}/{total}
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,300px)] overflow-y-auto p-3">
            <SheetHeader className="sr-only">
              <SheetTitle>Rubriques de la consultation</SheetTitle>
            </SheetHeader>
            <StepperNav
              consultationId={consultationId}
              currentSlug={currentSlug}
              states={states}
              done={done}
              total={total}
              onBeforeNavigate={onBeforeNavigate}
              className="max-w-none min-w-0 border-0 p-0"
            />
          </SheetContent>
        </Sheet>
      </div>
      <div className="hidden lg:block">
        <StepperNav
          consultationId={consultationId}
          currentSlug={currentSlug}
          states={states}
          done={done}
          total={total}
          onBeforeNavigate={onBeforeNavigate}
        />
      </div>
    </>
  );
}
