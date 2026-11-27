"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  declareBreachAction,
  loadRgpdSettingsAction,
  requestDataExportAction,
  requestTenantWipeAction,
  savePatientNoticeAction,
  setRetentionAction,
} from "@/server/actions/rgpd";
import { formatDateTime } from "@/lib/format";
import type {
  BreachIncident,
  DueDossier,
  PatientNotice,
  RetentionPolicy,
} from "@/server/rgpd/types";

export function RgpdSettingsClient() {
  const [retention, setRetention] = useState<RetentionPolicy | null>(null);
  const [years, setYears] = useState("20");
  const [due, setDue] = useState<DueDossier[]>([]);
  const [notice, setNotice] = useState<PatientNotice | null>(null);
  const [noticeBody, setNoticeBody] = useState("");
  const [breaches, setBreaches] = useState<BreachIncident[]>([]);
  const [breachDesc, setBreachDesc] = useState("");
  const [cnilUrl, setCnilUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [exportLink, setExportLink] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refresh = () => {
    start(async () => {
      const r = await loadRgpdSettingsAction();
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setRetention(r.retention);
      setYears(String(r.retention.retentionYears));
      setDue(r.due);
      setNotice(r.notice);
      setNoticeBody(r.notice.body);
      setBreaches(r.breaches);
      setCnilUrl(r.cnilUrl);
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex min-w-0 flex-[999] flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Données et RGPD</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Conservation, exports, notice patient, violations — décisions du responsable de traitement
        </p>
      </div>

      {message ? (
        <p role="status" className="text-primary text-sm font-semibold">
          {message}
        </p>
      ) : null}

      <section className="border-border bg-card space-y-3 rounded-2xl border p-4">
        <h2 className="text-base font-extrabold">Politique de conservation</h2>
        <p className="text-muted-foreground text-xs">
          Aucune purge automatique. Les dossiers à échéance sont signalés ; la décision
          d&apos;archivage / destruction appartient au responsable du traitement.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="years">Durée (années)</Label>
            <Input
              id="years"
              className="w-28"
              inputMode="numeric"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await setRetentionAction({ retentionYears: Number(years) });
                setMessage(r.ok ? "Politique enregistrée" : r.error);
                refresh();
              })
            }
          >
            Enregistrer
          </Button>
        </div>
        {retention ? (
          <p className="text-muted-foreground text-xs">
            Dernière mise à jour : {formatDateTime(retention.updatedAt)}
          </p>
        ) : null}

        <div className="border-border mt-2 rounded-xl border p-3">
          <h3 className="text-sm font-bold">Dossiers à échéance (alerte)</h3>
          {due.length === 0 ? (
            <p className="text-muted-foreground mt-1 text-sm">Aucun dossier signalé.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {due.map((d) => (
                <li key={d.patientId}>
                  {d.label} · échéance {formatDateTime(d.dueAt)} —{" "}
                  <strong>aucune suppression automatique</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-border bg-card space-y-3 rounded-2xl border p-4">
        <h2 className="text-base font-extrabold">Exports</h2>
        <p className="text-muted-foreground text-xs">
          Archive chiffrée, step-up, lien 24 h, audité, purge après expiration. Format :{" "}
          <code className="text-xs">docs/donnees/format-export-tenant.md</code>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await requestDataExportAction({ scope: "tenant" });
                if (!r.ok) {
                  setMessage(r.error);
                  return;
                }
                setExportLink(r.downloadPath);
                setMessage(
                  `Export tenant prêt — expire le ${formatDateTime(r.expiresAt)} · sha256 ${r.contentSha256.slice(0, 12)}…`,
                );
              })
            }
          >
            Export complet du cabinet
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await requestDataExportAction({
                  scope: "patient",
                  patientId: "CC-000184",
                });
                if (!r.ok) {
                  setMessage(r.error);
                  return;
                }
                setExportLink(r.downloadPath);
                setMessage(
                  `Export dossier (portabilité) prêt — expire le ${formatDateTime(r.expiresAt)}`,
                );
              })
            }
          >
            Export dossier patient (démo Jeanne)
          </Button>
        </div>
        {exportLink ? (
          <p className="text-sm">
            Lien :{" "}
            <a className="text-primary font-semibold underline" href={exportLink}>
              {exportLink}
            </a>
          </p>
        ) : null}
      </section>

      <section className="border-border bg-card space-y-3 rounded-2xl border p-4">
        <h2 className="text-base font-extrabold">Notice d&apos;information patient</h2>
        <div className="space-y-1">
          <Label htmlFor="rgpd-notice-body">Texte de la notice</Label>
          <Textarea
            id="rgpd-notice-body"
            rows={10}
            value={noticeBody}
            onChange={(e) => setNoticeBody(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await savePatientNoticeAction({ body: noticeBody });
                setMessage(r.ok ? "Notice enregistrée" : r.error);
                if (r.ok) setNotice(r.notice);
              })
            }
          >
            Enregistrer
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
        {notice ? (
          <p className="text-muted-foreground text-xs">MAJ {formatDateTime(notice.updatedAt)}</p>
        ) : null}
      </section>

      <section className="border-border bg-card space-y-3 rounded-2xl border p-4">
        <h2 className="text-base font-extrabold">Registre des violations</h2>
        <p className="text-muted-foreground text-xs">
          La notification CNIL n&apos;est jamais automatisée. Procédure :{" "}
          <a
            href={cnilUrl || "#"}
            className="text-primary font-semibold underline"
            target="_blank"
            rel="noreferrer"
          >
            cnil.fr — notifier une violation
          </a>
        </p>
        <Label htmlFor="breach">Description</Label>
        <Textarea
          id="breach"
          rows={3}
          value={breachDesc}
          onChange={(e) => setBreachDesc(e.target.value)}
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await declareBreachAction({
                description: breachDesc,
                actions: "Mesures conservatoires en cours",
                notifyCnilIntent: false,
              });
              setMessage(r.ok ? "Incident déclaré (à qualifier)" : r.error);
              setBreachDesc("");
              refresh();
            })
          }
        >
          Déclarer un incident
        </Button>
        <ul className="space-y-2 text-sm">
          {breaches.map((b) => (
            <li key={b.id} className="border-border rounded-lg border p-2">
              <p className="font-semibold">
                {b.qualification} · {formatDateTime(b.declaredAt)}
              </p>
              <p className="text-muted-foreground">{b.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-border bg-card border-destructive/30 space-y-3 rounded-2xl border p-4">
        <h2 className="text-destructive text-base font-extrabold">
          Suppression définitive du cabinet
        </h2>
        <p className="text-muted-foreground text-xs">
          Double validation (admin cabinet + plateforme), délai de grâce, crypto-effacement DEK,
          certificat. Irréversible.
        </p>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await requestTenantWipeAction();
              setMessage(
                r.ok
                  ? `Demande ${r.wipe.id} — validation plateforme requise (statut ${r.wipe.status})`
                  : r.error,
              );
            })
          }
        >
          Demander la suppression (1/2)
        </Button>
      </section>
    </div>
  );
}
