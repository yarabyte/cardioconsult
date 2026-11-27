import { describe, expect, it, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertNoAutoNegation, generateDraftFromSnapshot, tipDocToPlainText } from "./generate";
import { StructuredDocView } from "./render";
import { buildControlledHtml } from "@/server/services/documents/pdf";
import {
  amendDocument,
  documentMemoryStore,
  regenerateDocument,
  signDocument,
  updateEditedContent,
  validateDocument,
} from "@/server/services/documents/lifecycle";
import type { DocRecord } from "@/lib/documents/record";
import { para, type SourceSnapshot } from "./tiptap-types";
import { getSignatureProvider } from "@/server/signature/provider";

function snapshot(partial?: Partial<SourceSnapshot>): SourceSnapshot {
  return {
    capturedAt: "2026-11-23T10:00:00Z",
    encounterId: "enc-1",
    patientLabel: "Patient Fictif",
    dossierNumber: "CC-000001",
    birthDate: "1960-01-01",
    ageAtAct: 66,
    actDate: "2026-11-23",
    motif: "Suivi",
    history: null,
    clinicalExam: { auscultation: null, tas: 120, tad: 80, fc: null },
    ecg: {},
    echo: {},
    labs: {},
    scores: [],
    conclusion: null,
    conduite: null,
    ...partial,
  };
}

describe("Génération CR", () => {
  it("omet les vides / marque non renseigné sans négation auto", () => {
    const doc = generateDraftFromSnapshot(snapshot(), ["motif", "examen", "conclusion"]);
    const plain = tipDocToPlainText(doc);
    expect(plain).toContain("Motif");
    expect(plain).toContain("EXAMEN CLINIQUE");
    expect(plain).toContain("TA : 120/80 mmHg");
    // auscultation vide → omise (pas de négation « pas de… »)
    expect(plain.toLowerCase()).not.toContain("auscultation");
    expect(plain).toContain("Conclusion : non renseigné");
    expect(assertNoAutoNegation(plain)).toBe(true);
    expect(plain.toLowerCase()).not.toContain("pas de signe");
  });

  it("section entièrement vide → non renseigné", () => {
    const doc = generateDraftFromSnapshot(snapshot({ clinicalExam: {} }), ["examen"]);
    const plain = tipDocToPlainText(doc);
    expect(plain).toContain("Examen clinique : non renseigné");
  });
});

describe("XSS — script non exécuté", () => {
  it("rend un <script> comme texte", () => {
    const doc = {
      type: "doc" as const,
      content: [para('<script>alert("xss")</script>')],
    };
    const html = renderToStaticMarkup(createElement(StructuredDocView, { doc }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/<script>alert/);
  });

  it("PDF contrôlé échappe le HTML", () => {
    const doc = {
      type: "doc" as const,
      content: [para("<img src=x onerror=alert(1)>")],
    };
    const html = buildControlledHtml({
      documentId: "cr-1",
      version: 1,
      status: "brouillon",
      patientLabel: "Fictif",
      dossierNumber: "CC-1",
      actDate: "2026-11-23",
      header: {
        displayName: "Dr Test",
        specialty: "Cardio",
        cabinetName: "Cabinet",
        addressLine: "Paris",
        showDegrees: false,
        degrees: [],
        showRppsPlaceholder: false,
      },
      content: doc,
    });
    expect(html).toContain("&lt;img");
    expect(html).not.toMatch(/<img src=x/);
    expect(html).not.toMatch(/src=["']https?:/);
  });
});

const DOC_TENANT = "test:documents";

function seedDemoDocument() {
  const generated = {
    type: "doc" as const,
    content: [para("Brouillon initial")],
  };
  const doc: DocRecord = {
    id: "cr-dupont-1",
    patientId: "patient-1",
    encounterId: null,
    title: "CR test",
    status: "brouillon",
    version: 3,
    templateId: "ic",
    sections: ["motif", "examen"],
    sourceSnapshot: null,
    generated,
    edited: structuredClone(generated),
    sourceModified: false,
    physicianEditPreserved: true,
    signedAt: null,
    signedBy: null,
    updatedAt: new Date().toISOString(),
    versions: [],
  };
  documentMemoryStore.save(DOC_TENANT, doc);
}

describe("Cycle document + T-03", () => {
  beforeEach(() => {
    documentMemoryStore.clear(DOC_TENANT);
    seedDemoDocument();
  });

  it("préserve l'édition médecin après régénération", async () => {
    const id = "cr-dupont-1";
    const edited = {
      type: "doc" as const,
      content: [para("Édition médecin conservée")],
    };
    const saved = await updateEditedContent(DOC_TENANT, id, edited, "u1");
    expect(saved.ok).toBe(true);

    const regen = await regenerateDocument(
      DOC_TENANT,
      id,
      snapshot({ motif: "Nouveau motif source" }),
      ["motif", "examen"],
      "u1",
    );
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;
    expect(tipDocToPlainText(regen.previousEdit)).toContain("Édition médecin conservée");
    expect(tipDocToPlainText(regen.doc.edited)).toContain("Nouveau motif source");
    expect(regen.doc.versions.some((v) => v.reason?.includes("préservée"))).toBe(true);
  });

  it("document signé non modifiable ; SignatureProvider NotAvailable", async () => {
    const id = "cr-dupont-1";
    expect(getSignatureProvider().id).toBe("NotAvailable");
    await validateDocument(DOC_TENANT, id, "u1");
    const sign = await signDocument(DOC_TENANT, id, "u1");
    expect(sign.ok).toBe(false);
    if (!sign.ok) expect(sign.code).toBe("not_available");

    const doc = documentMemoryStore.get(DOC_TENANT, id)!;
    doc.status = "signe";
    documentMemoryStore.save(DOC_TENANT, doc);
    const edit = await updateEditedContent(
      DOC_TENANT,
      id,
      { type: "doc", content: [para("hack")] },
      "u1",
    );
    expect(edit.ok).toBe(false);

    const amend = await amendDocument(DOC_TENANT, id, "Correction orthographe", "u1");
    expect(amend.ok).toBe(true);
    if (amend.ok) expect(amend.doc.status).toBe("brouillon");
  });
});
