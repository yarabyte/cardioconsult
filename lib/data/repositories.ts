import type {
  Appointment,
  Bed,
  Document,
  Encounter,
  Member,
  Patient,
  Prescription,
  Tenant,
  Vitals,
} from "@/types/domain";
import { mockBeds, mockMembers, mockTenants } from "@/lib/mock/admin";
import { mockPatients, TENANT_MARTIN_ID } from "@/lib/mock/patients";
import { mockDelay } from "./delay";

export interface PatientRepository {
  list(tenantId: string, query?: string): Promise<Patient[]>;
  getById(id: string): Promise<Patient | null>;
}

export interface TenantRepository {
  list(query?: string): Promise<Tenant[]>;
  getBySlug(slug: string): Promise<Tenant | null>;
  listMembers(tenantId: string): Promise<Member[]>;
}

export interface EncounterRepository {
  listByPatient(patientId: string): Promise<Encounter[]>;
  getById(id: string): Promise<Encounter | null>;
}

export interface DocumentRepository {
  getById(id: string): Promise<Document | null>;
  getPrescription(id: string): Promise<Prescription | null>;
}

export interface AgendaRepository {
  listWeek(tenantId: string): Promise<Appointment[]>;
}

export interface HospitalRepository {
  listBeds(tenantId: string): Promise<Bed[]>;
}

export interface VitalsRepository {
  listByPatient(patientId: string): Promise<Vitals[]>;
}

const encounters: Encounter[] = [
  {
    id: "enc-ett-lefevre",
    patientId: "CC-000231",
    datedAt: "2026-11-23",
    motif: "ETT · suivi aorte",
    type: "ETT",
    status: "en_cours",
    rubric: "echocardiographie",
  },
  {
    id: "enc-scores-girard",
    patientId: "CC-000097",
    datedAt: "2026-11-23",
    motif: "FA · anticoagulation",
    type: "Consultation",
    status: "a_venir",
    rubric: "scores",
  },
];

const documents: Document[] = [
  {
    id: "cr-dupont-1",
    patientId: "CC-000184",
    encounterId: "enc-dupont",
    kind: "compte_rendu",
    title: "Compte rendu — suivi IC",
    status: "brouillon",
    version: 1,
    contentHtml: "<p>Compte rendu de consultation — données fictives.</p>",
    sourceModified: true,
    signedAt: null,
    signedBy: null,
    updatedAt: "2026-11-23T09:00:00+01:00",
  },
];

const prescriptions: Prescription[] = [
  {
    id: "ord-dupont-1",
    patientId: "CC-000184",
    status: "brouillon",
    lines: [],
    updatedAt: "2026-11-23T09:15:00+01:00",
  },
];

const appointments: Appointment[] = [
  { id: "a1", patientId: "CC-000184", patientLabel: "J. Dupont", day: "Lun 23", time: "08:30", motif: "Suivi IC", detail: "terminé", status: "Terminée" },
  { id: "a2", patientId: "CC-000231", patientLabel: "R. Lefèvre", day: "Lun 23", time: "09:00", motif: "ETT", detail: "en salle", status: "En salle" },
  { id: "a3", patientId: "CC-000412", patientLabel: "M. Benali", day: "Lun 23", time: "09:30", motif: "Préop", detail: "arrivé", status: "Salle d'attente" },
  { id: "a4", patientId: "CC-000097", patientLabel: "A. Girard", day: "Lun 23", time: "10:00", motif: "FA", detail: "", status: "À venir" },
  { id: "a5", patientId: "CC-001205", patientLabel: "L. Moreau", day: "Lun 23", time: "10:30", motif: "Douleur thoracique", detail: "", status: "À venir" },
  { id: "a6", patientId: "CC-000655", patientLabel: "H. Rousseau", day: "Lun 23", time: "11:00", motif: "HTA résistante", detail: "MAPA à récupérer", status: "À venir" },
  { id: "a7", patientId: null, patientLabel: "Lecture Holters", day: "Lun 23", time: "12:00", motif: "Administratif", detail: "Bloc administratif", status: "" },
  { id: "a8", patientId: "CC-000318", patientLabel: "P. Fontaine", day: "Mar 24", time: "11:00", motif: "Post-SCA", detail: "", status: "À venir" },
  { id: "a9", patientId: "CC-000529", patientLabel: "D. Petit", day: "Jeu 26", time: "08:30", motif: "IC · titration", detail: "", status: "À venir" },
  { id: "a10", patientId: "CC-000072", patientLabel: "N. Garnier", day: "Jeu 26", time: "09:00", motif: "Valvulopathie", detail: "", status: "À venir" },
];

const vitalsArnaud: Vitals[] = [
  {
    id: "v1",
    patientId: "hosp-arnaud",
    recordedAt: "2026-11-23T08:00:00+01:00",
    authorLabel: "S. Laurent",
    tasMmHg: 128,
    tadMmHg: 76,
    fcBpm: 82,
    spo2Pct: 97,
    temperatureC: 36.8,
    frPerMin: 18,
    weightKg: 71.4,
    eva: 1,
  },
  {
    id: "v2",
    patientId: "hosp-arnaud",
    recordedAt: "2026-11-23T04:00:00+01:00",
    authorLabel: "IDE de nuit",
    tasMmHg: 126,
    tadMmHg: 74,
    fcBpm: 78,
    spo2Pct: 96,
    temperatureC: null,
    frPerMin: null,
    weightKg: null,
    eva: null,
  },
];

export const MockPatientRepository: PatientRepository = {
  async list(tenantId, query) {
    await mockDelay();
    let list = mockPatients.filter((p) => p.tenantId === tenantId);
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.pathologies.some((x) => x.toLowerCase().includes(q)),
      );
    }
    return list;
  },
  async getById(id) {
    await mockDelay();
    return mockPatients.find((p) => p.id === id) ?? null;
  },
};

export const MockTenantRepository: TenantRepository = {
  async list(query) {
    await mockDelay();
    if (!query?.trim()) return mockTenants;
    const q = query.trim().toLowerCase();
    return mockTenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.includes(q),
    );
  },
  async getBySlug(slug) {
    await mockDelay();
    return mockTenants.find((t) => t.slug === slug) ?? null;
  },
  async listMembers(tenantId) {
    await mockDelay();
    return mockMembers.filter((m) => m.tenantId === tenantId);
  },
};

export const MockEncounterRepository: EncounterRepository = {
  async listByPatient(patientId) {
    await mockDelay();
    return encounters.filter((e) => e.patientId === patientId);
  },
  async getById(id) {
    await mockDelay();
    return encounters.find((e) => e.id === id) ?? null;
  },
};

export const MockDocumentRepository: DocumentRepository = {
  async getById(id) {
    await mockDelay();
    return documents.find((d) => d.id === id) ?? null;
  },
  async getPrescription(id) {
    await mockDelay();
    return prescriptions.find((p) => p.id === id) ?? null;
  },
};

export const MockAgendaRepository: AgendaRepository = {
  async listWeek(tenantId) {
    await mockDelay();
    if (tenantId !== TENANT_MARTIN_ID) return [];
    return appointments;
  },
};

export const MockHospitalRepository: HospitalRepository = {
  async listBeds(tenantId) {
    await mockDelay();
    if (tenantId !== TENANT_MARTIN_ID) return [];
    return mockBeds;
  },
};

export const MockVitalsRepository: VitalsRepository = {
  async listByPatient(patientId) {
    await mockDelay();
    return vitalsArnaud.filter((v) => v.patientId === patientId);
  },
};
