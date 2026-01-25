/**
 * Keon Integration Types
 * 
 * Type definitions for Keon evidence verification and governance.
 * These are integration contracts - implementation is stubbed until Keon is wired.
 * 
 * @see /docs/integration/KEON_INTEGRATION_POINTS.md
 */

/**
 * Evidence types supported by Keon
 */
export type EvidenceType = 
  | 'github_profile'
  | 'linkedin_profile'
  | 'portfolio_url'
  | 'certification'
  | 'work_sample'
  | 'reference'
  | 'custom_link';

/**
 * Evidence verification status
 */
export type VerificationStatus = 
  | 'pending'      // Submitted, not yet verified
  | 'verified'     // Keon confirmed authenticity
  | 'failed'       // Verification failed
  | 'expired'      // Verification expired (time-bound)
  | 'revoked';     // Manually revoked

/**
 * Evidence item submitted by candidate
 */
export interface EvidenceItem {
  id: string;
  profileId: string;
  type: EvidenceType;
  url: string;
  label?: string;
  metadata?: Record<string, unknown>;
  submittedAt: Date;
}

/**
 * Evidence verification result from Keon
 */
export interface EvidenceVerification {
  evidenceId: string;
  status: VerificationStatus;
  verifiedAt?: Date;
  expiresAt?: Date;
  verificationMethod?: string;
  confidence?: number; // 0-1 scale
  metadata?: Record<string, unknown>;
}

/**
 * Request to verify evidence
 */
export interface VerifyEvidenceRequest {
  evidenceId: string;
  type: EvidenceType;
  url: string;
  correlationId: string;
}

/**
 * Response from evidence verification
 */
export interface VerifyEvidenceResponse {
  evidenceId: string;
  status: VerificationStatus;
  verifiedAt?: Date;
  expiresAt?: Date;
  error?: string;
}

/**
 * Request to check evidence status
 */
export interface CheckEvidenceStatusRequest {
  evidenceId: string;
  correlationId: string;
}

/**
 * Response from evidence status check
 */
export interface CheckEvidenceStatusResponse {
  evidenceId: string;
  status: VerificationStatus;
  verification?: EvidenceVerification;
}

/**
 * Governance policy check request
 */
export interface PolicyCheckRequest {
  profileId: string;
  action: 'publish' | 'share_resume' | 'enable_booking' | 'enable_qa';
  correlationId: string;
}

/**
 * Governance policy check response
 */
export interface PolicyCheckResponse {
  allowed: boolean;
  reason?: string;
  requirements?: string[];
}

/**
 * Keon client configuration
 */
export interface KeonConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Keon client interface
 * 
 * All methods are async and correlation-aware.
 * Implementation is stubbed until Keon endpoints are available.
 */
export interface IKeonClient {
  /**
   * Verify evidence authenticity
   */
  verifyEvidence(request: VerifyEvidenceRequest): Promise<VerifyEvidenceResponse>;

  /**
   * Check evidence verification status
   */
  checkEvidenceStatus(request: CheckEvidenceStatusRequest): Promise<CheckEvidenceStatusResponse>;

  /**
   * Check if action is allowed by governance policy
   */
  checkPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResponse>;

  /**
   * Health check
   */
  healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down' }>;
}

