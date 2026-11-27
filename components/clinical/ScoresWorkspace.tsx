"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHA2DS2VA_LABELS,
  computeCha2ds2va,
  type Cha2ds2vaCriteria,
} from "@/lib/clinical/cha2ds2va";
import { HASBLED_LABELS, computeHasbled, type HasbledCriteria } from "@/lib/clinical/hasbled";
import { RCRI_LABELS, computeRcri, type RcriCriteria } from "@/lib/clinical/rcri";
import { TIMI_LABELS, computeTimi, emptyTimi, type TimiCriteria } from "@/lib/clinical/timi";
import { computeEphtProbability } from "@/lib/clinical/e-pht";
import {
  externalScoreStub,
  scoreFamiliesForContext,
  type ClinicalContext,
} from "@/lib/clinical/context";
import type { ScoreResult, TriState } from "@/types/domain";
import { formatNumber } from "@/lib/format";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { TriStateCriterion } from "./TriStateCriterion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AutosaveStatus } from "@/components/clinical/PatientContextBar";
import type { PersistedClinicalScore } from "@/server/services/clinical/scores";
import { saveEncounterScoreAction } from "@/server/actions/scores";

const EMPTY_CHA: Cha2ds2vaCriteria = {
  insuffisanceCardiaque: "inconnu",
  hta: "inconnu",
  diabete: "inconnu",
  avc: "inconnu",
  vasculaire: "inconnu",
};

const EMPTY_HAS: HasbledCriteria = {
  hta: "inconnu",
  renal: "inconnu",
  liver: "inconnu",
  stroke: "inconnu",
  bleeding: "inconnu",
  labileInr: "inconnu",
  drugsOrAlcohol: "inconnu",
};

const EMPTY_RCRI: RcriCriteria = {
  highRiskSurgery: "inconnu",
  ischemicHeartDisease: "inconnu",
  heartFailure: "inconnu",
  cerebrovascularDisease: "inconnu",
  insulinDependentDiabetes: "inconnu",
  creatinineAbove177: "inconnu",
};

const EXTERNAL = [
  {
    id: "EuroSCORE II",
    url: "https://www.euroscore.org/index.php?id=17",
  },
  { id: "STS", url: "https://riskcalc.sts.org/" },
  { id: "GRACE", url: "https://www.outcomes-umassmed.org/grace/" },
  { id: "HCM Risk-SCD", url: "https://www.hcmrisk.org/" },
  { id: "SCORE2 / SCORE2-OP", url: "https://www.heartscore.org/" },
] as const;

const TRI: TriState[] = ["oui", "non", "inconnu"];

function asTri(v: unknown, fallback: TriState = "inconnu"): TriState {
  return typeof v === "string" && (TRI as string[]).includes(v) ? (v as TriState) : fallback;
}

function hydrateCha(inputs: Record<string, unknown> | undefined): Cha2ds2vaCriteria {
  if (!inputs) return EMPTY_CHA;
  return {
    insuffisanceCardiaque: asTri(inputs.insuffisanceCardiaque),
    hta: asTri(inputs.hta),
    diabete: asTri(inputs.diabete),
    avc: asTri(inputs.avc),
    vasculaire: asTri(inputs.vasculaire),
  };
}

function hydrateHas(inputs: Record<string, unknown> | undefined): HasbledCriteria {
  if (!inputs) return EMPTY_HAS;
  return {
    hta: asTri(inputs.hta),
    renal: asTri(inputs.renal),
    liver: asTri(inputs.liver),
    stroke: asTri(inputs.stroke),
    bleeding: asTri(inputs.bleeding),
    labileInr: asTri(inputs.labileInr),
    drugsOrAlcohol: asTri(inputs.drugsOrAlcohol),
  };
}

function hydrateRcri(inputs: Record<string, unknown> | undefined): RcriCriteria {
  if (!inputs) return EMPTY_RCRI;
  return {
    highRiskSurgery: asTri(inputs.highRiskSurgery),
    ischemicHeartDisease: asTri(inputs.ischemicHeartDisease),
    heartFailure: asTri(inputs.heartFailure),
    cerebrovascularDisease: asTri(inputs.cerebrovascularDisease),
    insulinDependentDiabetes: asTri(inputs.insulinDependentDiabetes),
    creatinineAbove177: asTri(inputs.creatinineAbove177),
  };
}

function hydrateTimi(inputs: Record<string, unknown> | undefined): TimiCriteria {
  const base = emptyTimi();
  if (!inputs) return base;
  const next = { ...base };
  for (const key of Object.keys(base) as (keyof TimiCriteria)[]) {
    next[key] = asTri(inputs[key], base[key]);
  }
  return next;
}

function scoreByKind(scores: PersistedClinicalScore[], kind: string) {
  return scores.find((s) => s.kind === kind);
}

export function ScoresWorkspace({
  encounterId,
  patientId: _patientId,
  birthDate,
  actDate,
  patientName,
  scoresEnabled,
  readOnly = false,
  initialScores = [],
  onAutosaveChange,
}: {
  encounterId: string;
  patientId: string;
  birthDate: string;
  actDate: string;
  patientName: string;
  scoresEnabled: boolean;
  readOnly?: boolean;
  initialScores?: PersistedClinicalScore[];
  onAutosaveChange?: (status: AutosaveStatus, savedAt?: string) => void;
}) {
  const chaSeed = scoreByKind(initialScores, "cha2ds2va");
  const hasSeed = scoreByKind(initialScores, "hasbled");
  const rcriSeed = scoreByKind(initialScores, "rcri");
  const timiSeed = scoreByKind(initialScores, "timi");
  const ephtSeed = scoreByKind(initialScores, "ePht");
  const ctxSeed = scoreByKind(initialScores, "context");

  const [ctx, setCtx] = useState<ClinicalContext>(() => ({
    hasAfibOrFlutter: Boolean(ctxSeed?.inputs.hasAfibOrFlutter ?? true),
    plannedNoncardiacSurgery: Boolean(ctxSeed?.inputs.plannedNoncardiacSurgery ?? false),
    suspectedAcs: Boolean(ctxSeed?.inputs.suspectedAcs ?? false),
    hasAorticMeasure: Boolean(ctxSeed?.inputs.hasAorticMeasure ?? true),
    echoDone: Boolean(ctxSeed?.inputs.echoDone ?? true),
  }));
  const [cha, setCha] = useState<Cha2ds2vaCriteria>(() => hydrateCha(chaSeed?.inputs));
  const [has, setHas] = useState<HasbledCriteria>(() => hydrateHas(hasSeed?.inputs));
  const [rcri, setRcri] = useState<RcriCriteria>(() => hydrateRcri(rcriSeed?.inputs));
  const [timi, setTimi] = useState<TimiCriteria>(() => hydrateTimi(timiSeed?.inputs));
  const [trVmax, setTrVmax] = useState<number | null>(() => {
    const v = ephtSeed?.inputs.trVmaxMs;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  });
  const [otherPh, setOtherPh] = useState<TriState>(() => asTri(ephtSeed?.inputs.otherSignsOfPh));
  const [externalValues, setExternalValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const ext of EXTERNAL) {
      const row = scoreByKind(initialScores, `external:${ext.id}`);
      const val = row?.inputs.value;
      if (typeof val === "string" && val.trim()) out[ext.id] = val;
    }
    return out;
  });

  const families = useMemo(() => scoreFamiliesForContext(ctx), [ctx]);
  const chaResult = useMemo(
    () => computeCha2ds2va({ birthDate, actDate, criteria: cha }),
    [birthDate, actDate, cha],
  );
  const hasResult = useMemo(
    () => computeHasbled({ birthDate, actDate, criteria: has }),
    [birthDate, actDate, has],
  );
  const rcriResult = useMemo(() => computeRcri(rcri), [rcri]);
  const timiResult = useMemo(() => computeTimi(timi), [timi]);
  const ephtResult = useMemo(
    () => computeEphtProbability({ trVmaxMs: trVmax, otherSignsOfPh: otherPh }),
    [trVmax, otherPh],
  );

  const ready = useRef(false);
  const autosaveRef = useRef(onAutosaveChange);

  useEffect(() => {
    autosaveRef.current = onAutosaveChange;
  }, [onAutosaveChange]);

  useEffect(() => {
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current || readOnly || !scoresEnabled) return;
    autosaveRef.current?.("dirty");
    const t = setTimeout(() => {
      void (async () => {
        autosaveRef.current?.("saving");
        const jobs: Array<Promise<{ ok: boolean }>> = [
          saveEncounterScoreAction({
            encounterId,
            kind: "context",
            inputs: { ...ctx },
            result: {
              status: "calcule",
              value: null,
              rationale: ["Contexte d'applicabilité des scores"],
              missingInputs: [],
              source: { id: "context", version: "1.0" },
            },
          }),
        ];

        if (families.find((f) => f.familyId === "cha2ds2va")?.applicable) {
          jobs.push(
            saveEncounterScoreAction({
              encounterId,
              kind: "cha2ds2va",
              inputs: { ...cha },
              result: chaResult,
            }),
          );
        }
        if (families.find((f) => f.familyId === "hasbled")?.applicable) {
          jobs.push(
            saveEncounterScoreAction({
              encounterId,
              kind: "hasbled",
              inputs: { ...has },
              result: hasResult,
            }),
          );
        }
        if (families.find((f) => f.familyId === "rcri")?.applicable) {
          jobs.push(
            saveEncounterScoreAction({
              encounterId,
              kind: "rcri",
              inputs: { ...rcri },
              result: rcriResult,
            }),
          );
        }
        if (families.find((f) => f.familyId === "timi")?.applicable) {
          jobs.push(
            saveEncounterScoreAction({
              encounterId,
              kind: "timi",
              inputs: { ...timi },
              result: timiResult,
            }),
          );
        }
        if (families.find((f) => f.familyId === "ePht")?.applicable) {
          jobs.push(
            saveEncounterScoreAction({
              encounterId,
              kind: "ePht",
              inputs: { trVmaxMs: trVmax, otherSignsOfPh: otherPh },
              result: ephtResult,
            }),
          );
        }
        for (const ext of EXTERNAL) {
          const value = externalValues[ext.id]?.trim();
          if (!value) continue;
          const stub = externalScoreStub(ext.id, ext.url);
          jobs.push(
            saveEncounterScoreAction({
              encounterId,
              kind: `external:${ext.id}`,
              inputs: { value, url: ext.url },
              result: {
                ...stub,
                status: "saisi_externe",
                value: Number.isFinite(Number(value.replace(",", ".")))
                  ? Number(value.replace(",", "."))
                  : null,
                rationale: [...stub.rationale, `Valeur saisie : ${value}`],
              },
            }),
          );
        }

        const results = await Promise.all(jobs);
        if (results.some((r) => !r.ok)) {
          autosaveRef.current?.("error");
          return;
        }
        autosaveRef.current?.("saved", new Date().toISOString());
      })();
    }, 800);
    return () => clearTimeout(t);
  }, [
    encounterId,
    readOnly,
    scoresEnabled,
    ctx,
    cha,
    has,
    rcri,
    timi,
    trVmax,
    otherPh,
    externalValues,
    families,
    chaResult,
    hasResult,
    rcriResult,
    timiResult,
    ephtResult,
  ]);

  if (!scoresEnabled) {
    return (
      <p className="text-muted-foreground text-sm">
        Module scores désactivé (feature flag <code>clinical.scores</code>).
      </p>
    );
  }

  const persistedKinds = initialScores.map((s) => s.kind);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Scores contextuels</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {patientName} · acte du {actDate.split("-").reverse().join("/")} · patient fictif
        </p>
        {persistedKinds.length > 0 ? (
          <p className="text-muted-foreground mt-1 text-xs">
            Scores enregistrés : {persistedKinds.filter((k) => k !== "context").join(", ")}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">
            Enregistrement automatique après chaque modification.
          </p>
        )}
        {readOnly ? (
          <p className="text-warning mt-1 text-xs font-semibold">
            Consultation clôturée — scores en lecture seule.
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contexte clinique (applicabilité)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["hasAfibOrFlutter", "FA / flutter"],
              ["plannedNoncardiacSurgery", "Chirurgie non cardiaque"],
              ["suspectedAcs", "SCA suspecté"],
              ["hasAorticMeasure", "Mesure aorte"],
              ["echoDone", "ETT faite"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={ctx[key]}
                onChange={(e) => setCtx((c) => ({ ...c, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </CardContent>
      </Card>

      <ul className="text-muted-foreground space-y-1 text-xs">
        {families.map((f) => (
          <li key={f.familyId}>
            <strong>{f.familyId}</strong> : {f.applicable ? "applicable" : "non applicable"} —{" "}
            {f.reason}
          </li>
        ))}
      </ul>

      {families.find((f) => f.familyId === "cha2ds2va")?.applicable ? (
        <ScoreCard title="CHA₂DS₂-VA" result={chaResult}>
          {(Object.keys(cha) as (keyof Cha2ds2vaCriteria)[]).map((key) => (
            <TriStateCriterion
              key={key}
              id={key}
              label={CHA2DS2VA_LABELS[key].label}
              value={cha[key]}
              disabled={readOnly}
              onChange={(v) => setCha((c) => ({ ...c, [key]: v }))}
            />
          ))}
        </ScoreCard>
      ) : null}

      {families.find((f) => f.familyId === "hasbled")?.applicable ? (
        <ScoreCard title="HAS-BLED" result={hasResult}>
          {(Object.keys(has) as (keyof HasbledCriteria)[]).map((key) => (
            <TriStateCriterion
              key={key}
              id={`has-${key}`}
              label={HASBLED_LABELS[key]}
              value={has[key]}
              disabled={readOnly}
              onChange={(v) => setHas((c) => ({ ...c, [key]: v }))}
            />
          ))}
        </ScoreCard>
      ) : null}

      {families.find((f) => f.familyId === "rcri")?.applicable ? (
        <ScoreCard title="RCRI" result={rcriResult}>
          {(Object.keys(rcri) as (keyof RcriCriteria)[]).map((key) => (
            <TriStateCriterion
              key={key}
              id={`rcri-${key}`}
              label={RCRI_LABELS[key]}
              value={rcri[key]}
              disabled={readOnly}
              onChange={(v) => setRcri((c) => ({ ...c, [key]: v }))}
            />
          ))}
        </ScoreCard>
      ) : null}

      {families.find((f) => f.familyId === "timi")?.applicable ? (
        <ScoreCard title="TIMI (UA/NSTEMI)" result={timiResult}>
          {(Object.keys(timi) as (keyof TimiCriteria)[]).map((key) => (
            <TriStateCriterion
              key={key}
              id={`timi-${key}`}
              label={TIMI_LABELS[key]}
              value={timi[key]}
              disabled={readOnly}
              onChange={(v) => setTimi((c) => ({ ...c, [key]: v }))}
            />
          ))}
        </ScoreCard>
      ) : null}

      {families.find((f) => f.familyId === "ePht")?.applicable ? (
        <ScoreCard title="ePHT (probabilité documentaire)" result={ephtResult}>
          <div className="space-y-1">
            <Label>Vmax IT (m/s)</Label>
            <Input
              type="number"
              inputMode="decimal"
              disabled={readOnly}
              value={trVmax ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                setTrVmax(raw === "" ? null : Number(raw));
              }}
            />
          </div>
          <TriStateCriterion
            id="other-ph"
            label="Autres signes d'HTP"
            value={otherPh}
            disabled={readOnly}
            onChange={setOtherPh}
          />
        </ScoreCard>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scores officiels — saisie externe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {EXTERNAL.map((ext) => {
            const stub = externalScoreStub(ext.id, ext.url);
            return (
              <div key={ext.id} className="border-border space-y-2 rounded-xl border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{ext.id}</p>
                  <StatusBadge variant="non-renseigne" label="saisi_externe" />
                  <a
                    href={ext.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-xs underline"
                  >
                    Calculateur
                  </a>
                </div>
                <p className="text-muted-foreground text-xs">{stub.rationale.join(" ")}</p>
                <Input
                  placeholder="Valeur saisie manuellement"
                  disabled={readOnly}
                  value={externalValues[ext.id] ?? ""}
                  onChange={(e) => setExternalValues((m) => ({ ...m, [ext.id]: e.target.value }))}
                />
                {externalValues[ext.id] ? (
                  <p className="text-sm">
                    Valeur saisie : <strong>{externalValues[ext.id]}</strong> (non recalculée)
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreCard({
  title,
  result,
  children,
}: {
  title: string;
  result: ScoreResult;
  children: React.ReactNode;
}) {
  const variant =
    result.status === "calcule"
      ? "calcule"
      : result.status === "incomplet"
        ? "incomplet"
        : "non-renseigne";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          <StatusBadge variant={variant} />
          <p className="text-3xl font-extrabold tabular-nums">
            {result.status === "calcule" && result.value != null
              ? formatNumber(Number(result.value))
              : result.range
                ? `${formatNumber(result.range.min)}–${formatNumber(result.range.max)}`
                : "—"}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
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
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
