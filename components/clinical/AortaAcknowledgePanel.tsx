"use client";

import { useMemo, useState } from "react";
import { evaluateAortaDraft, type AortaDraft } from "@/lib/exams/aorta-measure";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { AORTA_SEGMENTS } from "@/lib/exams/aorta-measure";

/**
 * Panneau d'alerte aorte basé sur le brouillon de consultation.
 * Aucune donnée fictive : sans mesure saisie → état vide.
 */
export function AortaAcknowledgePanel({
  authorName,
  aorta,
}: {
  authorName: string;
  aorta: AortaDraft;
}) {
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);

  const evals = useMemo(() => evaluateAortaDraft(aorta), [aorta]);
  const flagged = evals.filter(
    (e) =>
      e.level === "alerte_mesure" ||
      e.level === "discussion_specialisee" ||
      e.level === "potentiellement_urgent",
  );
  const primary = flagged[0] ?? null;
  const segmentLabel =
    AORTA_SEGMENTS.find((s) => s.segment === primary?.segment)?.label ?? primary?.segment;

  const badgeVariant =
    primary?.level === "potentiellement_urgent" || primary?.level === "discussion_specialisee"
      ? "red-flag"
      : primary?.level === "alerte_mesure"
        ? "alerte"
        : "non-renseigne";

  if (!primary) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Module Aorte</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Aucune alerte de mesure pour cette consultation — saisissez les diamètres dans la
            rubrique Aorte.
          </p>
        </div>
        <Card>
          <CardContent className="text-muted-foreground py-8 text-sm">
            Pas de donnée aortique renseignée. Les seuils et courbes n&apos;apparaissent
            qu&apos;après saisie réelle (aucune valeur préremplie).
          </CardContent>
        </Card>
      </div>
    );
  }

  const diameter = aorta.segments.find((s) => s.segment === primary.segment)?.diameterMm ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Module Aorte</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Évaluation segment par segment · données de la consultation
          </p>
        </div>
        <StatusBadge
          variant={badgeVariant}
          label={
            primary.level === "potentiellement_urgent" || primary.level === "discussion_specialisee"
              ? "RED FLAG · discussion spécialisée"
              : "Alerte de mesure"
          }
        />
      </div>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {segmentLabel}
            {diameter != null ? ` · ${diameter} mm` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Croissance estimée{" "}
            <strong className="tabular-nums">
              {primary.growthMmPerYear != null
                ? `${primary.growthMmPerYear.toFixed(1)} mm/an`
                : "non calculable (mesure antérieure manquante)"}
            </strong>{" "}
            · {primary.thresholdsNote}
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            {primary.score.rationale.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {acknowledgedAt ? (
            <p className="text-success text-sm font-semibold">
              Alerte reconnue le {formatDateTime(acknowledgedAt)} · {authorName}
            </p>
          ) : (
            <Button type="button" onClick={() => setAcknowledgedAt(new Date().toISOString())}>
              Reconnaître l&apos;alerte
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
