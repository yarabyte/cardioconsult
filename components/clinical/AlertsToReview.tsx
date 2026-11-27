"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { acknowledgeAlertAction, listOpenAlertsAction } from "@/server/actions/clinical-alerts";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import type { ClinicalAlert } from "@/types/domain";

export function AlertsToReview() {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [pending, start] = useTransition();

  const reload = () => {
    start(async () => {
      const r = await listOpenAlertsAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDisabled(Boolean(r.disabled));
      setAlerts(r.alerts);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  if (disabled) {
    return (
      <section className="surface-card">
        <div className="border-separator border-b px-5 py-4">
          <h2 className="text-base font-extrabold">Alertes à revoir</h2>
        </div>
        <p className="text-muted-foreground px-5 py-4 text-sm">
          Alertes cliniques désactivées (<code>clinical.alerts</code>).
        </p>
      </section>
    );
  }

  return (
    <section className="surface-card">
      <div className="border-separator flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="text-base font-extrabold">Alertes à revoir</h2>
        {alerts.length > 0 ? (
          <span className="bg-destructive text-destructive-foreground inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums">
            {alerts.length}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        {alerts.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-sm">Aucune alerte ouverte.</p>
        ) : (
          alerts.map((a) => {
            const urgent =
              a.level === "potentiellement_urgent" || a.level === "discussion_specialisee";
            return (
              <div
                key={a.id}
                className={`flex gap-3 rounded-xl px-3 py-3 text-sm ${urgent ? "bg-destructive/8" : ""}`}
              >
                <span
                  className={`mt-0.5 w-2 shrink-0 rounded-sm ${urgent ? "bg-destructive" : "bg-amber-600"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge variant={urgent ? "red-flag" : "alerte"} />
                    <strong className={urgent ? "text-destructive" : undefined}>{a.title}</strong>
                  </div>
                  <p className="text-muted-foreground text-[13px]">{a.message}</p>
                  <p className="text-muted-foreground text-xs">
                    Règle {a.ruleId} · v{a.ruleVersion}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      start(async () => {
                        const r = await acknowledgeAlertAction({ alertId: a.id });
                        if (!r.ok) {
                          toast.error(r.error);
                          return;
                        }
                        toast.success("Alerte reconnue");
                        reload();
                      });
                    }}
                  >
                    Reconnaître
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <p className="text-muted-foreground border-separator border-t px-5 py-3 text-xs">
        Les alertes sont des aides à la documentation : elles ne valent pas décision médicale.
      </p>
    </section>
  );
}
