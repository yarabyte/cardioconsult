"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import type { DemoUser, DocumentStatus } from "@/types/domain";
import { can } from "@/lib/rbac";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { RubricNav } from "@/components/clinical/RubricNav";
import { AllergyBanner } from "@/components/patients/AllergyBanner";
import { StructuredDocView } from "@/lib/documents/render";
import { tipDocToPlainText } from "@/lib/documents/generate";
import { diffTipDocs } from "@/lib/documents/diff";
import { CR_TEMPLATES, SECTION_LABELS } from "@/lib/documents/templates";
import type {
  CrTemplateId,
  DocumentSectionId,
  SourceSnapshot,
  TipDoc,
} from "@/lib/documents/tiptap-types";
import { para } from "@/lib/documents/tiptap-types";
import {
  amendDocumentAction,
  auditDocumentPrintAction,
  exportDocumentPdfAction,
  regenerateDocumentAction,
  setDocumentTemplateAction,
  signDocumentAction,
  validateDocumentAction,
  saveDocumentEditAction,
} from "@/server/actions/documents";
import type { DocRecord } from "@/lib/documents/record";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

function demoSnapshot(): SourceSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    encounterId: "enc-dupont",
    patientLabel: "Mme Jeanne DUPONT",
    dossierNumber: "CC-000184",
    birthDate: "1959-03-14",
    ageAtAct: 67,
    actDate: "2026-11-23",
    motif: "Suivi insuffisance cardiaque",
    history: null,
    clinicalExam: {
      tas: 128,
      tad: 78,
      fc: 66,
      spo2: 97,
      weightKg: 82.1,
      nyha: "II",
      auscultation: null,
    },
    ecg: { rythme: "sinusal", fc: 66, qtc: 443, qtcMethod: "Fridericia" },
    echo: { fevg: 47, fevgMethod: "Simpson biplan", conclusion: null },
    labs: { "NT-proBNP": "590 pg/mL", DFG: "54 mL/min", "K+": "4,9 mmol/L" },
    scores: [{ label: "CHA₂DS₂-VA", value: "3", ruleVersion: "v2024" }],
    conclusion: null,
    conduite: null,
  };
}

export function CompteRenduWorkflow({
  initial,
  user,
  allergies = [],
  patientLabel,
}: {
  initial: DocRecord;
  user: DemoUser;
  allergies?: string[];
  patientLabel: string;
}) {
  const [doc, setDoc] = useState(initial);
  const [pending, start] = useTransition();
  const [showDiff, setShowDiff] = useState(false);
  const [prevEdit, setPrevEdit] = useState<TipDoc | null>(null);
  const [editBuffer, setEditBuffer] = useState(() => tipDocToPlainText(initial.edited));
  const [amendReason, setAmendReason] = useState("");

  const mayValidate = can(user, "document.validate");
  const maySign = can(user, "document.sign");
  const immutable = doc.status === "valide" || doc.status === "signe";

  const statusVariant =
    doc.status === "signe" ? "valide" : doc.status === "valide" ? "calcule" : "incomplet";

  const diffLines = useMemo(() => {
    if (!prevEdit) return [];
    return diffTipDocs(prevEdit, doc.edited);
  }, [prevEdit, doc.edited]);

  const cycleStep = doc.status === "signe" ? 3 : doc.status === "valide" ? 2 : 1;
  const dossierHref = `/patients/${doc.patientId}`;
  const encounterHref = doc.encounterId ? `/consultations/${doc.encounterId}/synthese` : null;

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
          <span className="font-semibold">Compte rendu</span>
          <span className="text-muted-foreground text-xs">{patientLabel}</span>
          <div className="ml-auto">
            <StatusBadge variant={statusVariant} label={STATUS_LABELS[doc.status]} />
          </div>
        </div>
        {doc.encounterId ? (
          <RubricNav consultationId={doc.encounterId} currentSlug="compte-rendu" />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <aside className="flex w-full max-w-[280px] flex-col gap-2.5 lg:sticky lg:top-3">
          <Card size="sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-extrabold">Cycle de validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ol className="flex gap-1">
                {(["Brouillon", "Validé", "Signé"] as const).map((label, i) => {
                  const active = i + 1 <= cycleStep;
                  return (
                    <li
                      key={label}
                      className={
                        active
                          ? "bg-primary text-primary-foreground flex-1 rounded-md px-1 py-1.5 text-center text-[11px] font-extrabold"
                          : "bg-muted text-muted-foreground flex-1 rounded-md px-1 py-1.5 text-center text-[11px] font-extrabold"
                      }
                    >
                      {label}
                    </li>
                  );
                })}
              </ol>
              {doc.status === "brouillon" && mayValidate ? (
                <Button
                  type="button"
                  className="h-8 w-full"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await validateDocumentAction({ documentId: doc.id });
                      if (!r.ok) {
                        toast.error(r.error);
                        return;
                      }
                      setDoc(r.doc);
                      toast.success("Compte rendu validé");
                    })
                  }
                >
                  Valider le compte rendu
                </Button>
              ) : null}
              {doc.status === "valide" ? (
                <Button
                  type="button"
                  className="h-8 w-full"
                  disabled={pending || !maySign}
                  onClick={() =>
                    start(async () => {
                      const r = await signDocumentAction({ documentId: doc.id });
                      if (!r.ok) {
                        toast.message(r.error);
                        if (r.doc) setDoc(r.doc);
                        return;
                      }
                      setDoc(r.doc);
                    })
                  }
                >
                  Signer (e-CPS)
                </Button>
              ) : null}
              <p className="text-muted-foreground text-xs leading-relaxed">
                SignatureProvider = NotAvailable — le document reste « validé » tant qu&apos;aucune
                intégration e-CPS n&apos;est branchée. Step-up exigé pour la signature.
              </p>
              {doc.status === "signe" && doc.signedAt ? (
                <p className="text-success text-sm font-semibold">
                  Signé le {formatDateTime(doc.signedAt)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {doc.sourceModified ? (
            <Alert>
              <AlertTitle>Données sources modifiées après génération</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Régénérer créera la version {doc.version + 1} ; vos éditions restent consultables.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!prevEdit}
                    onClick={() => setShowDiff((v) => !v)}
                  >
                    Voir les différences
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await regenerateDocumentAction({
                          documentId: doc.id,
                          snapshot: demoSnapshot(),
                          sections: doc.sections,
                        });
                        if (!r.ok) {
                          toast.error(r.error);
                          return;
                        }
                        setPrevEdit(r.previousEdit);
                        setDoc(r.doc);
                        setEditBuffer(tipDocToPlainText(r.doc.edited));
                        setShowDiff(true);
                        toast.success(`Version ${r.doc.version} générée`);
                      })
                    }
                  >
                    Régénérer
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {showDiff && prevEdit ? (
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-extrabold">Différences</CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 space-y-1 overflow-auto text-xs">
                {diffLines.map((l, i) => (
                  <p
                    key={i}
                    className={
                      l.kind === "added"
                        ? "text-success"
                        : l.kind === "removed"
                          ? "text-destructive line-through"
                          : "text-muted-foreground"
                    }
                  >
                    {l.kind === "added" ? "+ " : l.kind === "removed" ? "− " : "  "}
                    {l.text}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card size="sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-extrabold">Modèle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                disabled={immutable || pending}
                value={doc.templateId}
                onChange={(e) => {
                  const templateId = e.target.value as CrTemplateId;
                  const tpl = CR_TEMPLATES.find((t) => t.id === templateId);
                  if (!tpl) return;
                  start(async () => {
                    const r = await setDocumentTemplateAction({
                      documentId: doc.id,
                      templateId,
                      sections: tpl.defaultSections,
                    });
                    if (r.ok) setDoc(r.doc);
                  });
                }}
              >
                {CR_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="space-y-1">
                <p className="text-sm font-extrabold">Sections incluses</p>
                {(Object.keys(SECTION_LABELS) as DocumentSectionId[]).map((sid) => (
                  <label key={sid} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={immutable || pending}
                      checked={doc.sections.includes(sid)}
                      onChange={(e) => {
                        const sections = e.target.checked
                          ? [...doc.sections, sid]
                          : doc.sections.filter((s) => s !== sid);
                        start(async () => {
                          const r = await setDocumentTemplateAction({
                            documentId: doc.id,
                            templateId: doc.templateId,
                            sections,
                          });
                          if (r.ok) setDoc(r.doc);
                        });
                      }}
                    />
                    {SECTION_LABELS[sid]}
                  </label>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Diplômes en en-tête : affichés comme déclaratifs, non vérifiés.
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await exportDocumentPdfAction({ documentId: doc.id });
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
                    a.download = `${doc.id}-v${doc.version}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(r.mode === "demo" ? "PDF démo exporté" : "PDF Gotenberg exporté");
                  })
                }
              >
                Exporter PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void auditDocumentPrintAction(doc.id);
                  window.print();
                }}
              >
                Imprimer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(tipDocToPlainText(doc.edited));
                  toast.success("Texte copié");
                }}
              >
                Copier le texte
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                Envoyer MSSanté (à venir)
              </Button>
            </CardContent>
          </Card>

          {immutable ? (
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-extrabold">Amendement motivé (N+1)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="amend">Motif</Label>
                <Textarea
                  id="amend"
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  rows={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || amendReason.trim().length < 3}
                  onClick={() =>
                    start(async () => {
                      const r = await amendDocumentAction({
                        documentId: doc.id,
                        reason: amendReason,
                      });
                      if (!r.ok) {
                        toast.error(r.error);
                        return;
                      }
                      setDoc(r.doc);
                      setAmendReason("");
                      toast.success(`Version ${r.doc.version} (brouillon)`);
                    })
                  }
                >
                  Créer version N+1
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight">{doc.title}</h1>
              <p className="text-muted-foreground text-xs">Version {doc.version}</p>
            </div>
            <StatusBadge variant={statusVariant} label={STATUS_LABELS[doc.status]} />
          </div>

          {!immutable ? (
            <Card size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-extrabold">Édition médecin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="cr-edit-buffer" className="text-xs">
                  Contenu éditable
                </Label>
                <Textarea
                  id="cr-edit-buffer"
                  rows={5}
                  className="min-h-0 text-sm"
                  value={editBuffer}
                  onChange={(e) => setEditBuffer(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const edited: TipDoc = {
                        type: "doc",
                        content: editBuffer
                          .split("\n")
                          .filter((l) => l.length > 0)
                          .map((line) => para(line)),
                      };
                      const r = await saveDocumentEditAction({
                        documentId: doc.id,
                        edited,
                      });
                      if (!r.ok) {
                        toast.error(r.error);
                        return;
                      }
                      setDoc(r.doc);
                      toast.success("Édition enregistrée");
                    })
                  }
                >
                  Enregistrer l&apos;édition
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-xs">
              Document immuable — modification via amendement motivé uniquement.
            </p>
          )}

          <section
            aria-label="Aperçu A4"
            className="bg-muted/50 flex justify-center rounded-xl p-3 sm:p-4"
          >
            <article className="relative w-full max-w-[794px] bg-white px-6 py-5 shadow-sm sm:px-8 sm:py-6 print:shadow-none">
              {doc.status === "brouillon" ? (
                <div
                  aria-hidden
                  className="border-warning text-warning absolute top-3 right-3 rounded border px-1.5 py-0.5 text-[10px] font-extrabold tracking-widest"
                >
                  BROUILLON
                </div>
              ) : null}
              <header className="border-foreground mb-2.5 border-b pr-16 pb-2">
                <p className="text-[15px] leading-tight font-extrabold">Dr Claire Martin</p>
                <p className="text-xs leading-snug">Cardiologie — Cabinet de cardiologie Martin</p>
                <p className="text-muted-foreground text-[11px] leading-snug">
                  DIU d&apos;échocardiographie · DU HTA <em>(déclaratif — non vérifié)</em>
                </p>
              </header>
              <StructuredDocView doc={doc.edited} />
              <footer className="text-muted-foreground mt-4 flex justify-between border-t pt-1.5 text-[11px]">
                <span>
                  {doc.id} · v{doc.version} · {STATUS_LABELS[doc.status]}
                </span>
                <span>Page 1 / 1</span>
              </footer>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  signe: "Signé",
  annule: "Annulé",
  remplace: "Remplacé",
};
