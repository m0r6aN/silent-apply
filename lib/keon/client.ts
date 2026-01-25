/**
 * Keon Client Interface
 * 
 * Provides integration with Keon evidence verification and governance.
 * Implementation is environment-aware and uses stub adapter by default.
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
  PolicyCheckResponse,
  KeonConfig
} from './types';
import { createKeonStubAdapter } from './adapter.stub';

/**
 * Keon client factory
 * 
 * Returns appropriate adapter based on environment configuration.
 * Defaults to stub adapter until Keon integration is wired.
 */
export function createKeonClient(config?: Partial<KeonConfig>): IKeonClient {
  const keonEnabled = process.env.KEON_ENABLED === 'true';
  const keonBaseUrl = process.env.KEON_BASE_URL;
  const keonApiKey = process.env.KEON_API_KEY;

  // If Keon is not enabled or not configured, use stub adapter
  if (!keonEnabled || !keonBaseUrl) {
    return createKeonStubAdapter();
  }

  // TODO: When Keon is available, implement real adapter
  // return createKeonHttpAdapter({
  //   baseUrl: keonBaseUrl,
  //   apiKey: keonApiKey,
  //   timeout: config?.timeout ?? 5000,
  //   retryAttempts: config?.retryAttempts ?? 3
  // });

  // For now, always use stub
  return createKeonStubAdapter();
}

/**
 * Singleton Keon client instance
 * 
 * Lazy-initialized on first access.
 * Use this for most application code.
 */
let keonClientInstance: IKeonClient | null = null;

export function getKeonClient(): IKeonClient {
  if (!keonClientInstance) {
    keonClientInstance = createKeonClient();
  }
  return keonClientInstance;
}

/**
 * Reset client instance (for testing)
 */
export function resetKeonClient(): void {
  keonClientInstance = null;
}

