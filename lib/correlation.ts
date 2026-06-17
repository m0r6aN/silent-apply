import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_HEADER = 'X-Correlation-ID';

export function generateCorrelationId(): string {
  return uuidv4();
}

export async function getOrCreateCorrelationId(): Promise<string> {
  try {
    const headersList = await headers();
    const existing = headersList.get(CORRELATION_HEADER);
    if (existing && existing.length > 0) {
      return existing;
    }
  } catch {
    // headers() not available outside request context
  }
  return generateCorrelationId();
}

export function createCorrelationLogger(correlationId: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'info',
        correlationId,
        event,
        ...data,
        timestamp: new Date().toISOString(),
      }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'warn',
        correlationId,
        event,
        ...data,
        timestamp: new Date().toISOString(),
      }));
    },
    error: (event: string, error: unknown, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'error',
        correlationId,
        event,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        ...data,
        timestamp: new Date().toISOString(),
      }));
    },
  };
}
