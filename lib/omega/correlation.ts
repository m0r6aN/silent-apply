/**
 * Correlation ID utilities for SilentApply OMEGA tasks
 *
 * Format: t:<tenant>|c:<uuidv7>
 *
 * All async operations MUST propagate correlation IDs for auditability.
 */

import { headers } from 'next/headers';
import {
  generateCorrelationId as sdkGenerateCorrelationId,
  isValidCorrelationId as sdkIsValidCorrelationId,
  parseCorrelationId as sdkParseCorrelationId,
} from '@omega/sdk';

const CORRELATION_HEADER = 'X-Correlation-ID';
const TENANT_ID = 'silentapply'; // Single tenant for MVP

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return sdkGenerateCorrelationId(TENANT_ID);
}

/**
 * Parse correlation ID components
 */
export function parseCorrelationId(correlationId: string): { tenant: string; requestId: string } | null {
  try {
    const parsed = sdkParseCorrelationId(correlationId);
    return {
      tenant: parsed.tenantId,
      requestId: parsed.uuid,
    };
  } catch {
    return null;
  }
}

/**
 * Validate correlation ID format
 */
export function isValidCorrelationId(correlationId: string): boolean {
  return sdkIsValidCorrelationId(correlationId);
}

/**
 * Extract correlation ID from request headers, or generate new one
 */
export async function getOrCreateCorrelationId(): Promise<string> {
  try {
    const headersList = await headers();
    const existing = headersList.get(CORRELATION_HEADER);

    if (existing && isValidCorrelationId(existing)) {
      return existing;
    }
  } catch {
    // Headers not available (e.g., in non-request context)
  }

  return generateCorrelationId();
}

/**
 * Create correlation-aware logger
 */
export function createCorrelationLogger(correlationId: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'info',
        correlationId,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'warn',
        correlationId,
        event,
        ...data,
        timestamp: new Date().toISOString()
      }));
    },
    error: (event: string, error: unknown, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'error',
        correlationId,
        event,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        ...data,
        timestamp: new Date().toISOString()
      }));
    }
  };
}

export { CORRELATION_HEADER };
