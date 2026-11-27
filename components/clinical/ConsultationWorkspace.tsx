"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EncounterDraft } from "@/lib/consultation/draft-types";
import { completenessFromDraft } from "@/lib/consultation/completeness";
import type { RubricState } from "@/lib/consultation/rubrics";
import { ECHO_TEMPLATES } from "@/lib/consultation/templates";
import { computeBsa } from "@/lib/clinical/bsa";
import { computeImc } from "@/lib/clinical/imc";
import { ageAt, formatDateTime, patientDisplayName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RubricStepper } from "@/components/clinical/RubricStepper";
import { PatientContextBar, type AutosaveStatus } from "@/components/clinical/PatientContextBar";
import { RubricNav } from "@/components/clinical/RubricNav";
import { AllergyBanner } from "@/components/patients/AllergyBanner";
import { CarteVitalePanel } from "@/components/patients/CarteVitalePanel";
import {
  applyEchoTemplateAction,
  closeEncounterAction,
  saveEncounterDraftAction,
} from "@/server/actions/consultation";
import {
  completeFileUploadAction,
  initFileUploadAction,
  listPatientFilesAction,
} from "@/server/actions/files";
import { emptyLabPanel, LAB_CODES, checkLabRange } from "@/lib/exams/lab";
import {
  AORTA_SEGMENTS,
  emptyAortaSegment,
  evaluateAortaDraft,
  type AortaDraft,
} from "@/lib/exams/aorta-measure";
import type { LabPanel } from "@/lib/exams/lab";
import type { Patient } from "@/types/domain";
import { uuidv7 } from "uuidv7";
import { ExamOrdersWorkspace } from "@/components/clinical/ExamOrdersWorkspace";
import { emptyExamOrdersDraft } from "@/lib/exam-orders";

export function ConsultationWorkspace({
  consultationId,
  rubrique,
  patient,
  actDate,
  motifLabel,
  initialDraft,
  initialStates,
  initialDone,
  initialTotal,
  examOrdersEnabled = false,
}: {
  consultationId: string;
  rubrique: string;
  patient: Patient;
  actDate: string;
  motifLabel: string;
  initialDraft: EncounterDraft;
  initialStates: Record<string, RubricState>;
  initialDone: number;
  initialTotal: number;
  /** Feature flag `clinical.examOrders`. */
  examOrdersEnabled?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [states, setStates] = useState(initialStates);
  const [done, setDone] = useState(initialDone);
  const [savedAt, setSavedAt] = useState<string | null>(initialDraft.updatedAt);
  const [autosave, setAutosave] = useState<AutosaveStatus>("idle");
  const [conflict, setConflict] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [templateIdPending, setTemplateIdPending] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Record<string, unknown> | null>(null);
  const versionRef = useRef(initialDraft.version);
  const closed = draft.status === "cloturee";

  useEffect(() => {
    versionRef.current = draft.version;
  }, [draft.version]);

  const syncCompleteness = useCallback(
    (next: EncounterDraft) => {
      const { done: d, states: s } = completenessFromDraft(next, rubrique, {
        hasOrdonnanceContent: states.ordonnance === "fait",
        hasScores: states.scores === "fait",
      });
      setDone(d);
      setStates(s);
    },
    [rubrique, states.ordonnance, states.scores],
  );

  const persistPatch = useCallback(
    (patch: Record<string, unknown>) => {
      if (closed) {
        toast.error("Consultation clôturée — modification impossible");
        return;
      }
      setAutosave("saving");
      start(async () => {
        const r = await saveEncounterDraftAction({
          encounterId: consultationId,
          version: versionRef.current,
          patch,
        });
        pendingPatch.current = null;
        if (!r.ok) {
          setAutosave("error");
          if ("code" in r && r.code === "conflict") {
            setConflict(true);
            if (r.draft) {
              setDraft(r.draft);
              versionRef.current = r.draft.version;
              syncCompleteness(r.draft);
            }
            toast.error("Conflit d'édition — brouillon rechargé.");
            return;
          }
          if ("code" in r && r.code === "closed") {
            toast.error("error" in r ? r.error : "Consultation clôturée — modification impossible");
            setDraft((d) => ({ ...d, status: "cloturee" }));
            return;
          }
          toast.error("error" in r ? r.error : "Échec enregistrement");
          return;
        }
        setConflict(false);
        setDraft(r.draft);
        versionRef.current = r.draft.version;
        setSavedAt(r.draft.updatedAt);
        setAutosave("saved");
        syncCompleteness(r.draft);
      });
    },
    [consultationId, closed, syncCompleteness],
  );

  const scheduleSave = useCallback(
    (patch: Record<string, unknown>) => {
      if (closed) {
        toast.error("Consultation clôturée — modification impossible");
        return;
      }
      const prev = pendingPatch.current ?? {};
      const nestedKeys = [
        "clinicalExam",
        "echo",
        "ecg",
        "aorta",
        "effort",
        "coronaires",
        "rythmologie",
        "imagerie",
        "riskFactors",
        "examOrders",
      ] as const;
      const merged: Record<string, unknown> = { ...prev, ...patch };
      for (const key of nestedKeys) {
        if (patch[key] && typeof patch[key] === "object" && !Array.isArray(patch[key])) {
          const before =
            prev[key] && typeof prev[key] === "object" && !Array.isArray(prev[key])
              ? (prev[key] as object)
              : {};
          merged[key] = { ...before, ...(patch[key] as object) };
        }
      }
      pendingPatch.current = merged;
      setAutosave("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const toSave = pendingPatch.current;
        if (toSave) persistPatch(toSave);
      }, 2000);
    },
    [closed, persistPatch],
  );

  const flushSave = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const toSave = pendingPatch.current;
    if (toSave && !closed) persistPatch(toSave);
  }, [closed, persistPatch]);

  const age = ageAt(patient.birthDate, actDate);
  const exam = draft.data.clinicalExam;
  const imc = computeImc(exam.heightM, exam.weightKg);
  const bsa = computeBsa(exam.heightM, exam.weightKg);
  const completenessPct = Math.round((done / initialTotal) * 100);
  const patientLabel = patientDisplayName(patient.firstName, patient.lastName);

  const applyLocalPatch = (patch: Record<string, unknown>) => {
    if (closed) {
      toast.error("Consultation clôturée — modification impossible");
      return;
    }
    setDraft((d) => {
      const next: EncounterDraft = {
        ...d,
        data: {
          ...d.data,
          ...patch,
          clinicalExam: patch.clinicalExam
            ? { ...d.data.clinicalExam, ...(patch.clinicalExam as object) }
            : d.data.clinicalExam,
          echo: patch.echo ? { ...d.data.echo, ...(patch.echo as object) } : d.data.echo,
          riskFactors: patch.riskFactors
            ? { ...d.data.riskFactors, ...(patch.riskFactors as object) }
            : d.data.riskFactors,
          aorta: patch.aorta ? { ...d.data.aorta, ...(patch.aorta as object) } : d.data.aorta,
          effort: patch.effort ? { ...d.data.effort, ...(patch.effort as object) } : d.data.effort,
          coronaires: patch.coronaires
            ? { ...d.data.coronaires, ...(patch.coronaires as object) }
            : d.data.coronaires,
          rythmologie: patch.rythmologie
            ? { ...d.data.rythmologie, ...(patch.rythmologie as object) }
            : d.data.rythmologie,
          imagerie: patch.imagerie
            ? { ...d.data.imagerie, ...(patch.imagerie as object) }
            : d.data.imagerie,
          ecg: patch.ecg ? { ...d.data.ecg, ...(patch.ecg as object) } : d.data.ecg,
          examOrders: patch.examOrders
            ? {
                ...(d.data.examOrders ?? emptyExamOrdersDraft()),
                ...(patch.examOrders as object),
              }
            : (d.data.examOrders ?? emptyExamOrdersDraft()),
        } as EncounterDraft["data"],
      };
      queueMicrotask(() => syncCompleteness(next));
      return next;
    });
    scheduleSave(patch);
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <RubricStepper
        consultationId={consultationId}
        currentSlug={rubrique}
        states={states}
        done={done}
        total={initialTotal}
        onBeforeNavigate={flushSave}
      />
      <div className="min-w-0 flex-1 space-y-4">
        <PatientContextBar
          patientId={patient.id}
          patientLabel={patientLabel}
          ageLabel={`${age} ans (à la date de l'acte)`}
          sex={patient.sex}
          motifLabel={motifLabel}
          allergies={patient.allergies}
          closed={closed}
          autosave={autosave}
          savedAt={savedAt}
          version={draft.version}
          conflict={conflict}
        />

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {closed ? "Consultation clôturée" : "Consultation en cours"}
          </h1>
          <p className="text-primary mt-1 text-sm font-bold">
            {done} / {initialTotal} rubriques · {completenessPct} %
          </p>
        </div>

        {closed ? (
          <Alert>
            <AlertTitle>Consultation clôturée</AlertTitle>
            <AlertDescription>
              Les rubriques sont en lecture seule. Retournez au{" "}
              <Link href={`/patients/${patient.id}`} className="font-semibold underline">
                dossier patient
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        <fieldset disabled={closed} className="min-w-0 space-y-4 border-0 p-0">
          <RubricForm
            rubrique={rubrique}
            draft={draft}
            patient={patient}
            consultationId={consultationId}
            imc={imc}
            bsa={bsa}
            pending={pending || closed}
            readOnly={closed}
            examOrdersEnabled={examOrdersEnabled}
            onPatch={applyLocalPatch}
            onApplyTemplate={(templateId) => {
              if (closed) {
                toast.error("Consultation clôturée — modification impossible");
                return;
              }
              setTemplateIdPending(templateId);
            }}
            onClose={() => {
              if (closed) return;
              setCloseOpen(true);
            }}
          />
          <RubricNav
            consultationId={consultationId}
            currentSlug={rubrique}
            onBeforeNavigate={flushSave}
          />
        </fieldset>

        <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clôturer la consultation ?</DialogTitle>
              <DialogDescription>
                Elle passera en lecture seule. Cette action est enregistrée dans le journal
                d&apos;audit.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCloseOpen(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  setCloseOpen(false);
                  flushSave();
                  start(async () => {
                    const r = await closeEncounterAction({
                      encounterId: consultationId,
                      version: versionRef.current,
                    });
                    if (!r.ok) {
                      if ("code" in r && r.code === "conflict") {
                        setConflict(true);
                        if (r.draft) {
                          setDraft(r.draft);
                          versionRef.current = r.draft.version;
                        }
                        toast.error(
                          "Conflit d'édition — brouillon rechargé. Réessayez la clôture.",
                        );
                        return;
                      }
                      toast.error("error" in r ? r.error : "Clôture impossible");
                      return;
                    }
                    setDraft(r.draft);
                    versionRef.current = r.draft.version;
                    toast.success("Consultation clôturée");
                    router.push(`/patients/${patient.id}`);
                  });
                }}
              >
                Clôturer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={templateIdPending != null}
          onOpenChange={(o) => {
            if (!o) setTemplateIdPending(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Appliquer un modèle ETT ?</DialogTitle>
              <DialogDescription>
                {templateIdPending
                  ? `Le modèle « ${ECHO_TEMPLATES[templateIdPending]?.label ?? templateIdPending} » remplacera les champs ETT. À valider cliniquement.`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTemplateIdPending(null)}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={pending || !templateIdPending}
                onClick={() => {
                  const templateId = templateIdPending;
                  setTemplateIdPending(null);
                  if (!templateId) return;
                  start(async () => {
                    const r = await applyEchoTemplateAction({
                      encounterId: consultationId,
                      version: versionRef.current,
                      templateId,
                      confirmed: true as const,
                    });
                    if (!r.ok) {
                      if ("code" in r && r.code === "conflict") {
                        setConflict(true);
                        toast.error("Conflit — rechargé");
                        if (r.draft) setDraft(r.draft);
                        return;
                      }
                      toast.error("error" in r ? r.error : "Échec");
                      return;
                    }
                    setDraft(r.draft);
                    versionRef.current = r.draft.version;
                    syncCompleteness(r.draft);
                    toast.success("Modèle appliqué (audité)");
                  });
                }}
              >
                Appliquer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function RubricForm({
  rubrique,
  draft,
  patient,
  consultationId,
  imc,
  bsa,
  pending,
  readOnly = false,
  examOrdersEnabled = false,
  onPatch,
  onApplyTemplate,
  onClose,
}: {
  rubrique: string;
  draft: EncounterDraft;
  patient: Patient;
  consultationId: string;
  imc: ReturnType<typeof computeImc>;
  bsa: ReturnType<typeof computeBsa>;
  pending: boolean;
  readOnly?: boolean;
  examOrdersEnabled?: boolean;
  onPatch: (p: Record<string, unknown>) => void;
  onApplyTemplate: (id: string) => void;
  onClose: () => void;
}) {
  const d = draft.data;

  if (rubrique === "identite") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">1 · Identité</h2>
        <p className="text-muted-foreground text-xs">
          Champs vides par défaut — aucune valeur clinique préremplie.
        </p>
        <CarteVitalePanel />
        <div className="space-y-1">
          <Label htmlFor="identityNotes">Notes d&apos;identité</Label>
          <Textarea
            id="identityNotes"
            rows={3}
            value={d.identityNotes ?? ""}
            disabled={pending || readOnly}
            onChange={(e) => onPatch({ identityNotes: e.target.value || null })}
          />
        </div>
      </section>
    );
  }

  if (rubrique === "motif") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">2 · Motif / histoire</h2>
        <p className="text-muted-foreground text-xs">
          Champs vides par défaut — aucune valeur clinique préremplie.
        </p>
        <div className="space-y-1">
          <Label htmlFor="motif">Motif</Label>
          <Input
            id="motif"
            value={d.motif ?? ""}
            disabled={pending || readOnly}
            onChange={(e) => onPatch({ motif: e.target.value || null })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="history">Histoire de la maladie</Label>
          <Textarea
            id="history"
            rows={4}
            value={d.history ?? ""}
            disabled={pending || readOnly}
            onChange={(e) => onPatch({ history: e.target.value || null })}
          />
        </div>
      </section>
    );
  }

  if (rubrique === "antecedents") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">3 · Antécédents structurés</h2>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            onPatch({
              antecedents: [
                ...d.antecedents,
                {
                  id: crypto.randomUUID(),
                  pathology: "",
                  status: "actif",
                  date: null,
                  params: null,
                  comment: null,
                },
              ],
            })
          }
        >
          Ajouter une ligne
        </Button>
        {d.antecedents.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune ligne — non renseigné.</p>
        ) : (
          d.antecedents.map((row, i) => (
            <div key={row.id} className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Pathologie"
                value={row.pathology}
                onChange={(e) => {
                  const next = [...d.antecedents];
                  next[i] = { ...row, pathology: e.target.value };
                  onPatch({ antecedents: next });
                }}
              />
              <Input
                placeholder="Commentaire"
                value={row.comment ?? ""}
                onChange={(e) => {
                  const next = [...d.antecedents];
                  next[i] = { ...row, comment: e.target.value || null };
                  onPatch({ antecedents: next });
                }}
              />
            </div>
          ))
        )}
      </section>
    );
  }

  if (rubrique === "facteurs") {
    const keys = Object.keys(d.riskFactors);
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">4 · Facteurs de risque CV</h2>
        <p className="text-muted-foreground text-xs">Trois états : oui / non / non renseigné.</p>
        {keys.map((k) => (
          <div key={k} className="flex flex-wrap items-center gap-2">
            <span className="w-36 text-sm font-semibold capitalize">{k}</span>
            {(["yes", "no", "unknown"] as const).map((v) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={d.riskFactors[k] === v ? "default" : "outline"}
                onClick={() => onPatch({ riskFactors: { ...d.riskFactors, [k]: v } })}
              >
                {v === "yes" ? "Oui" : v === "no" ? "Non" : "?"}
              </Button>
            ))}
          </div>
        ))}
      </section>
    );
  }

  if (rubrique === "traitements") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">5 · Traitements / allergies</h2>
        <AllergyBanner allergies={d.allergies.length ? d.allergies : patient.allergies} />
        <div className="space-y-1">
          <Label>Allergies (séparées par virgule)</Label>
          <Input
            value={d.allergies.join(", ")}
            onChange={(e) =>
              onPatch({
                allergies: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Laisser vide si aucune"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onPatch({
              treatments: [
                ...d.treatments,
                { id: crypto.randomUUID(), dci: "", dose: null, frequency: null },
              ],
            })
          }
        >
          Ajouter un traitement (DCI)
        </Button>
        {d.treatments.map((t, i) => (
          <Input
            key={t.id}
            placeholder="DCI — dose non préremplie"
            value={t.dci}
            onChange={(e) => {
              const next = [...d.treatments];
              next[i] = { ...t, dci: e.target.value };
              onPatch({ treatments: next });
            }}
          />
        ))}
      </section>
    );
  }

  if (rubrique === "examen") {
    const exam = d.clinicalExam;
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">6 · Examen clinique</h2>
        {exam.vitalsAuthor ? (
          <p className="text-muted-foreground text-xs">
            Constantes IDE : {exam.vitalsAuthor}
            {exam.vitalsAt ? ` · ${formatDateTime(exam.vitalsAt)}` : ""}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Num
            label="TAS (mmHg)"
            value={exam.tas}
            onChange={(n) => onPatch({ clinicalExam: { ...exam, tas: n } })}
          />
          <Num
            label="TAD (mmHg)"
            value={exam.tad}
            onChange={(n) => onPatch({ clinicalExam: { ...exam, tad: n } })}
          />
          <Num
            label="FC (bpm)"
            value={exam.fc}
            onChange={(n) => onPatch({ clinicalExam: { ...exam, fc: n } })}
          />
          <Num
            label="Poids (kg)"
            value={exam.weightKg}
            onChange={(n) => onPatch({ clinicalExam: { ...exam, weightKg: n } })}
          />
          <Num
            label="Taille (m)"
            value={exam.heightM}
            onChange={(n) => onPatch({ clinicalExam: { ...exam, heightM: n } })}
          />
          <div className="space-y-1">
            <Label>NYHA</Label>
            <Input
              value={exam.nyha ?? ""}
              onChange={(e) => onPatch({ clinicalExam: { ...exam, nyha: e.target.value || null } })}
              placeholder="Non renseigné"
            />
          </div>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 text-sm">
          <p>
            <strong>IMC</strong> : {imc.status === "calcule" ? `${imc.value}` : imc.status}{" "}
            <span className="text-muted-foreground text-xs">{imc.rationale[0] ?? ""}</span>
          </p>
          <p className="mt-1">
            <strong>BSA Mosteller</strong> :{" "}
            {bsa.status === "calcule" ? `${bsa.value} m²` : bsa.status}{" "}
            <span className="text-muted-foreground text-xs">{bsa.rationale[0] ?? ""}</span>
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="auscultation">Auscultation (texte libre)</Label>
          <Textarea
            id="auscultation"
            rows={3}
            value={exam.auscultation ?? ""}
            onChange={(e) =>
              onPatch({ clinicalExam: { ...exam, auscultation: e.target.value || null } })
            }
            placeholder=""
          />
          <p className="text-muted-foreground text-xs">
            Vide par défaut — aucune phrase « normal » générée automatiquement.
          </p>
        </div>
      </section>
    );
  }

  if (rubrique === "biologie") {
    return (
      <LabRubric
        labs={d.labs}
        patientId={patient.id}
        encounterId={draft.encounterId}
        pending={pending}
        onPatch={onPatch}
      />
    );
  }

  if (rubrique === "ecg") {
    const ecg = d.ecg;
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">8 · ECG</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Rythme</Label>
            <Input
              value={ecg.rythme ?? ""}
              onChange={(e) => onPatch({ ecg: { ...ecg, rythme: e.target.value || null } })}
              placeholder="Non renseigné"
            />
          </div>
          <Num
            label="FC (bpm)"
            value={ecg.fcBpm}
            onChange={(n) => onPatch({ ecg: { ...ecg, fcBpm: n } })}
          />
          <Num
            label="PR (ms)"
            value={ecg.prMs}
            onChange={(n) => onPatch({ ecg: { ...ecg, prMs: n } })}
          />
          <Num
            label="QRS (ms)"
            value={ecg.qrsMs}
            onChange={(n) => onPatch({ ecg: { ...ecg, qrsMs: n } })}
          />
          <Num
            label="QTc (ms)"
            value={ecg.qtcMs}
            onChange={(n) => onPatch({ ecg: { ...ecg, qtcMs: n } })}
          />
          <div className="space-y-1">
            <Label>Méthode QTc</Label>
            <select
              className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
              value={ecg.qtcMethod ?? ""}
              onChange={(e) =>
                onPatch({
                  ecg: {
                    ...ecg,
                    qtcMethod: (e.target.value || null) as typeof ecg.qtcMethod,
                  },
                })
              }
            >
              <option value="">Non renseigné</option>
              <option value="Fridericia">Fridericia</option>
              <option value="Bazett">Bazett</option>
            </select>
            {ecg.qtcMs != null && !ecg.qtcMethod ? (
              <p className="text-destructive text-xs">Méthode obligatoire si QTc saisi.</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Axe</Label>
            <Input
              value={ecg.axis ?? ""}
              onChange={(e) => onPatch({ ecg: { ...ecg, axis: e.target.value || null } })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Troubles de conduction (plusieurs possibles)</Label>
          <Input
            value={ecg.conductions.join(", ")}
            onChange={(e) =>
              onPatch({
                ecg: {
                  ...ecg,
                  conductions: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            placeholder="ex. BBD, BAV1"
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["stElevation", "Sus-ST"],
              ["stDepression", "Sous-ST"],
              ["tNegative", "T négatives"],
              ["pacing", "Stimulation"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(ecg[key])}
                onChange={(e) => onPatch({ ecg: { ...ecg, [key]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="space-y-1">
          <Label>Dispositif</Label>
          <Input
            value={ecg.device ?? ""}
            onChange={(e) => onPatch({ ecg: { ...ecg, device: e.target.value || null } })}
            placeholder="PM / CRT — non renseigné"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ecg-interpretation">Interprétation</Label>
          <Textarea
            id="ecg-interpretation"
            rows={3}
            value={ecg.interpretation ?? ""}
            onChange={(e) => onPatch({ ecg: { ...ecg, interpretation: e.target.value || null } })}
            placeholder=""
          />
        </div>
        <FileUploadPanel
          patientId={patient.id}
          encounterId={draft.encounterId}
          label="Joindre un tracé ECG (PDF/image)"
        />
      </section>
    );
  }

  if (rubrique === "echocardiographie") {
    const echo = d.echo;
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">9 · Échocardiographie transthoracique</h2>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onApplyTemplate("ett_normale")}
          >
            Appliquer un modèle « ETT normale »…
          </Button>
        </div>
        <fieldset className="border-border bg-card space-y-3 rounded-2xl border p-4">
          <legend className="px-1 text-sm font-extrabold">Ventricule gauche</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Num
              label="FEVG %"
              value={echo.fevg}
              onChange={(n) => onPatch({ echo: { ...echo, fevg: n } })}
            />
            <div className="space-y-1">
              <Label>Méthode FEVG</Label>
              <Input
                value={echo.fevgMethod ?? ""}
                onChange={(e) => onPatch({ echo: { ...echo, fevgMethod: e.target.value || null } })}
                placeholder="Simpson / visuelle…"
              />
            </div>
            <Num
              label="DTDVG mm"
              value={echo.dtdvgMm}
              onChange={(n) => onPatch({ echo: { ...echo, dtdvgMm: n } })}
            />
            <Num
              label="Septum mm"
              value={echo.septumMm}
              onChange={(n) => onPatch({ echo: { ...echo, septumMm: n } })}
            />
            <Num
              label="PP mm"
              value={echo.posteriorWallMm}
              onChange={(n) => onPatch({ echo: { ...echo, posteriorWallMm: n } })}
            />
            <div className="space-y-1">
              <Label>OG indexée</Label>
              <Input
                value={echo.ogIndexed ?? ""}
                onChange={(e) => onPatch({ echo: { ...echo, ogIndexed: e.target.value || null } })}
              />
            </div>
          </div>
        </fieldset>
        <fieldset className="border-border bg-card space-y-3 rounded-2xl border p-4">
          <legend className="px-1 text-sm font-extrabold">VD / pressions / VCI</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Num
              label="TAPSE mm"
              value={echo.tapseMm}
              onChange={(n) => onPatch({ echo: { ...echo, tapseMm: n } })}
            />
            <Num
              label="S' VD cm/s"
              value={echo.sPrimeVdCms}
              onChange={(n) => onPatch({ echo: { ...echo, sPrimeVdCms: n } })}
            />
            <Num
              label="PAPS mmHg"
              value={echo.papsMmHg}
              onChange={(n) => onPatch({ echo: { ...echo, papsMmHg: n } })}
            />
            <Num
              label="Vmax IT m/s"
              value={echo.vmaxItMs}
              onChange={(n) => onPatch({ echo: { ...echo, vmaxItMs: n } })}
            />
            <Num
              label="E/e'"
              value={echo.eOverEPrime}
              onChange={(n) => onPatch({ echo: { ...echo, eOverEPrime: n } })}
            />
            <div className="space-y-1">
              <Label>VCI</Label>
              <Input
                value={echo.vci ?? ""}
                onChange={(e) => onPatch({ echo: { ...echo, vci: e.target.value || null } })}
              />
            </div>
            <div className="space-y-1">
              <Label>Péricarde</Label>
              <Input
                value={echo.pericarde ?? ""}
                onChange={(e) => onPatch({ echo: { ...echo, pericarde: e.target.value || null } })}
              />
            </div>
          </div>
        </fieldset>
        <fieldset className="border-border bg-card space-y-3 rounded-2xl border p-4">
          <legend className="px-1 text-sm font-extrabold">Valves (qualitatif)</legend>
          <div className="grid gap-3 sm:grid-cols-4">
            {(
              [
                ["im", "IM"],
                ["ia", "IA"],
                ["rao", "RAo"],
                ["it", "IT"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  value={echo[key] ?? ""}
                  onChange={(e) => onPatch({ echo: { ...echo, [key]: e.target.value || null } })}
                  placeholder="Non renseigné"
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="echo-valves-comment">Commentaire valves</Label>
            <Textarea
              id="echo-valves-comment"
              rows={2}
              value={echo.valvesComment ?? ""}
              onChange={(e) =>
                onPatch({ echo: { ...echo, valvesComment: e.target.value || null } })
              }
              placeholder=""
            />
          </div>
        </fieldset>
        <div className="space-y-1">
          <Label htmlFor="echo-conclusion">Conclusion échographique</Label>
          <Textarea
            id="echo-conclusion"
            rows={4}
            value={echo.conclusion ?? ""}
            onChange={(e) => onPatch({ echo: { ...echo, conclusion: e.target.value || null } })}
            placeholder=""
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            render={<Link href={`/consultations/${consultationId}/aorte`} />}
          >
            Aorte →
          </Button>
        </div>
      </section>
    );
  }

  if (rubrique === "aorte") {
    return <AortaRubric aorta={d.aorta} pending={pending} onPatch={onPatch} />;
  }

  if (rubrique === "epreuve") {
    const e = d.effort;
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">13 · Épreuve d&apos;effort</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Protocole</Label>
            <Input
              value={e.protocol ?? ""}
              onChange={(ev) => onPatch({ effort: { ...e, protocol: ev.target.value || null } })}
            />
          </div>
          <Num
            label="FC max"
            value={e.maxFc}
            onChange={(n) => onPatch({ effort: { ...e, maxFc: n } })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="effort-symptoms">Symptômes</Label>
          <Textarea
            id="effort-symptoms"
            rows={2}
            value={e.symptoms ?? ""}
            onChange={(ev) => onPatch({ effort: { ...e, symptoms: ev.target.value || null } })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="effort-conclusion">Conclusion</Label>
          <Textarea
            id="effort-conclusion"
            rows={3}
            value={e.conclusion ?? ""}
            onChange={(ev) => onPatch({ effort: { ...e, conclusion: ev.target.value || null } })}
          />
        </div>
      </section>
    );
  }

  if (rubrique === "coronaires" || rubrique === "imagerie") {
    const isCoro = rubrique === "coronaires";
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">
          {isCoro ? "11 · Coronaires / imagerie" : "14 · Imagerie complémentaire"}
        </h2>
        {isCoro ? (
          <>
            <div className="space-y-1">
              <Label>Modalité</Label>
              <Input
                value={d.coronaires.modality ?? ""}
                onChange={(e) =>
                  onPatch({
                    coronaires: { ...d.coronaires, modality: e.target.value || null },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>CAD-RADS</Label>
              <Input
                value={d.coronaires.cadRads ?? ""}
                onChange={(e) =>
                  onPatch({
                    coronaires: { ...d.coronaires, cadRads: e.target.value || null },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="coronaires-constatations">Constatations</Label>
              <Textarea
                id="coronaires-constatations"
                rows={4}
                value={d.coronaires.findings ?? ""}
                onChange={(e) =>
                  onPatch({
                    coronaires: { ...d.coronaires, findings: e.target.value || null },
                  })
                }
                placeholder=""
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Modalité</Label>
                <Input
                  value={d.imagerie.modality ?? ""}
                  onChange={(e) =>
                    onPatch({
                      imagerie: { ...d.imagerie, modality: e.target.value || null },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={d.imagerie.datedAt ?? ""}
                  onChange={(e) =>
                    onPatch({
                      imagerie: { ...d.imagerie, datedAt: e.target.value || null },
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="imagerie-conclusion">Conclusion</Label>
              <Textarea
                id="imagerie-conclusion"
                rows={4}
                value={d.imagerie.conclusion ?? ""}
                onChange={(e) =>
                  onPatch({
                    imagerie: { ...d.imagerie, conclusion: e.target.value || null },
                  })
                }
                placeholder=""
              />
            </div>
          </>
        )}
        <FileUploadPanel
          patientId={patient.id}
          encounterId={draft.encounterId}
          label="Joindre un compte rendu externe"
        />
      </section>
    );
  }

  if (rubrique === "rythmologie") {
    const r = d.rythmologie;
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">12 · Rythmologie / PM</h2>
        <div className="space-y-1">
          <Label>Arythmie</Label>
          <Input
            value={r.arrhythmia ?? ""}
            onChange={(e) => onPatch({ rythmologie: { ...r, arrhythmia: e.target.value || null } })}
          />
        </div>
        <div className="space-y-1">
          <Label>Dispositif</Label>
          <Input
            value={r.device ?? ""}
            onChange={(e) => onPatch({ rythmologie: { ...r, device: e.target.value || null } })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rythmologie-holter">Résumé Holter</Label>
          <Textarea
            id="rythmologie-holter"
            rows={3}
            value={r.holterSummary ?? ""}
            onChange={(e) =>
              onPatch({ rythmologie: { ...r, holterSummary: e.target.value || null } })
            }
            placeholder=""
          />
        </div>
      </section>
    );
  }

  if (rubrique === "cloture") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">20 · Clôture &amp; facturation</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          La clôture verrouille le brouillon (lecture seule). La facturation détaillée arrivera dans
          un lot ultérieur.
        </p>
        <p className="text-sm">
          Statut : <strong>{draft.status === "cloturee" ? "clôturée" : "brouillon ouvert"}</strong>
        </p>
        {draft.status === "cloturee" ? (
          <p className="text-success text-sm font-semibold">
            Cette consultation est déjà clôturée.
          </p>
        ) : (
          <Button type="button" disabled={pending || readOnly} onClick={onClose}>
            Clôturer la consultation
          </Button>
        )}
        <p>
          <Link
            href={`/patients/${patient.id}`}
            className="text-primary text-sm font-semibold underline-offset-2 hover:underline"
          >
            Retour au dossier patient
          </Link>
        </p>
      </section>
    );
  }

  if (rubrique === "synthese") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">16 · Synthèse / décisions</h2>
        <p className="text-muted-foreground text-sm">
          Texte libre — aucune phrase générée automatiquement. Rappel allergies patient ci-dessus.
        </p>
        <Textarea
          aria-label="Synthèse et décisions"
          rows={8}
          value={d.synthesis ?? ""}
          disabled={pending || readOnly}
          onChange={(e) => onPatch({ synthesis: e.target.value || null })}
          placeholder="Synthèse clinique et décisions du jour…"
        />
      </section>
    );
  }

  if (rubrique === "examens-complementaires") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">18 · Examens complémentaires</h2>
        <ExamOrdersWorkspace
          value={d.examOrders ?? emptyExamOrdersDraft()}
          disabled={pending || readOnly}
          flagEnabled={examOrdersEnabled}
          onChange={(examOrders) => onPatch({ examOrders })}
        />
      </section>
    );
  }

  if (rubrique === "transmissions") {
    return (
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">19 · Transmissions</h2>
        <p className="text-muted-foreground text-sm">
          Notes pour l&apos;équipe du cabinet. Pour la surveillance hospitalière / IDE, utilisez le
          module{" "}
          <Link href="/hospitalisation" className="text-primary font-semibold underline">
            Hospitalisation
          </Link>
          .
        </p>
        <Textarea
          aria-label="Transmissions"
          rows={6}
          value={d.transmissions ?? ""}
          disabled={pending || readOnly}
          onChange={(e) => onPatch({ transmissions: e.target.value || null })}
          placeholder="Transmission libre…"
        />
      </section>
    );
  }

  return (
    <section className="surface-card p-6 text-sm">
      <p className="font-bold">Rubrique « {rubrique} »</p>
      <p className="text-muted-foreground mt-2">
        Contenu détaillé dans un lot ultérieur. Aucune valeur préremplie.
      </p>
    </section>
  );
}

function Num({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") onChange(null);
          else {
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : null);
          }
        }}
      />
    </div>
  );
}

function LabRubric({
  labs,
  patientId,
  encounterId,
  pending,
  onPatch,
}: {
  labs: LabPanel[];
  patientId: string;
  encounterId: string;
  pending: boolean;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = labs.length === 0 ? 0 : Math.min(activeIdx, labs.length - 1);
  const panel = labs[safeIdx];

  const updateActive = (mutator: (p: LabPanel) => LabPanel) => {
    const next = labs.map((p, i) => (i === safeIdx ? mutator(p) : p));
    onPatch({ labs: next });
  };

  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">7 · Biologie</h2>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            const id = uuidv7();
            const today = new Date().toISOString().slice(0, 10);
            onPatch({ labs: [...labs, emptyLabPanel(id, today)] });
            setActiveIdx(labs.length);
          }}
        >
          Ajouter un prélèvement
        </Button>
      </div>
      {labs.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Prélèvements">
          {labs.map((p, i) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={i === safeIdx ? "default" : "outline"}
              aria-pressed={i === safeIdx}
              onClick={() => setActiveIdx(i)}
            >
              Prélèvement {i + 1}
              {p.sampledAt ? ` · ${p.sampledAt.split("-").reverse().join("/")}` : ""}
            </Button>
          ))}
        </div>
      ) : null}
      {!panel ? (
        <p className="text-muted-foreground text-sm">Aucun résultat — non renseigné.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Date de prélèvement</Label>
              <Input
                type="date"
                value={panel.sampledAt}
                disabled={pending}
                onChange={(e) => updateActive((p) => ({ ...p, sampledAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Provenance</Label>
              <Input
                value={panel.source ?? ""}
                disabled={pending}
                onChange={(e) => updateActive((p) => ({ ...p, source: e.target.value || null }))}
                placeholder="Labo / service"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {panel.rows.map((row, ri) => {
              const meta = LAB_CODES.find((c) => c.code === row.code);
              const num =
                typeof row.value === "number"
                  ? row.value
                  : row.value != null && row.value !== ""
                    ? Number(row.value)
                    : null;
              const range =
                num != null && Number.isFinite(num)
                  ? checkLabRange(row.code, num)
                  : { ok: true as const };
              return (
                <div key={row.code} className="space-y-1">
                  <Label>
                    {meta?.label ?? row.code} ({row.unit}) · {row.kind}
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    disabled={pending}
                    value={row.value ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const value =
                        raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : raw;
                      updateActive((p) => ({
                        ...p,
                        rows: p.rows.map((r, j) =>
                          j === ri ? { ...r, value, kind: "mesure" as const } : r,
                        ),
                      }));
                    }}
                  />
                  {!range.ok ? <p className="text-destructive text-xs">{range.message}</p> : null}
                </div>
              );
            })}
          </div>
          <div className="space-y-1">
            <Label>Commentaire</Label>
            <Textarea
              rows={2}
              disabled={pending}
              value={panel.comment ?? ""}
              onChange={(e) => updateActive((p) => ({ ...p, comment: e.target.value || null }))}
            />
          </div>
        </div>
      )}
      <FileUploadPanel
        patientId={patientId}
        encounterId={encounterId}
        label="Joindre un compte rendu de biologie"
      />
    </section>
  );
}

function AortaRubric({
  aorta,
  pending,
  onPatch,
}: {
  aorta: AortaDraft;
  pending: boolean;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const evals = evaluateAortaDraft(aorta);
  return (
    <section className="surface-card space-y-4 p-5">
      <h2 className="text-lg font-extrabold">10 · Aorte</h2>
      <div className="space-y-1">
        <Label>Date des mesures</Label>
        <Input
          type="date"
          value={aorta.datedAt ?? ""}
          disabled={pending}
          onChange={(e) => onPatch({ aorta: { ...aorta, datedAt: e.target.value || null } })}
        />
      </div>
      <div className="space-y-3">
        {AORTA_SEGMENTS.map(({ segment, label }) => {
          const entry =
            aorta.segments.find((s) => s.segment === segment) ?? emptyAortaSegment(segment);
          const ev = evals.find((e) => e.segment === segment);
          return (
            <div
              key={segment}
              className="border-border grid gap-2 rounded-xl border p-3 sm:grid-cols-4"
            >
              <p className="text-sm font-bold sm:col-span-4">{label}</p>
              <Num
                label="Diamètre (mm)"
                value={entry.notVisualized ? null : entry.diameterMm}
                onChange={(n) => {
                  const segments = aorta.segments.map((s) =>
                    s.segment === segment ? { ...s, diameterMm: n, notVisualized: false } : s,
                  );
                  onPatch({ aorta: { ...aorta, segments } });
                }}
              />
              <div className="space-y-1">
                <Label>Méthode</Label>
                <Input
                  value={entry.method ?? ""}
                  onChange={(e) => {
                    const segments = aorta.segments.map((s) =>
                      s.segment === segment ? { ...s, method: e.target.value || null } : s,
                    );
                    onPatch({ aorta: { ...aorta, segments } });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Qualité</Label>
                <Input
                  value={entry.quality ?? ""}
                  onChange={(e) => {
                    const segments = aorta.segments.map((s) =>
                      s.segment === segment ? { ...s, quality: e.target.value || null } : s,
                    );
                    onPatch({ aorta: { ...aorta, segments } });
                  }}
                />
              </div>
              <label className="flex items-end gap-2 pb-1 text-sm">
                <input
                  type="checkbox"
                  checked={entry.notVisualized}
                  onChange={(e) => {
                    const segments = aorta.segments.map((s) =>
                      s.segment === segment
                        ? {
                            ...s,
                            notVisualized: e.target.checked,
                            diameterMm: e.target.checked ? null : s.diameterMm,
                          }
                        : s,
                    );
                    onPatch({ aorta: { ...aorta, segments } });
                  }}
                />
                Non visualisé
              </label>
              {ev ? (
                <p className="text-muted-foreground text-xs sm:col-span-4">
                  {ev.score.rationale[0]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="space-y-1">
        <Label htmlFor="aorte-conclusion">Conclusion</Label>
        <Textarea
          id="aorte-conclusion"
          rows={3}
          value={aorta.conclusion ?? ""}
          onChange={(e) => onPatch({ aorta: { ...aorta, conclusion: e.target.value || null } })}
          placeholder=""
        />
        <p className="text-muted-foreground text-xs">
          Texte libre — jamais généré automatiquement.
        </p>
      </div>
    </section>
  );
}

function FileUploadPanel({
  patientId,
  encounterId,
  label,
}: {
  patientId: string;
  encounterId: string;
  label: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [files, setFiles] = useState<
    { id: string; originalNameSanitized: string; status: string }[]
  >([]);

  useEffect(() => {
    void listPatientFilesAction(patientId).then((r) => {
      if (r.ok) {
        setFiles(
          r.files.map((f) => ({
            id: f.id,
            originalNameSanitized: f.originalNameSanitized,
            status: f.status,
          })),
        );
      }
    });
  }, [patientId, status]);

  return (
    <div className="border-border space-y-2 rounded-xl border border-dashed p-3">
      <p className="text-sm font-bold">{label}</p>
      <p className="text-muted-foreground text-xs">
        PDF / JPEG / PNG / WebP · 20 Mo max · antivirus obligatoire · URL 5 min
      </p>
      <Input
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void (async () => {
            setStatus("en_analyse");
            const buf = new Uint8Array(await file.arrayBuffer());
            const init = await initFileUploadAction({
              patientId,
              encounterId,
              originalName: file.name,
              claimedMime: file.type || "application/octet-stream",
              sizeBytes: file.size,
            });
            if (!init.ok) {
              setStatus(init.error);
              toast.error(init.error);
              return;
            }
            let binary = "";
            for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
            const b64 = btoa(binary);
            const done = await completeFileUploadAction({
              token: init.uploadToken,
              claimedMime: file.type,
              contentBase64: b64,
            });
            if (!done.ok) {
              setStatus(done.error);
              toast.error(done.error);
              return;
            }
            setStatus(`disponible · ${done.file.originalNameSanitized}`);
            toast.success("Fichier disponible après analyse");
          })();
        }}
      />
      {status ? <p className="text-xs">{status}</p> : null}
      {files.length > 0 ? (
        <ul className="text-muted-foreground space-y-1 text-xs">
          {files.map((f) => (
            <li key={f.id}>
              {f.originalNameSanitized} · {f.status}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
