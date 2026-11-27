import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import {
  clinicalAlerts,
  documents,
  documentVersions,
  featureFlags,
  patients,
  prescriptions,
  settings,
} from "@/db/tenant/schema";
import { emptyTipDoc } from "@/lib/documents/tiptap-types";
import type { DocumentWorkflowPayload } from "@/lib/documents/record";
import { defaultPrescriptionMeta } from "@/lib/prescriptions/record";
import { CLINICAL_FEATURE_FLAGS } from "@/lib/clinical/feature-flags";
import type { TenantDb } from "@/server/db/tenant-db";
import { withTenantDb } from "@/server/db/tenant-db";
import { upsertClinicalAlert } from "@/server/services/clinical/alerts";
import { seedAgendaDemoOnDb } from "./seed-agenda-demo";

const DEMO_DOC_ID = "cr-dupont-1";
const DEMO_RX_ID = "ord-dupont-1";
const DEMO_ALERT_ID = "alert-aorte-asc-60";

/** Compte rendu, ordonnance et alerte démo (ids stables pour la recette). */
export async function seedDemoWorkflowOnDb(db: TenantDb): Promise<void> {
  for (const key of CLINICAL_FEATURE_FLAGS) {
    await db
      .insert(featureFlags)
      .values({ key, enabled: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: { enabled: true, updatedAt: new Date() },
      });
  }

  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.dossierNumber, "CC-000184"))
    .limit(1);
  if (!patient) {
    // Fallback : premier patient du cabinet (évite un seed silencieux sans CR).
    [patient] = await db.select().from(patients).limit(1);
  }
  if (!patient) return;

  const [existingDoc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, DEMO_DOC_ID))
    .limit(1);
  if (!existingDoc) {
    const generated = emptyTipDoc();
    generated.content = [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Compte rendu de consultation de cardiologie" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Motif : suivi d'une insuffisance cardiaque — données fictives.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Auscultation : non renseigné" }],
      },
    ];
    const workflow: DocumentWorkflowPayload = {
      templateId: "ic",
      sections: [
        "motif",
        "antecedents",
        "examen",
        "examens_comp",
        "scores",
        "conclusion",
        "conduite",
      ],
      generated,
      edited: structuredClone(generated),
      sourceModified: true,
      physicianEditPreserved: true,
    };
    const now = new Date("2026-11-23T08:00:00.000Z");
    await db.insert(documents).values({
      id: DEMO_DOC_ID,
      patientId: patient.id,
      encounterId: null,
      kind: "compte_rendu",
      title: "Compte rendu — suivi IC",
      status: "brouillon",
      docVersion: 3,
      contentEnc: JSON.stringify(workflow),
      sourceSnapshot: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(documentVersions).values({
      id: uuidv7(),
      documentId: DEMO_DOC_ID,
      version: 3,
      status: "brouillon",
      contentEnc: JSON.stringify({ content: structuredClone(generated) }),
      reason: "édition initiale",
      createdAt: now,
      createdBy: "seed",
    });
  }

  const [existingRx] = await db
    .select({ id: prescriptions.id })
    .from(prescriptions)
    .where(eq(prescriptions.id, DEMO_RX_ID))
    .limit(1);
  if (!existingRx) {
    const now = new Date("2026-11-23T08:15:00.000Z");
    await db.insert(prescriptions).values({
      id: DEMO_RX_ID,
      patientId: patient.id,
      encounterId: null,
      status: "brouillon",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(settings).values({
      key: `prescription_meta:${DEMO_RX_ID}`,
      value: { ...defaultPrescriptionMeta(), aldLayout: true },
      updatedAt: now,
    });
  }

  const [existingAlert] = await db
    .select({ id: clinicalAlerts.id })
    .from(clinicalAlerts)
    .where(eq(clinicalAlerts.id, DEMO_ALERT_ID))
    .limit(1);
  if (!existingAlert) {
    await upsertClinicalAlert(db, {
      id: DEMO_ALERT_ID,
      patientId: patient.id,
      encounterId: null,
      level: "potentiellement_urgent",
      title: "Aorte ascendante · alerte de mesure",
      message:
        "Diamètre 60 mm — discussion spécialisée / imagerie de confirmation suggérée. Pas de décision automatisée.",
      ruleId: "AO-ASC-01",
      ruleVersion: "0.1",
      details: ["Segment ascendante", "Seuil urgent ≥ 55 mm (configurable)"],
    });
  }

  await seedAgendaDemoOnDb(db);
}

export async function seedDemoWorkflowArtifacts(tenantId: string): Promise<void> {
  await withTenantDb(tenantId, (db) => seedDemoWorkflowOnDb(db));
}
