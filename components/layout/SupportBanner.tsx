"use client";

import { useEffect, useState, useTransition } from "react";
import {
  consentSupportSessionAction,
  loadTenantSupportBannerAction,
  revokeSupportSessionAction,
} from "@/server/actions/console";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { SupportSessionRecord } from "@/server/support/types";

export function SupportBanner({
  tenantId,
  isTenantAdmin,
}: {
  tenantId: string;
  isTenantAdmin?: boolean;
}) {
  const [active, setActive] = useState<SupportSessionRecord | null>(null);
  const [pending, setPending] = useState<SupportSessionRecord[]>([]);
  const [busy, start] = useTransition();

  const refresh = () => {
    start(async () => {
      const r = await loadTenantSupportBannerAction(tenantId);
      if (r.ok) {
        setActive(r.session);
        setPending(r.pending);
      }
    });
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  if (!active && pending.length === 0) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      {active ? (
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p>
            <strong>Session support active</strong> — {active.platformActorLabel} (lecture seule)
            jusqu&apos;à {active.endsAt ? formatDateTime(active.endsAt) : "—"}. Motif :{" "}
            {active.reason}
          </p>
          {isTenantAdmin ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  await revokeSupportSessionAction({ sessionId: active.id });
                  refresh();
                })
              }
            >
              Révoquer
            </Button>
          ) : null}
        </div>
      ) : null}

      {pending.map((p) => (
        <div
          key={p.id}
          className="mx-auto mt-2 flex max-w-7xl flex-wrap items-center justify-between gap-3"
        >
          <p>
            Demande support de <strong>{p.platformActorLabel}</strong> — {p.reason}
          </p>
          {isTenantAdmin ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    await consentSupportSessionAction({ sessionId: p.id });
                    refresh();
                  })
                }
              >
                Consentir (60 min, lecture seule)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    await revokeSupportSessionAction({ sessionId: p.id });
                    refresh();
                  })
                }
              >
                Refuser
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
