"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import type { DemoUser, PrescriptionLine } from "@/types/domain";
import { can } from "@/lib/rbac";
import { buildPrescriptionChecks } from "@/lib/prescriptions/checks";
import { RX_TEMPLATES } from "@/lib/prescriptions/templates";
import type { RxRecord } from "@/lib/prescriptions/record";
import {
  applyRxTemplateAction,
  checkInteractionsAction,
  duplicatePrescriptionAction,
  exportPrescriptionPdfAction,
  savePrescriptionAction,
  searchDciAction,
  validatePrescriptionAction,
} from "@/server/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { AllergyBanner } from "@/components/patients/AllergyBanner";
import { RubricNav } from "@/components/clinical/RubricNav";
import { uuidv7 } from "uuidv7";

function emptyLine(): PrescriptionLine {
  return {
    id: uuidv7(),
    drug: "",
    dci: null,
    dosage: null,
    form: null,
    posology: "",
    route: null,
    frequency: null,
    duration: "",
    quantity: null,
    renewals: null,
    remarks: null,
    ald: false,
  };
}

export function PrescriptionEditor({
  rx: initial,
  user,
  allergies,
  patientLabel,
  birthDate,
  dfg,
  kaliemie,
  pregnancy,
}: {
  rx: RxRecord;
  user: DemoUser;
  allergies: string[];
  patientLabel: string;
  birthDate: string;
  dfg: { value: string | number | null; datedAt: string | null };
  kaliemie: { value: string | number | null; datedAt: string | null };
  pregnancy: boolean | null;
}) {
  const router = useRouter();
  const [rx, setRx] = useState(initial);
  const [pending, start] = useTransition();
  const [dciQuery, setDciQuery] = useState("");
  const [dciHits, setDciHits] = useState<{ dci: string }[]>([]);
  const [interactionMsg, setInteractionMsg] = useState(
    "Base médicamenteuse non connectée — vérification clinique nécessaire.",
  );
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState("");

  const mayWrite = can(user, "prescription.write");
  const mayValidate = can(user, "prescription.validate");
  const immutable = rx.status !== "brouillon";

  const checks = useMemo(
    () =>
      buildPrescriptionChecks({
        allergies,
        dfg: { ...dfg, unit: "mL/min" },
        kaliemie: { ...kaliemie, unit: "mmol/L" },
        pregnancy,
        interactionMessage: interactionMsg,
      }),
    [allergies, dfg, kaliemie, pregnancy, interactionMsg],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void searchDciAction(dciQuery).then((r) => {
        if (r.ok) setDciHits(r.results);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [dciQuery]);

  useEffect(() => {
    const dcis = rx.lines.map((l) => l.dci || l.drug).filter(Boolean);
    void checkInteractionsAction(dcis).then((r) => {
      if (r.ok) setInteractionMsg(r.result.message);
    });
  }, [rx.lines]);

  const updateLine = (id: string, patch: Partial<PrescriptionLine>) => {
    if (immutable) return;
    setRx((r) => ({
      ...r,
      lines: r.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const persist = () =>
    start(async () => {
      const r = await savePrescriptionAction({
        prescriptionId: rx.id,
        lines: rx.lines,
        aldLayout: rx.aldLayout,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setRx(r.rx);
      toast.success("Brouillon enregistré");
    });

  if (!mayWrite) {
    return (
      <p className="text-muted-foreground text-sm">
        Ordonnance réservée au médecin (`prescription.write` verrouillé).
      </p>
    );
  }

  const dossierHref = `/patients/${rx.patientId}`;
  const encounterHref = rx.encounterId ? `/consultations/${rx.encounterId}/synthese` : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="surface-elevated space-y-2.5 rounded-xl p-3">
        <AllergyBanner allergies={allergies} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <Link
            href={dossierHref}
            className="text-primary inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Dossier patient
          </Link>
          {encounterHref ? (
            <Link
              href={encounterHref}
              className="text-muted-foreground hover:text-foreground font-medium underline-offset-2 hover:underline"
            >
              Consultation
            </Link>
          ) : null}
          <span className="text-muted-foreground hidden sm:inline" aria-hidden>
            /
          </span>
          <span className="font-semibold">Ordonnance</span>
          <span className="text-muted-foreground text-xs">
            {patientLabel}
            {rx.aldLayout ? " · bizone ALD" : ""}
          </span>
          <div className="ml-auto">
            <StatusBadge
              variant={rx.status === "valide" ? "valide" : "incomplet"}
              label={rx.status === "valide" ? "Validée" : "Brouillon"}
            />
          </div>
        </div>
        {rx.encounterId ? (
          <RubricNav consultationId={rx.encounterId} currentSlug="ordonnance" />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight">Ordonnance</h1>
              <p className="text-muted-foreground text-xs">
                Aucune dose préremplie · e-prescription non disponible
              </p>
            </div>
          </div>

          <Card size="sm">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-extrabold">
                Lignes
                {rx.lines.length > 0 ? (
                  <span className="text-muted-foreground ml-1.5 text-xs font-semibold">
                    ({rx.lines.length})
                  </span>
                ) : null}
              </CardTitle>
              {!immutable ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      disabled={pending}
                      checked={rx.aldLayout}
                      onChange={(e) => setRx((r) => ({ ...r, aldLayout: e.target.checked }))}
                    />
                    Bizone ALD
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7"
                    disabled={pending}
                    onClick={() => setRx((r) => ({ ...r, lines: [...r.lines, emptyLine()] }))}
                  >
                    Ajouter
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2">
              {!immutable ? (
                <div className="space-y-1">
                  <Label className="text-xs">Recherche DCI</Label>
                  <Input
                    className="h-8"
                    value={dciQuery}
                    onChange={(e) => setDciQuery(e.target.value)}
                    placeholder="ex. bisoprolol"
                  />
                  {dciHits.length > 0 ? (
                    <ul className="border-border max-h-24 overflow-auto rounded-md border text-sm">
                      {dciHits.map((h) => (
                        <li key={h.dci}>
                          <button
                            type="button"
                            className="hover:bg-muted w-full px-2.5 py-1.5 text-left text-xs"
                            onClick={() => {
                              setRx((r) => ({
                                ...r,
                                lines: [
                                  ...r.lines,
                                  {
                                    ...emptyLine(),
                                    drug: h.dci,
                                    dci: h.dci,
                                  },
                                ],
                              }));
                              setDciQuery("");
                            }}
                          >
                            {h.dci}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {rx.lines.length === 0 ? (
                <p className="text-muted-foreground text-xs">Aucune ligne — ajoutez une DCI.</p>
              ) : null}

              {immutable ? (
                <ul className="divide-border divide-y">
                  {rx.lines.map((line) => {
                    const meta = [line.dosage, line.form, line.route]
                      .map((v) => v?.trim())
                      .filter(Boolean)
                      .join(" · ");
                    const poso = [line.posology?.trim(), line.duration?.trim()]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li
                        key={line.id}
                        className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold">
                            {line.dci?.trim() || line.drug.trim() || "Sans DCI"}
                            {line.ald ? (
                              <span className="text-muted-foreground ml-1.5 text-[10px] font-extrabold tracking-wide uppercase">
                                ALD
                              </span>
                            ) : null}
                          </p>
                          {meta ? (
                            <p className="text-muted-foreground text-xs tabular-nums">{meta}</p>
                          ) : null}
                          <p className="text-xs leading-snug">
                            {poso || "Posologie non renseignée"}
                          </p>
                          {line.remarks?.trim() ? (
                            <p className="text-muted-foreground mt-0.5 text-[11px]">
                              Remarque · {line.remarks.trim()}
                            </p>
                          ) : null}
                        </div>
                        {line.quantity || line.renewals != null ? (
                          <div className="text-muted-foreground shrink-0 text-right text-[11px]">
                            {line.quantity ? <p>Qté {line.quantity}</p> : null}
                            {line.renewals != null ? <p>Renouv. {line.renewals}</p> : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                rx.lines.map((line) => (
                  <div
                    key={line.id}
                    className="border-border grid gap-1.5 rounded-lg border p-2.5 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <div className="space-y-0.5 sm:col-span-2 lg:col-span-1">
                      <Label className="text-[11px]">DCI</Label>
                      <Input
                        className="h-8"
                        value={line.dci ?? line.drug}
                        onChange={(e) =>
                          updateLine(line.id, {
                            dci: e.target.value || null,
                            drug: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[11px]">Dosage</Label>
                      <Input
                        className="h-8"
                        value={line.dosage ?? ""}
                        onChange={(e) => updateLine(line.id, { dosage: e.target.value || null })}
                        placeholder="—"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[11px]">Forme</Label>
                      <Input
                        className="h-8"
                        value={line.form ?? ""}
                        onChange={(e) => updateLine(line.id, { form: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[11px]">Voie</Label>
                      <Input
                        className="h-8"
                        value={line.route ?? ""}
                        onChange={(e) => updateLine(line.id, { route: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-0.5 sm:col-span-2">
                      <Label className="text-[11px]">Posologie</Label>
                      <Input
                        className="h-8"
                        value={line.posology}
                        onChange={(e) => updateLine(line.id, { posology: e.target.value })}
                        placeholder="Saisie libre"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[11px]">Durée</Label>
                      <Input
                        className="h-8"
                        value={line.duration ?? ""}
                        onChange={(e) => updateLine(line.id, { duration: e.target.value })}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[11px]">Quantité</Label>
                      <Input
                        className="h-8"
                        value={line.quantity ?? ""}
                        onChange={(e) => updateLine(line.id, { quantity: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[11px]">Renouv.</Label>
                      <Input
                        className="h-8"
                        type="number"
                        value={line.renewals ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateLine(line.id, {
                            renewals: raw === "" ? null : Number(raw),
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-0.5 sm:col-span-2 lg:col-span-2">
                      <Label className="text-[11px]">Remarque</Label>
                      <Input
                        className="h-8"
                        value={line.remarks ?? ""}
                        onChange={(e) => updateLine(line.id, { remarks: e.target.value || null })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-2">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          disabled={!rx.aldLayout}
                          checked={Boolean(line.ald)}
                          onChange={(e) => updateLine(line.id, { ald: e.target.checked })}
                        />
                        Zone ALD
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() =>
                          setRx((r) => ({
                            ...r,
                            lines: r.lines.filter((l) => l.id !== line.id),
                          }))
                        }
                        aria-label="Supprimer la ligne"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {!immutable ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  disabled={pending}
                  onClick={persist}
                >
                  Enregistrer le brouillon
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="flex w-full max-w-[280px] flex-col gap-2.5 lg:sticky lg:top-3">
          {!immutable ? (
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-extrabold">Modèles</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {RX_TEMPLATES.map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 justify-start text-xs"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await savePrescriptionAction({
                          prescriptionId: rx.id,
                          lines: rx.lines,
                          aldLayout: rx.aldLayout,
                        });
                        const r = await applyRxTemplateAction({
                          prescriptionId: rx.id,
                          templateId: t.id,
                        });
                        if (!r.ok) {
                          toast.error(r.error);
                          return;
                        }
                        setRx(r.rx);
                        toast.success(`Modèle « ${t.label} » — doses vides`);
                      })
                    }
                  >
                    {t.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card size="sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-extrabold">Vérifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {checks.map((c) => (
                <div
                  key={c.id}
                  className={
                    c.level === "alerte"
                      ? "border-destructive/40 bg-destructive/5 rounded-md border px-2 py-1.5"
                      : "border-border rounded-md border px-2 py-1.5"
                  }
                >
                  <p className="text-xs font-bold">{c.label}</p>
                  <p className="text-muted-foreground text-[11px] leading-snug">{c.detail}</p>
                </div>
              ))}
              <p className="text-muted-foreground text-[11px]">Rappels non bloquants.</p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex flex-col gap-1.5">
              {rx.status === "brouillon" && mayValidate ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  disabled={pending || rx.lines.length === 0}
                  onClick={() => setStepUpOpen(true)}
                >
                  Valider
                </Button>
              ) : null}
              {stepUpOpen ? (
                <div className="border-border space-y-1.5 rounded-lg border p-2.5 text-sm">
                  <p className="text-xs font-bold">Ré-authentification</p>
                  <p className="text-muted-foreground text-[11px]">
                    Mot de passe pour valider (step-up).
                  </p>
                  <Input
                    id="rx-step-up-password"
                    className="h-8"
                    type="password"
                    autoComplete="current-password"
                    value={stepUpPassword}
                    onChange={(e) => setStepUpPassword(e.target.value)}
                    aria-label="Mot de passe"
                  />
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7"
                      disabled={pending || stepUpPassword.trim().length < 12}
                      onClick={() =>
                        start(async () => {
                          await savePrescriptionAction({
                            prescriptionId: rx.id,
                            lines: rx.lines,
                            aldLayout: rx.aldLayout,
                          });
                          const r = await validatePrescriptionAction({
                            prescriptionId: rx.id,
                            password: stepUpPassword,
                          });
                          if (!r.ok) {
                            toast.error(r.error);
                            return;
                          }
                          setStepUpPassword("");
                          setStepUpOpen(false);
                          setRx(r.rx);
                          toast.success("Ordonnance validée (immuable)");
                        })
                      }
                    >
                      Confirmer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => {
                        setStepUpPassword("");
                        setStepUpOpen(false);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await exportPrescriptionPdfAction({
                      prescriptionId: rx.id,
                      patientLabel,
                      birthDate,
                    });
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    const bin = atob(r.base64);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    const blob = new Blob([bytes], { type: r.contentType });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${rx.id}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                }
              >
                Exporter PDF A4
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await duplicatePrescriptionAction(rx.id);
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    toast.success("Nouveau brouillon créé");
                    router.push(`/ordonnances/${r.rx.id}`);
                  })
                }
              >
                Dupliquer
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled>
                e-prescription indisponible
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
