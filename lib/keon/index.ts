/**
 * Keon Integration Module
 * 
 * Public exports for Keon evidence verification and governance.
 * 
 * Usage:
 * ```typescript
 * import { getKeonClient } from '@/lib/keon';
 * 
 * const keon = getKeonClient();
 * const result = await keon.verifyEvidence({
 *   evidenceId: 'ev_123',
 *   type: 'github_profile',
 *   url: 'https://github.com/username',
 *   correlationId: 'corr_456'
 * });
 * ```
 */

export * from './types';
export { getKeonClient, createKeonClient, resetKeonClient } from './client';
export { createKeonStubAdapter } from './adapter.stub';

