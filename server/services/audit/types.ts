import type { Role } from "@/types/domain";

export type AuditOutcome = "success" | "failure" | "access_denied";

export type AuditEventInput = {
  action: string;
  entityType: string;
  entityId: string;
  outcome?: AuditOutcome;
  actorId?: string | null;
  actorRole?: Role | string | null;
  ipTruncated?: string | null;
  userAgentHash?: string | null;
  requestId?: string | null;
};

export type AuditEventRow = AuditEventInput & {
  id: string;
  at: Date;
  prevHash: string | null;
  hash: string;
  outcome: AuditOutcome;
};

export type AuditListFilters = {
  from?: Date;
  to?: Date;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};
