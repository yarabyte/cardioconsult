export type SupportSessionStatus = "requested" | "active" | "revoked" | "expired" | "denied";

export type SupportSessionRecord = {
  id: string;
  tenantId: string;
  platformActorId: string;
  platformActorLabel: string;
  reason: string;
  readOnly: true;
  status: SupportSessionStatus;
  requestedAt: string;
  consentedAt: string | null;
  consentedByMemberId: string | null;
  consentedByLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  revokedAt: string | null;
  ephemeralRoRole: string | null;
  accessToken: string | null;
};
