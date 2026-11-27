import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { getClinicalFlags } from "@/server/services/clinical/flags";
import { DEFAULT_AORTA_THRESHOLDS } from "@/lib/clinical/aorta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Règles cliniques" };

export default async function ReglesCliniquesPage() {
  const ctx = await requireTenantPage({ permission: "settings.manage" });
  const flags = await getClinicalFlags(ctx.tenant.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Règles cliniques</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Seuils versionnés · à valider cliniquement · activation flags réservée super-admin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature flags (lecture)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Object.entries(flags).map(([k, v]) => (
            <p key={k}>
              <code>{k}</code> : {v ? "activé" : "désactivé"}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seuils aorte (AO-ASC-01 v0.1)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Alerte de mesure : {DEFAULT_AORTA_THRESHOLDS.alertMm} mm</p>
          <p>Discussion spécialisée : {DEFAULT_AORTA_THRESHOLDS.discussionMm} mm</p>
          <p>Potentiellement urgent : {DEFAULT_AORTA_THRESHOLDS.urgentMm} mm</p>
          <p>Croissance : {DEFAULT_AORTA_THRESHOLDS.growthMmPerYear} mm/an</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Édition versionnée + audit prévus (store tenant). Valeurs actuelles = défauts
            documentaires.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
