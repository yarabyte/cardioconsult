export type RppsVerificationStatus = "pending_manual_review" | "verified" | "rejected";

export interface RppsVerificationResult {
  status: RppsVerificationStatus;
  rpps: string;
  message: string;
}

export interface RppsVerifier {
  verify(rpps: string): Promise<RppsVerificationResult>;
}
