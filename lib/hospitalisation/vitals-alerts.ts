export type VitalsThresholds = {
  tasMin: number;
  tasMax: number;
  tadMin: number;
  tadMax: number;
  fcMin: number;
  fcMax: number;
  spo2Min: number;
  tempMin: number;
  tempMax: number;
};

export const DEFAULT_VITALS_THRESHOLDS: VitalsThresholds = {
  tasMin: 90,
  tasMax: 180,
  tadMin: 50,
  tadMax: 110,
  fcMin: 40,
  fcMax: 140,
  spo2Min: 90,
  tempMin: 35,
  tempMax: 38.5,
};

export type VitalsInput = {
  tasMmHg: number | null;
  tadMmHg: number | null;
  fcBpm: number | null;
  spo2Pct: number | null;
  temperatureC: number | null;
  frPerMin: number | null;
  weightKg: number | null;
  eva: number | null;
};

/** Alertes de borne — aide à la surveillance, pas une décision médicale. */
export function evaluateVitalsAlerts(
  input: VitalsInput,
  thresholds: VitalsThresholds = DEFAULT_VITALS_THRESHOLDS,
): string[] {
  const alerts: string[] = [];
  if (input.tasMmHg != null && input.tasMmHg < thresholds.tasMin) {
    alerts.push(`TAS ${input.tasMmHg} < ${thresholds.tasMin} mmHg — alerte de mesure`);
  }
  if (input.tasMmHg != null && input.tasMmHg > thresholds.tasMax) {
    alerts.push(`TAS ${input.tasMmHg} > ${thresholds.tasMax} mmHg — alerte de mesure`);
  }
  if (input.tadMmHg != null && input.tadMmHg < thresholds.tadMin) {
    alerts.push(`TAD ${input.tadMmHg} < ${thresholds.tadMin} mmHg — alerte de mesure`);
  }
  if (input.tadMmHg != null && input.tadMmHg > thresholds.tadMax) {
    alerts.push(`TAD ${input.tadMmHg} > ${thresholds.tadMax} mmHg — alerte de mesure`);
  }
  if (input.fcBpm != null && (input.fcBpm < thresholds.fcMin || input.fcBpm > thresholds.fcMax)) {
    alerts.push(`FC ${input.fcBpm} hors bornes — alerte de mesure`);
  }
  if (input.spo2Pct != null && input.spo2Pct < thresholds.spo2Min) {
    alerts.push(`SpO₂ ${input.spo2Pct} % < ${thresholds.spo2Min} — alerte de mesure`);
  }
  if (
    input.temperatureC != null &&
    (input.temperatureC < thresholds.tempMin || input.temperatureC > thresholds.tempMax)
  ) {
    alerts.push(`T° ${input.temperatureC} °C hors bornes — alerte de mesure`);
  }
  return alerts;
}
