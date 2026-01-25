# API → OMEGA Trigger Map — Team Bravo

This document defines the contract between the API layer (Team Bravo) and the orchestration layer (Team OMEGA).

**Key Principle:** The API layer delegates async work to OMEGA but NEVER implements orchestration logic itself.

---

## Trigger Contract

Each trigger includes:
- **API Endpoint:** Which endpoint triggers the task
- **OMEGA Task Name:** Canonical task identifier
- **Input Payload:** Data passed from API to OMEGA
- **Correlation Handoff:** How correlation flows
- **Expected Async Behavior:** What OMEGA does (not API's concern, but documented for clarity)

---

## Trigger 1: Resume Ingestion

### API Endpoint
```
POST /api/resume
```

### OMEGA Task Name
```
resume.ingest
```

### Trigger Condition
- User uploads a resume file (PDF, DOCX)
- File is validated and stored in Azure Blob Storage
- API returns immediately with `201 Created`

### Input Payload

```typescript
interface ResumeIngestPayload {
  resumeId: string; // UUID of Resume record
  profileId: string; // UUID of Profile
  fileUrl: string; // Azure Blob Storage URL
  correlationId: string; // t:<tenant>|c:<uuidv7>
  timestamp: string; // ISO 8601
}
```

### API Responsibility

```typescript
// API handler (simplified)
export async function POST(req: Request) {
  const correlationId = req.headers.get('X-Correlation-ID') || generateCorrelationId();

  // 1. Validate file (type, size)
  const file = await req.formData().get('file');
  if (!isValidResume(file)) {
    return errorResponse('BAD_REQUEST', 'Invalid file', correlationId, 400);
  }

  // 2. Store file in Azure Blob
  const fileUrl = await uploadToBlob(file, correlationId);

  // 3. Create Resume record
  const resume = await prisma.resume.create({
    data: {
      profileId: session.user.profileId,
      fileUrl,
      parsedText: '', // populated by OMEGA
    },
  });

  // 4. Trigger OMEGA task (fire-and-forget)
  await triggerOmegaTask({
    taskName: 'resume.ingest',
    correlationId,
    payload: {
      resumeId: resume.id,
      profileId: session.user.profileId,
      fileUrl,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });

  // 5. Return immediately
  return jsonResponse({
    resumeId: resume.id,
    status: 'uploaded',
    message: 'Resume uploaded. Ingestion queued.',
  }, 201, correlationId);
}
```

### Expected OMEGA Behavior

OMEGA task `resume.ingest` will:
1. Download file from `fileUrl`
2. Extract text (PDF → plaintext, DOCX → plaintext)
3. Chunk text into semantic units
4. Generate embeddings for each chunk
5. Store chunks and embeddings in `resume_chunks` table
6. Update `Resume.parsedText` field
7. Log all operations with `correlationId`

**API does NOT wait for this.** Resume is immediately available (even if not yet parsed).

---

## Trigger 2: Q&A Answer Generation

### API Endpoint
```
POST /api/qa
```

### OMEGA Task Name
```
qa.answer
```

### Trigger Condition
- Recruiter submits a question (no auth required)
- API validates input and creates a `QAThread` and initial `QAMessage`
- API returns immediately with `202 Accepted`

### Input Payload

```typescript
interface QAAnswerPayload {
  threadId: string; // UUID of QAThread
  profileId: string; // UUID of Profile
  question: string; // Recruiter's question
  correlationId: string; // t:<tenant>|c:<uuidv7>
  timestamp: string; // ISO 8601
}
```

### API Responsibility

```typescript
// API handler (simplified)
export async function POST(req: Request) {
  const correlationId = req.headers.get('X-Correlation-ID') || generateCorrelationId();

  // 1. Validate input
  const { profileId, question, email } = await req.json();
  if (!question || question.length > 1000) {
    return errorResponse('BAD_REQUEST', 'Invalid question', correlationId, 400);
  }

  // 2. Check rate limit (quiet)
  const rateLimitKey = `qa:${profileId}:${getIpHash(req)}`;
  if (await isRateLimited(rateLimitKey, 5, 300)) {
    return errorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests', correlationId, 429);
  }

  // 3. Create QA thread and message
  const thread = await prisma.qAThread.create({
    data: {
      profileId,
    },
  });

  await prisma.qAMessage.create({
    data: {
      threadId: thread.id,
      role: 'recruiter',
      content: question,
      sourcesJson: {},
      status: 'answered', // placeholder
    },
  });

  // 4. Trigger OMEGA task
  await triggerOmegaTask({
    taskName: 'qa.answer',
    correlationId,
    payload: {
      threadId: thread.id,
      profileId,
      question,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });

  // 5. Return immediately
  return jsonResponse({
    threadId: thread.id,
    status: 'processing',
  }, 202, correlationId);
}
```

### Expected OMEGA Behavior

OMEGA task `qa.answer` will:
1. Load profile data and resume chunks
2. Perform semantic search on question
3. Generate answer using LLM (bounded, fact-based)
4. Identify sources (profile fields, resume sections)
5. Create `QAMessage` with role `system`, answer, and sources
6. Log all operations with `correlationId`

**API does NOT generate answers.** That's OMEGA's job.

---

## Trigger 3: Booking Notification

### API Endpoint
```
POST /api/booking/confirm
```

### OMEGA Task Name
```
booking.notify
```

### Trigger Condition
- Recruiter confirms a held booking slot
- API updates `Booking` status to `booked`
- API returns immediately with `200 OK`
- OMEGA sends optional email notification

### Input Payload

```typescript
interface BookingNotifyPayload {
  bookingId: string; // UUID of Booking
  profileId: string; // UUID of Profile
  recruiterEmail: string;
  recruiterName: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  correlationId: string; // t:<tenant>|c:<uuidv7>
  timestamp: string; // ISO 8601
}
```

### API Responsibility

```typescript
// API handler (simplified)
export async function POST(req: Request) {
  const correlationId = req.headers.get('X-Correlation-ID') || generateCorrelationId();

  // 1. Validate input
  const { slotId, email, name } = await req.json();
  if (!email || !name) {
    return errorResponse('BAD_REQUEST', 'Missing required fields', correlationId, 400);
  }

  // 2. Check slot status
  const booking = await prisma.booking.findUnique({
    where: { id: slotId },
  });

  if (!booking || booking.status !== 'held') {
    return errorResponse('CONFLICT', 'Slot not available', correlationId, 409);
  }

  // 3. Update booking (idempotent)
  await prisma.booking.update({
    where: { id: slotId },
    data: {
      status: 'booked',
      email,
      name,
      heldUntil: null,
    },
  });

  // 4. Trigger OMEGA task (optional email)
  await triggerOmegaTask({
    taskName: 'booking.notify',
    correlationId,
    payload: {
      bookingId: slotId,
      profileId: booking.profileId,
      recruiterEmail: email,
      recruiterName: name,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });

  // 5. Return immediately
  return jsonResponse({
    slotId,
    status: 'booked',
    message: 'Booking confirmed',
  }, 200, correlationId);
}
```

### Expected OMEGA Behavior

OMEGA task `booking.notify` will:
1. Load profile and user data
2. Send email to candidate (if enabled)
3. Send email to recruiter (confirmation)
4. Log all operations with `correlationId`

**API does NOT send emails.** That's OMEGA's job.

---

## Trigger Mechanism (Implementation Notes)

### Option 1: Queue-Based (Recommended)

```typescript
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const omegaQueue = new Queue('omega-tasks', { connection: redis });

export async function triggerOmegaTask(task: {
  taskName: string;
  correlationId: string;
  payload: Record<string, unknown>;
}) {
  await omegaQueue.add(task.taskName, task.payload, {
    jobId: task.correlationId, // idempotency
    removeOnComplete: 100, // retain for debugging
    removeOnFail: false,
  });

  logger.info({
    correlationId: task.correlationId,
    event: 'omega.task_queued',
    taskName: task.taskName,
  }, 'OMEGA task queued');
}
```

### Option 2: Direct Invocation (Local Dev)

```typescript
export async function triggerOmegaTask(task: {
  taskName: string;
  correlationId: string;
  payload: Record<string, unknown>;
}) {
  // In dev, call OMEGA handler directly
  if (process.env.NODE_ENV === 'development') {
    const handler = await import(`./omega/${task.taskName}`);
    await handler.default(task);
  } else {
    // In prod, use queue
    await omegaQueue.add(task.taskName, task.payload);
  }
}
```

---

## Correlation Handoff

All OMEGA tasks receive correlation ID in payload.

```typescript
// OMEGA task signature
export async function handleResumeIngest(payload: ResumeIngestPayload) {
  const { correlationId, resumeId, fileUrl } = payload;

  logger.info({
    correlationId,
    event: 'omega.task_started',
    taskName: 'resume.ingest',
    resumeId,
  }, 'Resume ingestion started');

  // ... do work

  logger.info({
    correlationId,
    event: 'omega.task_completed',
    taskName: 'resume.ingest',
    resumeId,
  }, 'Resume ingestion completed');
}
```

---

## Idempotency

API endpoints are idempotent where safe:
- **POST /api/resume:** Multiple uploads create multiple Resume records (not idempotent by design)
- **POST /api/qa:** Multiple questions create multiple threads (not idempotent by design)
- **POST /api/booking/hold:** Repeated holds extend expiry (idempotent)
- **POST /api/booking/confirm:** Repeated confirms succeed if already booked (idempotent)

OMEGA tasks use correlation ID as job ID for deduplication.

---

## Error Handling

If `triggerOmegaTask` fails:
1. Log error with correlation ID
2. DO NOT retry in API handler
3. Return success response to client (task is queued, retry handled by queue)

```typescript
try {
  await triggerOmegaTask({ ... });
} catch (err) {
  logger.error({
    correlationId,
    event: 'omega.task_failed_to_queue',
    error: err.message,
  }, 'Failed to queue OMEGA task');

  // DO NOT return error to client
  // (task will be retried by queue)
}
```

---

## Task Status Visibility

For MVP, task status is NOT exposed via API.

Candidates/recruiters see:
- "Resume uploaded" (regardless of ingestion status)
- "Question received" (regardless of answer status)
- "Booking confirmed" (regardless of email status)

Future: Optional task status endpoint for candidates only.

---

## Summary Table

| Endpoint | Task Name | Payload | Async Behavior |
|----------|-----------|---------|----------------|
| POST /api/resume | resume.ingest | resumeId, fileUrl | Extract, chunk, embed resume |
| POST /api/qa | qa.answer | threadId, question | Generate bounded answer |
| POST /api/booking/confirm | booking.notify | bookingId, recruiterEmail | Send confirmation emails |

**API Layer:** Validates, stores, triggers
**OMEGA Layer:** Processes, orchestrates, completes

---

## Testing OMEGA Triggers

### Unit Test (Mock)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { POST as uploadResume } from './api/resume';

vi.mock('./omega/queue', () => ({
  triggerOmegaTask: vi.fn(),
}));

describe('POST /api/resume', () => {
  it('triggers resume.ingest task', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'application/pdf' }));

    const response = await uploadResume(new Request('http://localhost/api/resume', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(201);
    expect(triggerOmegaTask).toHaveBeenCalledWith({
      taskName: 'resume.ingest',
      correlationId: expect.stringMatching(/^t:default\|c:/),
      payload: expect.objectContaining({
        resumeId: expect.any(String),
        fileUrl: expect.any(String),
      }),
    });
  });
});
```

### Integration Test (Real Queue)

```typescript
describe('OMEGA integration', () => {
  it('processes resume.ingest task', async () => {
    const resumeId = 'test-resume-id';
    const fileUrl = 'https://test.blob.core.windows.net/resumes/test.pdf';

    await triggerOmegaTask({
      taskName: 'resume.ingest',
      correlationId: generateCorrelationId(),
      payload: { resumeId, fileUrl },
    });

    // Wait for task completion
    await new Promise(resolve => setTimeout(resolve, 5000));

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    expect(resume.parsedText).not.toBe('');
  }, 10000);
});
```

---

## Canon Compliance

All OMEGA triggers are:
- **Quiet:** No urgency language in responses
- **Bounded:** API returns immediately, no waiting for async work
- **Calm:** Errors are logged, not escalated to users
- **Transparent:** Correlation IDs enable debugging without user-facing complexity

---

## End of OMEGA Trigger Map
