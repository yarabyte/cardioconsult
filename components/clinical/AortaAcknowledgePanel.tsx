"use client";

import { useState } from "react";
import { evaluateAorticSegment } from "@/lib/clinical/aorta";
import { aorteAscendanteSeries, aorteSinusSeries } from "@/lib/mock/series";
import { TrendChart } from "@/components/charts/TrendChart";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export function AortaAcknowledgePanel({ authorName }: { authorName: string }) {
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);

  const evalAsc = evaluateAorticSegment({
    segment: "ascendante",
    diameterMm: 60,
    priorDiameterMm: 57,
    priorDatedAt: "2025-11-01",
    datedAt: "2026-11-23",
  });

  const chartData = aorteAscendanteSeries.map((p, i) => ({
    date: p.date.slice(0, 7),
    ascendante: p.value,
    sinus: aorteSinusSeries[i]?.value ?? null,
  }));

  const badgeVariant =
    evalAsc.level === "potentiellement_urgent"
      ? "red-flag"
      : evalAsc.level === "discussion_specialisee"
        ? "red-flag"
        : "alerte";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Module Aorte</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Évaluation segment par segment · données fictives
          </p>
        </div>
        <StatusBadge variant={badgeVariant} label="RED FLAG · discussion spécialisée" />
      </div>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aorte ascendante · 60 mm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Croissance estimée{" "}
            <strong className="tabular-nums">
              {evalAsc.growthMmPerYear?.toFixed(1) ?? "—"} mm/an
            </strong>{" "}
            · {evalAsc.thresholdsNote}
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            {evalAsc.score.rationale.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {acknowledgedAt ? (
            <p className="text-success text-sm font-semibold">
              Alerte reconnue le {formatDateTime(acknowledgedAt)} · {authorName}
            </p>
          ) : (
            <Button
              type="button"
              onClick={() => setAcknowledgedAt(new Date().toISOString())}
            >
              Reconnaître l&apos;alerte
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique diamètres</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            ariaLabel="Évolution aorte ascendante et sinus"
            unit="mm"
            data={chartData}
            xKey="date"
            series={[
              { key: "ascendante", label: "Ascendante", color: "#E0313B" },
              { key: "sinus", label: "Sinus", color: "#0B4FB3", strokeDasharray: "4 4" },
            ]}
            thresholds={[
              { y: 50, label: "Seuil 50 mm", color: "#B45309" },
              { y: 55, label: "Seuil 55 mm", color: "#D42A35" },
            ]}
            height={240}
          />
        </CardContent>
      </Card>
    </div>
  );
}