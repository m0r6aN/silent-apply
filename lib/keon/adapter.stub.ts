/**
 * Keon Stub Adapter
 * 
 * Stub implementation of Keon client for development and testing.
 * Returns safe defaults until real Keon integration is wired.
 * 
 * This adapter:
 * - Does NOT perform real verification
 * - Returns optimistic/safe defaults
 * - Logs all calls for observability
 * - Allows development to proceed without Keon dependency
 * 
 * @see /docs/integration/KEON_INTEGRATION_POINTS.md
 */

import {
  IKeonClient,
  VerifyEvidenceRequest,
  VerifyEvidenceResponse,
  CheckEvidenceStatusRequest,
  CheckEvidenceStatusResponse,
  PolicyCheckRequest,
  PolicyCheckResponse
} from './types';

/**
 * Stub adapter for Keon integration
 * 
 * Returns safe defaults for all operations.
 * All evidence is marked as 'pending' by default.
 * All policy checks return 'allowed: true' by default.
 */
export class KeonStubAdapter implements IKeonClient {
  private readonly stubMode = true;

  constructor() {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Keon] Using stub adapter - no real verification');
    }
  }

  async verifyEvidence(request: VerifyEvidenceRequest): Promise<VerifyEvidenceResponse> {
    this.log('verifyEvidence', request);

    // Stub: Return pending status
    return {
      evidenceId: request.evidenceId,
      status: 'pending',
      verifiedAt: undefined,
      expiresAt: undefined
    };
  }

  async checkEvidenceStatus(request: CheckEvidenceStatusRequest): Promise<CheckEvidenceStatusResponse> {
    this.log('checkEvidenceStatus', request);

    // Stub: Return pending status
    return {
      evidenceId: request.evidenceId,
      status: 'pending',
      verification: undefined
    };
  }

  async checkPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResponse> {
    this.log('checkPolicy', request);

    // Stub: Allow all actions by default
    // In production, this would enforce real governance rules
    return {
      allowed: true,
      reason: 'Stub adapter - all actions allowed in development'
    };
  }

  async healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down' }> {
    this.log('healthCheck', {});

    // Stub: Always healthy
    return { status: 'ok' };
  }

  private log(method: string, data: unknown): void {
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        level: 'info',
        service: 'keon-stub',
        method,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

/**
 * Factory function for stub adapter
 */
export function createKeonStubAdapter(): IKeonClient {
  return new KeonStubAdapter();
}

