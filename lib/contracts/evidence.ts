/**
 * Evidence Contracts
 * 
 * Shared DTOs for evidence/proof data between UI and integrations.
 * These are canon-neutral data structures.
 */

import { EvidenceType, VerificationStatus } from '@/lib/keon/types';

/**
 * Evidence item (candidate-submitted proof)
 */
export interface Evidence {
  id: string;
  profileId: string;
  type: EvidenceType;
  url: string;
  label?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Evidence submission request
 */
export interface SubmitEvidenceRequest {
  type: EvidenceType;
  url: string;
  label?: string;
}

/**
 * Evidence update request
 */
export interface UpdateEvidenceRequest {
  url?: string;
  label?: string;
}

/**
 * Evidence with verification details
 */
export interface EvidenceWithVerification extends Evidence {
  verificationMethod?: string;
  verificationConfidence?: number;
  verificationMetadata?: Record<string, unknown>;
}

/**
 * Public evidence view (recruiter-facing)
 * 
 * Only shows verified evidence.
 */
export interface PublicEvidence {
  id: string;
  type: EvidenceType;
  url: string;
  label?: string;
  verifiedAt?: Date;
}

/**
 * Evidence validation result
 */
export interface EvidenceValidation {
  valid: boolean;
  errors?: {
    field: string;
    message: string;
  }[];
}

