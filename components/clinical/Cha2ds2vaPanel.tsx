"use client";

import { useMemo, useState } from "react";
import {
  computeCha2ds2va,
  type Cha2ds2vaCriteria,
} from "@/lib/clinical/cha2ds2va";
import { formatNumber } from "@/lib/format";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { TriStateCriterion } from "./TriStateCriterion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT: Cha2ds2vaCriteria = {
  insuffisanceCardiaque: "non",
  hta: "oui",
  diabete: "inconnu",
  avc: "non",
  vasculaire: "non",
};

export function Cha2ds2vaPanel({
  birthDate,
  actDate,
  patientName,
}: {
  birthDate: string;
  actDate: string;
  patientName: string;
}) {
  const [criteria, setCriteria] = useState<Cha2ds2vaCriteria>(DEFAULT);

  const result = useMemo(
    () => computeCha2ds2va({ birthDate, actDate, criteria }),
    [birthDate, actDate, criteria],
  );

  const variant =
    result.status === "calcule"
      ? "calcule"
      : result.status === "incomplet"
        ? "incomplet"
        : "non-renseigne";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Scores contextuels</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {patientName} · acte du {actDate.split("-").reverse().join("/")} · patient fictif
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">CHA₂DS₂-VA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScoreDisplay result={result} variant={variant} />

          <div className="grid gap-3 md:grid-cols-2">
            {(Object.keys(criteria) as (keyof Cha2ds2vaCriteria)[]).map((key) => (
              <TriStateCriterion
                key={key}
                id={key}
                label={CRITERION_LABELS[key]}
                value={criteria[key]}
                onChange={(v) => setCriteria((c) => ({ ...c, [key]: v }))}
              />
            ))}
          </div>

          <div className="bg-muted/40 rounded-xl p-4 text-sm">
            <p className="font-bold">Pourquoi ce résultat ?</p>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
              {result.rationale.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {result.missingInputs.length > 0 ? (
              <p className="text-warning mt-3 text-sm font-semibold">
                Données manquantes : {result.missingInputs.join(", ")}
                {result.range
                  ? ` · intervalle ${formatNumber(result.range.min)} à ${formatNumber(result.range.max)}`
                  : null}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const CRITERION_LABELS: Record<keyof Cha2ds2vaCriteria, string> = {
  insuffisanceCardiaque: "Insuffisance cardiaque",
  hta: "Hypertension artérielle",
  diabete: "Diabète",
  avc: "AVC / AIT / embolie",
  vasculaire: "Maladie vasculaire",
};

function ScoreDisplay({
  result,
  variant,
}: {
  result: ReturnType<typeof computeCha2ds2va>;
  variant: "calcule" | "incomplet" | "non-renseigne";
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge variant={variant} />
      <p className="text-3xl font-extrabold tabular-nums">
        {result.status === "calcule" && result.value != null
          ? formatNumber(result.value)
          : result.range
            ? `${formatNumber(result.range.min)}–${formatNumber(result.range.max)}`
            : "—"}
      </p>
      <span className="text-muted-foreground text-sm">points</span>
    </div>
  );
}