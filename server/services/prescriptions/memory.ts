import { uuidv7 } from "uuidv7";
import type { RxRecord } from "@/lib/prescriptions/record";

const byTenant = new Map<string, Map<string, RxRecord>>();

export function isMemoryTestTenant(tenantId: string): boolean {
  return tenantId.startsWith("test:");
}

function store(tenantId: string) {
  let m = byTenant.get(tenantId);
  if (!m) {
    m = new Map();
    byTenant.set(tenantId, m);
  }
  return m;
}

export const prescriptionMemoryStore = {
  get(tenantId: string, id: string) {
    return store(tenantId).get(id) ?? null;
  },
  list(tenantId: string) {
    return [...store(tenantId).values()];
  },
  findByEncounter(tenantId: string, encounterId: string) {
    return [...store(tenantId).values()].find((r) => r.encounterId === encounterId) ?? null;
  },
  save(tenantId: string, rx: RxRecord) {
    store(tenantId).set(rx.id, rx);
    return rx;
  },
  create(tenantId: string, partial: Omit<RxRecord, "id" | "updatedAt"> & { id?: string }) {
    const rx: RxRecord = {
      ...partial,
      id: partial.id ?? uuidv7(),
      updatedAt: new Date().toISOString(),
    };
    store(tenantId).set(rx.id, rx);
    return rx;
  },
  clear(tenantId: string) {
    store(tenantId).clear();
  },
};
