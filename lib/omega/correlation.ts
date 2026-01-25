/**
 * Correlation ID utilities for SilentApply OMEGA tasks
 *
 * Format: t:<tenant>|c:<uuidv7>
 *
 * All async operations MUST propagate correlation IDs for auditability.
 */

import { headers } from 'next/headers';

const CORRELATION_HEADER = 'X-Correlation-ID';
const TENANT_ID = 'silentapply'; // Single tenant for MVP

/**
 * Generate a UUIDv7 (time-ordered UUID)
 * Uses timestamp prefix for natural ordering
 */
function generateUuidV7(): string {
  const timestamp = Date.now();
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  // Random bits for uniqueness
  const randomBits = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 65536).toString(16).padStart(4, '0')
  ).join('');

  // Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
  // Version 7 (time-based) with variant bits
  const uuid = [
    timestampHex.slice(0, 8),
    timestampHex.slice(8, 12),
    '7' + randomBits.slice(0, 3),
    ((parseInt(randomBits.slice(3, 4), 16) & 0x3) | 0x8).toString(16) + randomBits.slice(4, 7),
    randomBits.slice(7, 19).padEnd(12, '0').slice(0, 12)
  ].join('-');

  return uuid;
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return `t:${TENANT_ID}|c:${generateUuidV7()}`;
}

/**
 * Parse correlation ID components
 */
export function parseCorrelationId(correlationId: string): { tenant: string; requestId: string } | null {
  const match = correlationId.match(/^t:([^|]+)\|c:(.+)$/);
  if (!match) return null;
  return { tenant: match[1], requestId: match[2] };
}

/**
 * Validate correlation ID format
 */
export function isValidCorrelationId(correlationId: string): boolean {
  return parseCorrelationId(correlationId) !== null;
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
