import type { DocRecord } from "@/lib/documents/record";

const byTenant = new Map<string, Map<string, DocRecord>>();

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

export const documentMemoryStore = {
  get(tenantId: string, id: string) {
    return store(tenantId).get(id) ?? null;
  },
  listToValidate(tenantId: string) {
    return [...store(tenantId).values()].filter((d) => d.status === "brouillon");
  },
  findByEncounter(tenantId: string, encounterId: string) {
    return [...store(tenantId).values()].find((d) => d.encounterId === encounterId) ?? null;
  },
  save(tenantId: string, doc: DocRecord) {
    store(tenantId).set(doc.id, doc);
    return doc;
  },
  clear(tenantId: string) {
    store(tenantId).clear();
  },
};
