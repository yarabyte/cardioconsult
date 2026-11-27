import { describe, expect, it } from "vitest";
import { buildMinimalTextPdf, buildPrescriptionHtml, renderPrescriptionPdf } from "./pdf";
import type { RxRecord } from "@/lib/prescriptions/record";

const rx: RxRecord = {
  id: "ord-test-1",
  patientId: "p1",
  encounterId: null,
  status: "valide",
  lines: [
    {
      id: "l1",
      drug: "bisoprolol",
      dci: "bisoprolol",
      dosage: "5 mg",
      form: null,
      posology: "1 comprimé le matin",
      route: "Orale",
      frequency: null,
      duration: "1 an",
      quantity: "1",
      renewals: null,
      remarks: null,
      ald: false,
    },
  ],
  aldLayout: false,
  allergiesCheckedAt: null,
  dfgCheckedAt: null,
  pregnancyNotedAt: null,
  updatedAt: "2026-11-24T10:00:00.000Z",
  validatedAt: "2026-11-24T10:00:00.000Z",
  validatedBy: "u1",
  duplicatedFromId: null,
};

describe("PDF ordonnance", () => {
  it("génère un HTML avec les lignes", () => {
    const html = buildPrescriptionHtml({
      rx,
      patientLabel: "Henri-Mill FETCHOUANG",
      birthDate: "1975-09-28",
      prescriberName: "Dr Martin",
      rpps: "[RPPS déclaratif — non vérifié]",
      cabinetName: "Cabinet Martin",
    });
    expect(html).toContain("bisoprolol");
    expect(html).toContain("1 comprimé le matin");
    expect(html).toContain("Henri-Mill FETCHOUANG");
  });

  it("produit un PDF minimal avec en-tête %PDF", () => {
    const bytes = buildMinimalTextPdf(["Ordonnance", "bisoprolol 5 mg"]);
    const text = Buffer.from(bytes).toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("%%EOF");
    expect(text).toContain("bisoprolol");
  });

  it("renderPrescriptionPdf retourne des octets PDF (fallback sans Gotenberg)", async () => {
    const r = await renderPrescriptionPdf({
      rx,
      patientLabel: "Henri-Mill FETCHOUANG",
      birthDate: "1975-09-28",
      prescriberName: "Dr Martin",
      rpps: "non vérifié",
      cabinetName: "Cabinet Martin",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bytes.byteLength).toBeGreaterThan(200);
    expect(Buffer.from(r.bytes).toString("latin1").startsWith("%PDF")).toBe(true);
  });
});
