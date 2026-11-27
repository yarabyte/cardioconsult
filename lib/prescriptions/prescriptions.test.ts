import { describe, expect, it, beforeEach } from "vitest";
import { can } from "@/lib/rbac";
import { assertTemplateHasNoDoses, linesFromTemplate } from "./templates";
import { buildPrescriptionChecks } from "./checks";
import { getDrugDatabase } from "@/server/drugs/provider";
import {
  applyTemplate,
  prescriptionMemoryStore,
  saveLines,
  validatePrescription,
} from "@/server/services/prescriptions/lifecycle";

describe("T-17 — modèles sans dose", () => {
  it("insère des DCI sans dosage ni posologie", () => {
    const lines = linesFromTemplate("ic_base");
    expect(lines.length).toBeGreaterThan(0);
    expect(assertTemplateHasNoDoses(lines)).toBe(true);
    for (const l of lines) {
      expect(l.dosage).toBeNull();
      expect(l.posology).toBe("");
      expect(l.dci).toBeTruthy();
    }
  });
});

describe("RBAC ordonnance", () => {
  it("refuse prescription.write/validate à l'infirmière même avec surcharge", () => {
    expect(
      can({ role: "INFIRMIERE" }, "prescription.write", { nurseExtra: ["prescription.write"] }),
    ).toBe(false);
    expect(can({ role: "INFIRMIERE" }, "prescription.validate")).toBe(false);
    expect(can({ role: "MEDECIN" }, "prescription.write")).toBe(true);
  });
});

describe("Vérifications allergies", () => {
  it("affiche un rappel si allergie renseignée", () => {
    const items = buildPrescriptionChecks({
      allergies: ["pénicilline"],
      dfg: { value: 54, datedAt: "2026-11-21" },
      kaliemie: { value: 4.9, datedAt: "2026-11-21" },
      pregnancy: null,
      interactionMessage: "Base non connectée",
    });
    const all = items.find((i) => i.id === "allergies")!;
    expect(all.level).toBe("alerte");
    expect(all.detail).toContain("pénicilline");
  });
});

const RX_TENANT = "test:prescriptions";

describe("Validation + immutabilité", () => {
  beforeEach(() => {
    prescriptionMemoryStore.clear(RX_TENANT);
    prescriptionMemoryStore.create(RX_TENANT, {
      id: "ord-dupont-1",
      patientId: "patient-1",
      encounterId: null,
      status: "brouillon",
      lines: [],
      aldLayout: true,
      allergiesCheckedAt: null,
      dfgCheckedAt: null,
      pregnancyNotedAt: null,
      validatedAt: null,
      validatedBy: null,
      duplicatedFromId: null,
    });
  });

  it("refuse la validation sans step-up", async () => {
    await applyTemplate(RX_TENANT, "ord-dupont-1", "ic_base", "u1");
    const r = await validatePrescription(RX_TENANT, "ord-dupont-1", "u1", { stepUpValid: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("step_up_required");
  });

  it("ordonnance validée non modifiable", async () => {
    await applyTemplate(RX_TENANT, "ord-dupont-1", "ic_base", "u1");
    const ok = await validatePrescription(RX_TENANT, "ord-dupont-1", "u1", { stepUpValid: true });
    expect(ok.ok).toBe(true);
    const edit = await saveLines(RX_TENANT, "ord-dupont-1", [], true, "u1");
    expect(edit.ok).toBe(false);
  });
});

describe("DrugDatabase", () => {
  it("interactions NotAvailable", async () => {
    const db = getDrugDatabase();
    expect(db.id).toBe("NotAvailable");
    const r = await db.checkInteractions(["bisoprolol"]);
    expect(r.status).toBe("not_available");
    expect(r.message).toMatch(/non connectée/i);
  });
});

describe("format-line — affichage dossier", () => {
  it("parse le JSON extras et formate dosage / posologie", async () => {
    const { formatLineDosage, formatLinePosology, isOpaqueActorId, parsePrescriptionLineExtras } =
      await import("./format-line");

    const extras = parsePrescriptionLineExtras(
      JSON.stringify({
        dosage: "3 ml",
        form: null,
        route: null,
        frequency: null,
        duration: "5 jours",
        quantity: null,
        renewals: null,
        remarks: null,
        ald: false,
      }),
    );
    expect(formatLineDosage(extras)).toBe("3 ml");
    expect(formatLinePosology({ posology: null, extras })).toBe("5 jours");
    expect(formatLinePosology({ posology: "1 comprimé matin et soir", extras })).toBe(
      "1 comprimé matin et soir · 5 jours",
    );
    expect(isOpaqueActorId("KeB1I3xaLWIR9UFOBNAdPLgEhHeuKvLL")).toBe(true);
    expect(isOpaqueActorId("Dr Claire Martin")).toBe(false);
  });
});
