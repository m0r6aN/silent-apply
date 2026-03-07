import { createOmegaClient, type OmegaClient } from '@omega/sdk';

let cachedClient: OmegaClient | null = null;

function getFederationUrl(): string {
  return process.env.OMEGA_FEDERATION_URL ?? 'http://localhost:9405';
}

export function getOmegaClient(): OmegaClient {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createOmegaClient({
    federationUrl: getFederationUrl(),
    apiKey: process.env.OMEGA_API_KEY,
    tenantId: process.env.OMEGA_TENANT_ID ?? 'silentapply',
    actorId: process.env.OMEGA_ACTOR_ID ?? 'silentapply-api',
    timeoutMs: process.env.OMEGA_TIMEOUT_MS
      ? parseInt(process.env.OMEGA_TIMEOUT_MS, 10)
      : 120_000,
    maxRetries: process.env.OMEGA_MAX_RETRIES
      ? parseInt(process.env.OMEGA_MAX_RETRIES, 10)
      : 3,
  });

  return cachedClient;
}
