# OMEGA Integration Points

**Status:** 🟢 PARTIALLY WIRED — Existing Implementation  
**Owner:** AugmentTitan (Orchestrator 4)  
**Last Updated:** 2026-01-25

---

## Overview

This document maps existing OMEGA integration points in SilentApply.

**Current State:** OMEGA task dispatch is implemented for resume ingest, Q&A, and booking  
**Future State:** Additional orchestration for evidence correlation and profile optimization

---

## Integration Architecture

```
SilentApply UI
    ↓
lib/omega/dispatch.ts (task orchestration)
    ↓
lib/omega/tasks/* (task executors)
    ↓
lib/omega/tools/* (utilities)
```

---

## Existing Integration Points

### 1. Resume Ingestion

**Location:** `app/api/resume` (POST)  
**Task:** `resume.ingest`  
**Execution:** Fire-and-forget (async)

**Flow:**
```typescript
import { dispatchTask } from '@/lib/omega/dispatch';

await dispatchTask('resume.ingest', {
  resumeId: resume.id,
  fileUrl: resume.fileUrl,
  profileId: profile.id
}, correlationId);
```

**What It Does:**
- Parses resume PDF/DOCX to text
- Chunks text for Q&A retrieval
- Stores chunks in database
- Logs completion via correlation ID

**Files:**
- `lib/omega/tasks/resumeIngest.ts`
- `lib/omega/tools/documentParser.ts`
- `lib/omega/tools/chunkStore.ts`

---

### 2. Q&A Answering

**Location:** `app/api/qa` (future)  
**Task:** `qa.answer`  
**Execution:** Synchronous (returns result)

**Flow:**
```typescript
import { executeTask } from '@/lib/omega/dispatch';

const result = await executeTask('qa.answer', {
  profileId: profile.id,
  question: 'What is your experience with React?'
}, correlationId);

// result.result.answer contains the response
```

**What It Does:**
- Retrieves relevant resume chunks
- Generates bounded answer from candidate data
- Returns answer with confidence score
- Logs question/answer via correlation ID

**Files:**
- `lib/omega/tasks/qaAnswer.ts`

---

### 3. Booking Notifications

**Location:** `app/api/booking` (future)  
**Task:** `booking.notify`  
**Execution:** Fire-and-forget (async)

**Flow:**
```typescript
await dispatchTask('booking.notify', {
  bookingId: booking.id,
  candidateEmail: profile.email,
  recruiterEmail: recruiter.email,
  scheduledAt: booking.scheduledAt
}, correlationId);
```

**What It Does:**
- Sends confirmation email to candidate
- Sends confirmation email to recruiter
- Logs email delivery status

**Files:**
- `lib/omega/tasks/bookingNotify.ts`
- `lib/omega/tools/emailSender.ts`

---

## Correlation ID Threading

All OMEGA tasks use correlation IDs for observability:

```typescript
import { getOrCreateCorrelationId } from '@/lib/omega/correlation';

const correlationId = await getOrCreateCorrelationId();

// Pass to all task dispatches
await dispatchTask('resume.ingest', payload, correlationId);
```

**Format:** `t:silentapply|c:<uuidv7>`

**Logging:**
```json
{
  "level": "info",
  "correlationId": "t:silentapply|c:01234567-89ab-cdef-0123-456789abcdef",
  "event": "task.dispatched",
  "taskId": "task_1234567890_abc123",
  "taskName": "resume.ingest",
  "timestamp": "2026-01-25T12:00:00.000Z"
}
```

---

## Future Integration Points

### 4. Evidence Correlation (Not Yet Implemented)

**Location:** `app/api/evidence` (future)  
**Task:** `evidence.correlate` (future)  
**Execution:** Fire-and-forget (async)

**Purpose:**
- Cross-reference evidence with resume claims
- Detect inconsistencies
- Generate correlation report for Keon

**Dependencies:**
- Keon integration must be wired
- Evidence submission UI must exist

---

### 5. Profile Optimization (Not Yet Implemented)

**Location:** `app/candidate/profile/optimize` (future)  
**Task:** `profile.optimize` (future)  
**Execution:** Synchronous (returns suggestions)

**Purpose:**
- Analyze profile completeness
- Suggest missing evidence
- Recommend profile improvements

**Constraints:**
- Must NOT introduce persuasion language
- Must NOT optimize for "winning" or "crushing"
- Must remain calm and declarative

---

## Task Execution Modes

### Fire-and-Forget (Async)

Use for background tasks that don't need immediate results:

```typescript
await dispatchTask('resume.ingest', payload, correlationId);
// Returns immediately with taskId
```

### Synchronous (Blocking)

Use for tasks that need immediate results:

```typescript
const result = await executeTask('qa.answer', payload, correlationId);
// Waits for completion, returns result
```

---

## Configuration

### Environment Variables

```bash
# OMEGA is always enabled (core functionality)
# No feature flags needed for existing tasks
```

### Task Timeouts

```typescript
// lib/omega/dispatch.ts
const TASK_TIMEOUT_MS = {
  'resume.ingest': 30000,  // 30 seconds
  'qa.answer': 5000,       // 5 seconds
  'booking.notify': 10000  // 10 seconds
};
```

---

## Observability

All OMEGA tasks log structured JSON:

```typescript
import { createCorrelationLogger } from '@/lib/omega/correlation';

const log = createCorrelationLogger(correlationId);

log.info('task.started', { taskId, taskName });
log.error('task.failed', error, { taskId, taskName });
```

**Log Levels:**
- `info` — Normal operation
- `warn` — Degraded operation
- `error` — Failure

---

## Wiring Checklist

Existing tasks are wired. Future tasks require:

- [ ] Create task executor in `lib/omega/tasks/`
- [ ] Add task definition to `lib/omega/dispatch.ts`
- [ ] Add API route to trigger task
- [ ] Add correlation ID threading
- [ ] Add structured logging
- [ ] Add tests

---

## Assumptions

1. OMEGA tasks are stateless (no shared state)
2. Tasks are idempotent (safe to retry)
3. Tasks log all operations for auditability
4. Tasks fail gracefully (no uncaught exceptions)
5. Tasks respect correlation ID threading

---

## Dependencies

**Blocked By:**
- None (existing tasks are wired)

**Blocking:**
- Q&A API endpoint (needs UI)
- Booking API endpoint (needs UI)
- Evidence correlation (needs Keon)

---

## Next Steps

1. Wire Q&A API endpoint when UI is ready
2. Wire booking API endpoint when UI is ready
3. Add evidence correlation task when Keon is wired
4. Add profile optimization task (canon-compliant only)

