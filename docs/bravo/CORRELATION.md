# Correlation Propagation — Team Bravo

Correlation tracking ensures every request, task, and side effect can be traced across API boundaries, OMEGA orchestration, and tool execution.

---

## Correlation ID Format

**Mandatory Format:**
```
t:<tenant>|c:<uuidv7>
```

**Components:**
- `t:<tenant>` — Tenant identifier (default: `t:default` for MVP)
- `c:<uuidv7>` — UUIDv7 correlation ID (time-ordered, globally unique)

**Example:**
```
t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890
```

**Why UUIDv7?**
- Time-ordered for efficient indexing
- Globally unique without coordination
- Standard UUID format for compatibility

---

## Correlation Header

**Header Name:**
```
X-Correlation-ID
```

**Behavior:**
- Client MAY provide correlation ID
- If not provided, API generates one
- Server ALWAYS returns correlation ID in response headers
- Correlation ID is logged with every operation

**Example Request:**
```http
POST /api/qa HTTP/1.1
Host: api.silentapply.com
Content-Type: application/json
X-Correlation-ID: t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890

{
  "profileId": "...",
  "question": "What is your availability?"
}
```

**Example Response:**
```http
HTTP/1.1 202 Accepted
Content-Type: application/json
X-Correlation-ID: t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890

{
  "threadId": "...",
  "status": "processing"
}
```

---

## Correlation Flow

### 1. HTTP Request → API Handler

```typescript
// Example: Next.js API route
export async function POST(req: Request) {
  const correlationId =
    req.headers.get('X-Correlation-ID') ||
    generateCorrelationId();

  const ctx: CorrelationContext = {
    correlationId,
    tenant: extractTenant(correlationId),
    timestamp: new Date().toISOString(),
    source: 'api',
    userId: session?.user?.id,
    profileId: params.profileId,
  };

  logger.info('Request received', { correlationId, path: req.url });

  // ... handle request

  return new Response(JSON.stringify(result), {
    headers: {
      'X-Correlation-ID': correlationId,
    },
  });
}
```

### 2. API Handler → OMEGA Trigger

When the API delegates async work to OMEGA, it MUST propagate correlation.

```typescript
// Example: Resume upload triggers OMEGA task
const resumeId = await saveResumeFile(file, profileId);

await triggerOmegaTask({
  taskName: 'resume.ingest',
  correlationId: ctx.correlationId,
  payload: {
    resumeId,
    profileId,
    fileUrl: resumeUrl,
  },
});

logger.info('OMEGA task triggered', {
  correlationId: ctx.correlationId,
  taskName: 'resume.ingest',
  resumeId,
});
```

### 3. OMEGA → Tools → Response

OMEGA receives correlation ID and propagates it to all tool calls.

```typescript
// OMEGA task handler
export async function handleResumeIngest(task: OmegaTask) {
  const { correlationId, payload } = task;

  logger.info('OMEGA task started', {
    correlationId,
    taskName: 'resume.ingest',
    resumeId: payload.resumeId,
  });

  // Tool calls include correlation
  const parsedText = await extractText(payload.fileUrl, correlationId);
  const chunks = await chunkText(parsedText, correlationId);
  const embeddings = await generateEmbeddings(chunks, correlationId);

  await saveResumeChunks(payload.resumeId, chunks, embeddings, correlationId);

  logger.info('OMEGA task completed', {
    correlationId,
    taskName: 'resume.ingest',
    resumeId: payload.resumeId,
  });
}
```

---

## Correlation Context

Internal metadata passed between layers.

```typescript
export interface CorrelationContext {
  correlationId: string; // t:<tenant>|c:<uuidv7>
  tenant: string; // extracted from correlationId
  timestamp: string; // ISO 8601
  source: 'api' | 'omega' | 'cron'; // origin
  userId?: string | null;
  profileId?: string | null;
}
```

**Not exposed via API.** Used internally for logging and tracing.

---

## Logging Requirements

All log statements MUST include correlation ID.

### Structured Logging Example

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// Good: Correlation always logged
logger.info({
  correlationId: ctx.correlationId,
  event: 'profile.updated',
  profileId: profile.id,
  userId: user.id,
}, 'Profile updated');

// Bad: Missing correlation
logger.info('Profile updated'); // NO!
```

### Log Aggregation

In production (Azure Container Apps + Log Analytics):

```kusto
traces
| where customDimensions.correlationId == "t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890"
| order by timestamp asc
| project timestamp, message, customDimensions
```

This query traces the entire lifecycle of a request across API, OMEGA, and tools.

---

## Correlation in Error Responses

All error responses MUST include correlation ID.

```typescript
export function errorResponse(
  error: string,
  message: string,
  correlationId: string,
  status: number
): Response {
  return new Response(
    JSON.stringify({
      error,
      message,
      correlationId,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      },
    }
  );
}
```

**Example Error Response:**

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "correlationId": "t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890"
}
```

---

## Correlation ID Generation

```typescript
import { v7 as uuidv7 } from 'uuid';

export function generateCorrelationId(tenant: string = 'default'): string {
  return `t:${tenant}|c:${uuidv7()}`;
}

export function extractTenant(correlationId: string): string {
  const match = correlationId.match(/^t:([^|]+)\|/);
  return match?.[1] || 'default';
}

export function validateCorrelationId(correlationId: string): boolean {
  return /^t:[a-zA-Z0-9_-]+\|c:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(correlationId);
}
```

---

## Idempotency Keys vs Correlation IDs

**Do NOT confuse these:**

- **Correlation ID:** Tracks causality and tracing (logging, debugging)
- **Idempotency Key:** Ensures duplicate requests have the same effect (deduplication)

**When to use each:**

| Scenario | Correlation ID | Idempotency Key |
|----------|---------------|-----------------|
| Tracing request flow | Yes | No |
| Preventing duplicate bookings | Yes | Yes (if client-provided) |
| Debugging failed OMEGA task | Yes | No |
| Log aggregation | Yes | No |

For MVP, idempotency is handled at the application level (e.g., booking status checks), not via explicit idempotency keys.

---

## Correlation Across Boundaries

### API → OMEGA

```typescript
// API handler
await triggerOmegaTask({
  taskName: 'qa.answer',
  correlationId: ctx.correlationId,
  payload: { threadId, question },
});
```

### OMEGA → Database

```typescript
// OMEGA task
await prisma.qAMessage.create({
  data: {
    threadId,
    role: 'system',
    content: answer,
    correlationId: task.correlationId, // stored for audit
  },
});
```

### OMEGA → External APIs (Future)

```typescript
// OMEGA task calling external service
const response = await fetch('https://external-api.com/endpoint', {
  headers: {
    'X-Correlation-ID': task.correlationId,
  },
});
```

---

## Rate Limiting and Correlation

Rate limit keys MAY include correlation ID for abuse tracking.

```typescript
// Rate limit key structure
const rateLimitKey = `ratelimit:qa:${profileId}:${ipHash}`;

// On limit exceeded, log correlation
logger.warn({
  correlationId: ctx.correlationId,
  event: 'rate_limit_exceeded',
  key: rateLimitKey,
}, 'Rate limit exceeded');
```

**Correlation helps identify abuse patterns without exposing user behavior.**

---

## Testing Correlation

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { generateCorrelationId, validateCorrelationId } from './correlation';

describe('Correlation ID', () => {
  it('generates valid correlation ID', () => {
    const id = generateCorrelationId('default');
    expect(validateCorrelationId(id)).toBe(true);
    expect(id).toMatch(/^t:default\|c:[0-9a-fA-F-]+$/);
  });

  it('validates correlation ID format', () => {
    expect(validateCorrelationId('t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890')).toBe(true);
    expect(validateCorrelationId('invalid')).toBe(false);
  });
});
```

### Integration Test Example

```typescript
describe('POST /api/qa', () => {
  it('propagates correlation ID to response', async () => {
    const correlationId = generateCorrelationId();

    const response = await fetch('/api/qa', {
      method: 'POST',
      headers: {
        'X-Correlation-ID': correlationId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId: testProfileId,
        question: 'What is your availability?',
      }),
    });

    expect(response.headers.get('X-Correlation-ID')).toBe(correlationId);
  });
});
```

---

## Correlation in Production

### Observability Stack

- **Logs:** Azure Log Analytics (structured JSON logs)
- **Traces:** Correlation ID links logs across services
- **Metrics:** Rate limits, error rates tagged by correlation prefix

### Querying Logs

```kusto
// Find all operations for a correlation ID
traces
| where customDimensions.correlationId == "t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890"
| order by timestamp asc

// Find failed OMEGA tasks
traces
| where customDimensions.source == "omega"
| where customDimensions.event == "task_failed"
| summarize count() by bin(timestamp, 1h), customDimensions.taskName
```

---

## Canon Compliance

Correlation tracking is **invisible to end users** and **never urgent.**

- No correlation IDs exposed in UI
- No "transaction failed, here's your correlation ID" messages
- Used exclusively for internal tracing and debugging

If correlation fails (e.g., invalid format), log a warning and generate a new one. Never block requests.

---

## Summary

1. **Format:** `t:<tenant>|c:<uuidv7>`
2. **Header:** `X-Correlation-ID`
3. **Flow:** HTTP → API → OMEGA → Tools
4. **Logging:** All logs include correlation ID
5. **Errors:** Correlation ID in error responses
6. **Testing:** Validate format and propagation
7. **Production:** Query logs by correlation ID for full trace

Correlation makes distributed systems debuggable without compromising calm.

---

## End of Correlation Spec
