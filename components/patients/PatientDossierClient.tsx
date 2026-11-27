"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Patient } from "@/types/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateLong, formatDateTime, patientDisplayName, ageAt } from "@/lib/format";
import { AllergyBanner } from "./AllergyBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { archivePatientAction, restorePatientAction } from "@/server/actions/patients";
import { startConsultationAction } from "@/server/actions/consultation";
import { loadLongitudinalAction, loadPatientAccessLogAction } from "@/server/actions/dossier";
import type { SeriesPeriod } from "@/lib/dossier/series";
import { PatientDossierTabs } from "./PatientDossierTabs";

type DossierPayload = Awaited<ReturnType<typeof loadLongitudinalAction>>;
type DossierOk = Extract<DossierPayload, { ok: true }>["dossier"];

export type OpenEncounterProp = {
  id: string;
  datedAt: string;
  href: string;
};

export function PatientDossierClient({
  patient,
  openEncounter = null,
  latestEncounter = null,
}: {
  patient: Patient;
  openEncounter?: OpenEncounterProp | null;
  /** Dernière consultation (ouverte ou clôturée) — liens ordonnance / CR. */
  latestEncounter?: OpenEncounterProp | null;
}) {
  const [period, setPeriod] = useState<SeriesPeriod>("1a");
  const [dossier, setDossier] = useState<DossierOk | null>(null);
  const [accessLog, setAccessLog] = useState<
    {
      id: string;
      at: string;
      action: string;
      actorId: string | null | undefined;
      actorRole?: string | null;
      actorLabel?: string | null;
    }[]
  >([]);
  const [pending, start] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const router = useRouter();

  useEffect(() => {
    start(async () => {
      const r = await loadLongitudinalAction({ patientId: patient.id, period });
      if (r.ok) setDossier(r.dossier);
    });
  }, [patient.id, period]);

  useEffect(() => {
    void loadPatientAccessLogAction(patient.id).then((r) => {
      if (r.ok) setAccessLog(r.events);
    });
  }, [patient.id]);

  const today = new Date().toISOString().slice(0, 10);
  const age = ageAt(patient.birthDate, today);
  const dossierLabel =
    patient.dossierNumber && patient.dossierNumber.length > 0
      ? patient.dossierNumber
      : `…${patient.id.slice(-8)}`;
  /** Accès ordonnance / CR même après clôture de la consultation. */
  const docsEncounter = openEncounter ?? latestEncounter;

  const startOrResume = (resumedToast: boolean) =>
    start(async () => {
      const r = await startConsultationAction(patient.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        resumedToast && r.resumed ? "Reprise de la consultation" : "Consultation démarrée",
      );
      router.push(r.href);
    });

  return (
    <div className="flex flex-col gap-3">
      <AllergyBanner allergies={patient.allergies} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            {patientDisplayName(patient.firstName, patient.lastName)}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {age} ans · {patient.sex} · né(e) le {formatDateLong(patient.birthDate)} · dossier{" "}
            {dossierLabel}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              INS {patient.insStatus === "qualifiee" ? "qualifiée" : "non qualifiée"}
            </Badge>
            {patient.archivedAt ? <Badge variant="destructive">Archivé</Badge> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            Période
          </span>
          <Select value={period} onValueChange={(v) => setPeriod(v as SeriesPeriod)}>
            <SelectTrigger className="h-8 w-[148px]" aria-label="Période du dossier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6 mois</SelectItem>
              <SelectItem value="1a">1 an</SelectItem>
              <SelectItem value="all">Tout l’historique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2">
        {!patient.archivedAt && docsEncounter ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              render={<Link href={`/consultations/${docsEncounter.id}/ordonnance`} />}
            >
              Ordonnance
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              render={<Link href={`/consultations/${docsEncounter.id}/compte-rendu`} />}
            >
              Compte rendu
            </Button>
            <span className="text-muted-foreground px-1 text-[11px] tabular-nums">
              {openEncounter
                ? `Ouverte · ${formatDateTime(openEncounter.datedAt)}`
                : `Dernière · ${formatDateTime(docsEncounter.datedAt)}`}
            </span>
          </div>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {!patient.archivedAt && openEncounter ? (
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={pending}
              onClick={() => startOrResume(true)}
            >
              Reprendre
            </Button>
          ) : null}
          {!patient.archivedAt && !openEncounter ? (
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={pending}
              onClick={() => startOrResume(false)}
            >
              Démarrer une consultation
            </Button>
          ) : null}
          {patient.archivedAt ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await restorePatientAction(patient.id);
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success("Dossier restauré");
                    router.refresh();
                  }
                })
              }
            >
              Restaurer
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-8"
              disabled={pending}
              onClick={() => {
                setArchiveReason("");
                setArchiveOpen(true);
              }}
            >
              Archiver
            </Button>
          )}
        </div>
      </div>

      <PatientDossierTabs
        patient={patient}
        dossier={dossier}
        accessLog={accessLog}
        period={period}
        loading={pending}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver le dossier ?</DialogTitle>
            <DialogDescription>
              Archivage logique uniquement — aucune suppression physique. Indiquez un motif (3
              caractères minimum).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="archive-reason">Motif</Label>
            <Input
              id="archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={pending || archiveReason.trim().length < 3}
              onClick={() => {
                const reason = archiveReason.trim();
                if (reason.length < 3) {
                  toast.error("Motif trop court");
                  return;
                }
                setArchiveOpen(false);
                start(async () => {
                  const r = await archivePatientAction({
                    patientId: patient.id,
                    reason,
                  });
                  if (!r.ok) toast.error(typeof r.error === "string" ? r.error : "Échec");
                  else {
                    toast.success("Dossier archivé (pas de suppression)");
                    router.refresh();
                  }
                });
              }}
            >
              Archiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
