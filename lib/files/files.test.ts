import { describe, expect, it, beforeEach } from "vitest";
import { EICAR_SIGNATURE, looksLikeEicar, validateUploadBuffer } from "./mime";
import { createPresignedToken, verifyPresignedToken } from "./presign";
import {
  completeUpload,
  initUpload,
  resetUploadTestStore,
  setClamScanner,
  demoClamScanner,
} from "@/server/services/files/upload";
import { setObjectStorage, type ObjectStorage } from "@/server/services/files/object-storage";

const SECRET = "dev-only-change-me-32chars-minimum!!";
const TENANT = "00000000-0000-7000-8000-000000000001";
const memObjects = new Map<string, Uint8Array>();

const fakeStorage: ObjectStorage = {
  async isAvailable() {
    return true;
  },
  async putObject(key, body) {
    memObjects.set(key, body);
  },
  async getObject(key) {
    return memObjects.get(key) ?? null;
  },
};

describe("MIME + magic bytes", () => {
  it("rejette un faux PDF (MIME incohérent)", () => {
    const fake = new TextEncoder().encode("ceci n'est pas un PDF");
    const r = validateUploadBuffer(fake, "application/pdf");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/magic|MIME/i);
  });

  it("accepte un en-tête %PDF", () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\n% fake demo");
    const r = validateUploadBuffer(pdf, "application/pdf");
    expect(r.ok).toBe(true);
  });

  it("détecte EICAR", () => {
    expect(looksLikeEicar(new TextEncoder().encode(EICAR_SIGNATURE))).toBe(true);
  });
});

describe("URL présignée", () => {
  it("refuse un jeton expiré", () => {
    const token = createPresignedToken(SECRET, {
      fileId: "f1",
      userId: "u1",
      purpose: "download",
      exp: Date.now() - 1000,
    });
    const r = verifyPresignedToken(SECRET, token, { userId: "u1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });
});

describe("Pipeline upload", () => {
  beforeEach(() => {
    memObjects.clear();
    resetUploadTestStore();
    setObjectStorage(fakeStorage);
    setClamScanner(demoClamScanner);
  });

  it("rejette EICAR", async () => {
    const init = await initUpload({
      tenantId: TENANT,
      patientId: "p1",
      userId: "u1",
      originalName: "eicar.txt",
      claimedMime: "application/pdf",
      sizeBytes: 100,
    });
    expect(init.ok).toBe(true);
    if (!init.ok) return;
    const payload = new TextEncoder().encode("%PDF-1.4\n" + EICAR_SIGNATURE);
    const r = await completeUpload({
      tenantId: TENANT,
      token: init.uploadToken,
      userId: "u1",
      claimedMime: "application/pdf",
      bytes: payload,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/antivirus/i);
      expect(r.file?.status).toBe("rejete");
    }
  });

  it("refuse si antivirus unavailable (fail closed)", async () => {
    setClamScanner(async () => "unavailable");
    const init = await initUpload({
      tenantId: TENANT,
      patientId: "p1",
      userId: "u1",
      originalName: "doc.pdf",
      claimedMime: "application/pdf",
      sizeBytes: 20,
    });
    if (!init.ok) throw new Error("init");
    const r = await completeUpload({
      tenantId: TENANT,
      token: init.uploadToken,
      userId: "u1",
      claimedMime: "application/pdf",
      bytes: new TextEncoder().encode("%PDF-1.4 demo"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/injoignable/i);
  });

  it("refuse un jeton upload expiré", async () => {
    const init = await initUpload({
      tenantId: TENANT,
      patientId: "p1",
      userId: "u1",
      originalName: "doc.pdf",
      claimedMime: "application/pdf",
      sizeBytes: 20,
    });
    if (!init.ok) throw new Error("init");
    const expired = createPresignedToken(SECRET, {
      fileId: init.fileId,
      userId: "u1",
      purpose: "upload",
      exp: Date.now() - 1,
    });
    const r = await completeUpload({
      tenantId: TENANT,
      token: expired,
      userId: "u1",
      claimedMime: "application/pdf",
      bytes: new TextEncoder().encode("%PDF-1.4 demo"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/expir/i);
  });

  it("accepte un PDF valide", async () => {
    setClamScanner(demoClamScanner);
    const init = await initUpload({
      tenantId: TENANT,
      patientId: "p1",
      userId: "u1",
      originalName: "doc.pdf",
      claimedMime: "application/pdf",
      sizeBytes: 20,
    });
    if (!init.ok) throw new Error("init");
    const r = await completeUpload({
      tenantId: TENANT,
      token: init.uploadToken,
      userId: "u1",
      claimedMime: "application/pdf",
      bytes: new TextEncoder().encode("%PDF-1.4 demo"),
    });
    expect(r.ok).toBe(true);
  });
});
