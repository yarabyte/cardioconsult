import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/require-context", async () => {
  const actual = await vi.importActual<typeof import("@/server/auth/require-context")>(
    "@/server/auth/require-context",
  );
  return {
    ...actual,
    requireContext: vi.fn(),
  };
});

vi.mock("@/server/audit/platform-audit", () => ({
  writePlatformAudit: vi.fn(async () => undefined),
}));

import { AccessDeniedError, requireContext } from "@/server/auth/require-context";
import { writePlatformAudit } from "@/server/audit/platform-audit";
import { attemptDocumentSign, attemptPrescriptionValidate } from "./clinical-gates";

describe("clinical gates", () => {
  beforeEach(() => {
    vi.mocked(requireContext).mockReset();
    vi.mocked(writePlatformAudit).mockClear();
  });

  it("refuse document.sign et audite access_denied", async () => {
    vi.mocked(requireContext).mockRejectedValue(new AccessDeniedError());
    const r = await attemptDocumentSign("doc-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("access_denied");
    expect(writePlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.sign", outcome: "access_denied" }),
    );
  });

  it("refuse prescription.validate", async () => {
    vi.mocked(requireContext).mockRejectedValue(new AccessDeniedError());
    const r = await attemptPrescriptionValidate("rx-1");
    expect(r.ok).toBe(false);
    expect(writePlatformAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "prescription.validate", outcome: "access_denied" }),
    );
  });
});
