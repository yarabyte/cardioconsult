import { describe, expect, it } from "vitest";
import { demoEraseSample } from "./crypto-erasure";
import {
  EXPORT_SCHEMA_VERSION,
  buildTenantExport,
  openExportArchive,
  reimportTenantExport,
  sealExportArchive,
} from "./export-format";
import { generateDek } from "@/server/crypto/envelope";
import type { Patient } from "@/types/domain";
import { listDueDossiers } from "./repository";

const syntheticPatients: Patient[] = [
  {
    id: "p-export-1",
    tenantId: "tenant-martin",
    firstName: "Jeanne",
    lastName: "Dupont",
    birthDate: "1948-03-12",
    sex: "F",
    pathologies: [],
    fevgPct: 47,
    lastConsultDate: "2026-11-01",
    nextAppointmentDate: null,
    alertLabel: null,
    allergies: [],
    heightM: 1.62,
    weightKg: 62,
    insStatus: "non_qualifiee",
    flags: [],
  },
  {
    id: "p-export-2",
    tenantId: "tenant-martin",
    firstName: "Robert",
    lastName: "Lefèvre",
    birthDate: "1955-07-22",
    sex: "H",
    pathologies: [],
    fevgPct: null,
    lastConsultDate: null,
    nextAppointmentDate: null,
    alertLabel: null,
    allergies: [],
    heightM: null,
    weightKg: null,
    insStatus: "non_qualifiee",
    flags: [],
  },
  {
    id: "CC-000184",
    tenantId: "tenant-martin",
    firstName: "Annie",
    lastName: "Girard",
    birthDate: "1940-01-01",
    sex: "F",
    pathologies: [],
    fevgPct: null,
    lastConsultDate: null,
    nextAppointmentDate: null,
    alertLabel: null,
    allergies: [],
    heightM: null,
    weightKg: null,
    insStatus: "non_qualifiee",
    flags: [],
  },
];

describe("P18 — RGPD opérationnel", () => {
  it("seal/open archive round-trip", () => {
    const dek = generateDek();
    const payload = buildTenantExport("tenant-martin", syntheticPatients.slice(0, 2), "tenant");
    const sealed = sealExportArchive(dek, payload);
    const opened = openExportArchive(dek, sealed.ciphertext);
    expect(reimportTenantExport(opened).patientCount).toBe(2);
    expect(opened.manifest.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
  });

  it("crypto-effacement → données illisibles", () => {
    const sample = demoEraseSample("tenant-martin");
    expect(sample.unreadable).toBe(true);
    expect(sample.certificate.method).toBe("dek_destroy");
  });

  it("conservation : pas de purge auto, alerte échéance", () => {
    const due = listDueDossiers(
      "tenant-martin",
      syntheticPatients.map((p) =>
        p.id === "CC-000184" ? { ...p, archivedAt: "2000-01-15T10:00:00+01:00" } : p,
      ),
      20,
    );
    expect(due.some((d) => d.patientId === "CC-000184")).toBe(true);
  });
});
