"use client";

import Link from "next/link";
import { ETT_RUBRICS } from "@/lib/consultation/rubrics";
import { Button } from "@/components/ui/button";

function hrefFor(consultationId: string, slug: string) {
  const r = ETT_RUBRICS.find((x) => x.slug === slug);
  return r?.href?.(consultationId) ?? `/consultations/${consultationId}/${slug}`;
}

export function RubricNav({
  consultationId,
  currentSlug,
  onBeforeNavigate,
}: {
  consultationId: string;
  currentSlug: string;
  onBeforeNavigate?: () => void;
}) {
  const idx = ETT_RUBRICS.findIndex((r) => r.slug === currentSlug);
  const prev = idx > 0 ? ETT_RUBRICS[idx - 1] : null;
  const next = idx >= 0 && idx < ETT_RUBRICS.length - 1 ? ETT_RUBRICS[idx + 1] : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
      {prev ? (
        <Button
          variant="outline"
          render={<Link href={hrefFor(consultationId, prev.slug)} onClick={onBeforeNavigate} />}
        >
          ← {prev.label}
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button
          render={<Link href={hrefFor(consultationId, next.slug)} onClick={onBeforeNavigate} />}
        >
          {next.label} →
        </Button>
      ) : null}
    </div>
  );
}
