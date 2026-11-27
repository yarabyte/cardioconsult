import type { TenantStatus } from "@/types/domain";

export type ConsoleTenantOps = {
  tenantId: string;
  status: TenantStatus;
  rppsStatus: "pending_manual_review" | "verified" | "rejected";
  provisionStep: string | null;
  provisionError: string | null;
  lastBackupAt: string | null;
  lastRestoreTestAt: string | null;
  migrationVersion: string;
  failedJobs: number;
  certExpiresAt: string | null;
};
