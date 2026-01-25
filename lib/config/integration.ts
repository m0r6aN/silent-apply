/**
 * Integration Configuration
 * 
 * Configuration for external service integrations (Keon, OMEGA, etc.).
 */

import { env } from './env';

/**
 * Keon integration configuration
 */
export const keonConfig = {
  enabled: env.keon.enabled,
  baseUrl: env.keon.baseUrl,
  apiKey: env.keon.apiKey,
  timeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelayMs: 1000,
} as const;

/**
 * OMEGA integration configuration
 */
export const omegaConfig = {
  enabled: true, // Always enabled (core functionality)
  taskTimeoutMs: env.omega.taskTimeoutMs,
  maxConcurrentTasks: 10,
  taskRetryAttempts: 2,
} as const;

/**
 * Email integration configuration
 */
export const emailConfig = {
  enabled: !!(env.smtp.host && env.smtp.user && env.smtp.password),
  smtp: {
    host: env.smtp.host,
    port: env.smtp.port,
    user: env.smtp.user,
    password: env.smtp.password,
    from: env.smtp.from,
  },
  templates: {
    bookingConfirmation: 'booking-confirmation',
    bookingCancellation: 'booking-cancellation',
  },
} as const;

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  enabled: true,
  
  // Public profile views (recruiter-facing)
  publicProfile: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Q&A requests
  qa: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Booking requests
  booking: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // API endpoints (authenticated)
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Observability configuration
 */
export const observabilityConfig = {
  // Correlation ID format: t:<tenant>|c:<uuidv7>
  correlationIdFormat: 't:silentapply|c:{uuid}',
  
  // Structured logging
  logging: {
    enabled: true,
    level: env.isDevelopment ? 'debug' : 'info',
    format: 'json',
  },
  
  // Metrics (future)
  metrics: {
    enabled: false,
  },
  
  // Tracing (future)
  tracing: {
    enabled: false,
  },
} as const;

/**
 * Integration health check endpoints
 */
export const healthCheckEndpoints = {
  keon: env.keon.baseUrl ? `${env.keon.baseUrl}/health` : undefined,
  // Add other service health checks here
} as const;

/**
 * Check if all required integrations are healthy
 */
export async function checkIntegrationHealth(): Promise<{
  healthy: boolean;
  services: Record<string, 'ok' | 'degraded' | 'down'>;
}> {
  const services: Record<string, 'ok' | 'degraded' | 'down'> = {
    omega: 'ok', // Always healthy (local)
  };
  
  // Check Keon if enabled
  if (keonConfig.enabled && healthCheckEndpoints.keon) {
    try {
      const response = await fetch(healthCheckEndpoints.keon, {
        method: 'GET',
        signal: AbortSignal.timeout(keonConfig.timeout),
      });
      services.keon = response.ok ? 'ok' : 'degraded';
    } catch {
      services.keon = 'down';
    }
  }
  
  const healthy = Object.values(services).every(status => status === 'ok');
  
  return { healthy, services };
}

