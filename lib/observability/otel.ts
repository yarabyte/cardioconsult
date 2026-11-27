/**
 * Point d'entrée OpenTelemetry (P19).
 * Collecteur à déployer dans le périmètre HDS — pas de SaaS hors HDS.
 * Désactivé tant que OTEL_EXPORTER_OTLP_ENDPOINT n'est pas défini.
 */

export type OtelStatus = {
  enabled: boolean;
  reason: string;
};

export function getOtelStatus(): OtelStatus {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    return {
      enabled: false,
      reason: "OTEL_EXPORTER_OTLP_ENDPOINT non défini — instrumentation inactive",
    };
  }
  return {
    enabled: true,
    reason: `Export OTLP prévu vers ${endpoint} (collecteur HDS)`,
  };
}

/** No-op bootstrap — brancher @opentelemetry/sdk-node en prod HDS. */
export async function bootstrapOtel(): Promise<OtelStatus> {
  const status = getOtelStatus();
  if (!status.enabled) return status;
  // Intentionnel : pas de dépendance OTel tant que le collecteur n'est pas choisi.
  return status;
}
