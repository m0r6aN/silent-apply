# SilentApply Failure Semantics (OMEGA SDK)

This document defines retry behavior, failure states, idempotency requirements, and error surfacing for SilentApply task orchestration.

---

## Design Principles

1. **Fail Closed for Privacy**: When uncertain, protect candidate data
2. **Fail Open for Availability**: Where Canon requires calm continuity, prefer graceful degradation
3. **No Silent Data Loss**: All failures are logged with correlation
4. **Deterministic Behavior**: Same input + same state = same output
5. **Auditability**: Every failure can be traced and explained

---

## Default Retry Configuration

### Global Defaults

| Setting | Value | Rationale |
|---------|-------|-----------|
| Max Retries | 3 | Balance between resilience and latency |
| Initial Backoff | 1000ms | Allow transient issues to resolve |
| Max Backoff | 10000ms | Prevent excessive delays |
| Backoff Multiplier | 2.0 | Exponential growth |
| Jitter | 0-500ms | Prevent thundering herd |

### Backoff Formula

```
delay = min(initialBackoff * (multiplier ^ attemptNumber) + random(0, jitter), maxBackoff)
```

**Example Sequence**:
- Attempt 1: 1000ms + jitter
- Attempt 2: 2000ms + jitter
- Attempt 3: 4000ms + jitter
- (Max retries exhausted)

### Per-Workflow Overrides

| Workflow | Max Retries | Initial Backoff | Notes |
|----------|-------------|-----------------|-------|
| `resume.ingest` | 3 | 1000ms | Standard retry for storage operations |
| `qa.answer` | 3 | 500ms | Lower backoff for user-facing latency |
| `booking.notify` | 3 | 1000ms | Standard retry for email delivery |

---

## Failure States

### State Definitions

| State | Code | Meaning | Retriable |
|-------|------|---------|-----------|
| `VALIDATION_FAILED` | 400 | Input did not pass validation | No |
| `NOT_FOUND` | 404 | Resource does not exist | No |
| `UNAUTHORIZED` | 401 | Authentication required | No |
| `FORBIDDEN` | 403 | Access denied | No |
| `RATE_LIMITED` | 429 | Too many requests | No* |
| `TRANSIENT_ERROR` | 503 | Temporary service unavailable | Yes |
| `STORAGE_ERROR` | 500 | Database operation failed | Yes |
| `EXTERNAL_ERROR` | 502 | External service (LLM, email) failed | Yes |
| `TIMEOUT` | 504 | Operation exceeded time limit | Yes |
| `UNKNOWN_ERROR` | 500 | Unexpected error | Yes |

*Rate limiting is handled via shadow suppression per Canon, not retries.

### State Transitions

```
[Pending] --start--> [Running]
    |                    |
    |                    +--success--> [Completed]
    |                    |
    |                    +--retriable error--> [Retrying]
    |                    |                         |
    |                    |                         +--max retries--> [Failed]
    |                    |                         |
    |                    |                         +--retry--> [Running]
    |                    |
    |                    +--non-retriable error--> [Failed]
    |
    +--validation error--> [Failed]
```

### Terminal States

| State | Surfaced to API | User Message | Logged |
|-------|-----------------|--------------|--------|
| `Completed` | Yes (200) | Success response | Yes |
| `Failed` | Yes (4xx/5xx) | Appropriate error | Yes |

---

## Error Classification

### Non-Retriable Errors

These errors indicate a permanent failure that retrying will not resolve.

| Error Code | Workflow | Meaning | API Response |
|------------|----------|---------|--------------|
| `VALIDATION_FAILED` | All | Input schema invalid | 400 Bad Request |
| `PROFILE_NOT_FOUND` | All | Profile does not exist or unpublished | 404 Not Found |
| `BOOKING_NOT_FOUND` | booking.notify | Booking record does not exist | 404 Not Found |
| `INVALID_EMAIL` | booking.notify | Email format invalid | 400 Bad Request |
| `PARSE_FAILED` | resume.ingest | Document cannot be parsed | 422 Unprocessable |
| `UNSUPPORTED_FORMAT` | resume.ingest | File type not supported | 422 Unprocessable |
| `FILE_NOT_FOUND` | resume.ingest | Blob reference invalid | 404 Not Found |
| `RATE_LIMITED` | qa.answer | Rate limit exceeded | Shadow suppression* |

*Per Canon: Rate limiting returns apparent success to prevent information leakage about abuse thresholds.

### Retriable Errors

These errors may resolve on retry due to transient conditions.

| Error Code | Workflow | Retry Strategy | Max Attempts |
|------------|----------|----------------|--------------|
| `STORAGE_ERROR` | All | Exponential backoff | 3 |
| `GENERATION_FAILED` | qa.answer | Exponential backoff | 3 |
| `EMAIL_SEND_FAILED` | booking.notify | Exponential backoff | 3 |
| `TIMEOUT` | All | Exponential backoff | 3 |
| `EXTERNAL_ERROR` | All | Exponential backoff | 3 |

---

## Idempotency Requirements

### Why Idempotency Matters

1. **Safe Retries**: Failed operations can be retried without side effects
2. **Exactly-Once Semantics**: Duplicate requests produce identical results
3. **Crash Recovery**: System can resume after failures

### Idempotency Key Generation

| Workflow | Key Formula | TTL |
|----------|-------------|-----|
| `resume.ingest` | `{profileId}:{sha256(fileContent)}` | 24 hours |
| `qa.answer` | `{profileId}:{sha256(question)}:{hourBucket}` | 1 hour |
| `booking.notify` | `{bookingId}` | 24 hours |

### Idempotency Behavior

```typescript
interface IdempotencyRecord {
  key: string;
  correlationId: string;
  status: "pending" | "completed" | "failed";
  result?: any;
  createdAt: string;
  expiresAt: string;
}
```

**On Request**:
1. Compute idempotency key
2. Check Redis for existing record
3. If found and `status === "completed"`: Return cached result
4. If found and `status === "pending"`: Wait or return conflict
5. If not found: Create pending record, execute workflow

**On Completion**:
1. Update record with `status: "completed"` and result
2. Set TTL for expiration

**On Failure**:
1. If retriable: Keep record as `pending`, allow retry
2. If non-retriable: Update record with `status: "failed"`

### Idempotency Storage

```
Redis Key: sa:idem:{workflow}:{idempotencyKey}
TTL: Varies by workflow (see table above)
```

---

## Error Surfacing to API Layer

### API Response Format

All errors are surfaced using a consistent format:

```typescript
interface APIErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message (bounded, per Canon)
    correlationId: string;  // For support/debugging
  };
}
```

### Error Code to HTTP Status Mapping

| Error Code | HTTP Status | Response Body |
|------------|-------------|---------------|
| `VALIDATION_FAILED` | 400 | `{ error: { code, message, correlationId } }` |
| `PROFILE_NOT_FOUND` | 404 | `{ error: { code: "NOT_FOUND", message, correlationId } }` |
| `BOOKING_NOT_FOUND` | 404 | `{ error: { code: "NOT_FOUND", message, correlationId } }` |
| `INVALID_EMAIL` | 400 | `{ error: { code, message, correlationId } }` |
| `PARSE_FAILED` | 422 | `{ error: { code, message, correlationId } }` |
| `UNSUPPORTED_FORMAT` | 422 | `{ error: { code, message, correlationId } }` |
| `STORAGE_ERROR` | 500 | `{ error: { code: "INTERNAL_ERROR", message, correlationId } }` |
| `GENERATION_FAILED` | 500 | `{ error: { code: "INTERNAL_ERROR", message, correlationId } }` |
| `EMAIL_SEND_FAILED` | 500 | `{ error: { code: "INTERNAL_ERROR", message, correlationId } }` |
| `TIMEOUT` | 504 | `{ error: { code: "TIMEOUT", message, correlationId } }` |

### Error Message Rules (Canon Compliance)

Per CANON.md, error messages must be:
- Bounded (no excessive detail)
- No apologies
- No explanations beyond necessary

**Allowed**:
- "That resource was not found."
- "The request could not be processed."
- "Please try again later."

**Forbidden**:
- "We're sorry, but..."
- "Unfortunately..."
- Detailed technical explanations
- Stack traces (logged, never surfaced)

---

## Shadow Suppression (Rate Limiting)

### Rationale

Per Canon, SilentApply does not reveal abuse thresholds or blocking status. Rate limiting uses shadow suppression.

### Implementation

```typescript
async function handleQARequest(input: QAAnswerInput): Promise<QAAnswerOutput> {
  const isLimited = await checkRateLimit(`sa:qa:profile:${input.profileId}`);

  if (isLimited) {
    // Shadow suppress: Log internally, return apparent success
    logger.warn({
      correlationId: input.correlationId,
      event: "qa.rate_limited",
      profileId: input.profileId
    });

    // Return a generic bounded response
    return {
      correlationId: input.correlationId,
      status: "answered",
      answer: "That information isn't available here."
    };
  }

  // Continue normal processing
  return await executeQAWorkflow(input);
}
```

### Rate Limit Thresholds

| Endpoint | Threshold | Window | Key |
|----------|-----------|--------|-----|
| Q&A | 10 requests | 15 minutes | `sa:qa:profile:{profileId}` |
| Booking Hold | 5 requests | 15 minutes | `sa:booking:hold:{profileId}:{ip}` |
| Booking Confirm | 3 requests | 15 minutes | `sa:booking:confirm:{profileId}:{ip}` |

---

## Partial Failure Handling

### booking.notify Partial Success

When recruiter notification succeeds but candidate notification fails:

```typescript
interface BookingNotifyOutput {
  correlationId: string;
  status: "partial";  // Indicates partial success
  recruiterNotified: true;
  candidateNotified: false;
  warning: {
    code: "CANDIDATE_EMAIL_FAILED";
    message: "Recruiter notified. Candidate notification could not be sent.";
  };
}
```

**Behavior**:
- API returns 200 with partial status
- Warning is logged with correlation
- No automatic retry for candidate email (respects candidate preference)

### resume.ingest with Optional Metadata

If metadata extraction fails but text extraction succeeds:

```typescript
interface ResumeIngestOutput {
  correlationId: string;
  status: "success";
  resumeId: string;
  chunkCount: number;
  warnings: [{
    code: "METADATA_EXTRACTION_FAILED";
    message: "Resume processed without metadata.";
  }];
}
```

---

## Circuit Breaker Pattern

### When Applied

Circuit breakers protect against cascading failures for external dependencies:

| Dependency | Failure Threshold | Recovery Time |
|------------|-------------------|---------------|
| LLM API | 5 failures / 30 seconds | 60 seconds |
| Email API | 5 failures / 30 seconds | 60 seconds |
| Database | 10 failures / 30 seconds | 30 seconds |

### States

```
[Closed] --failure threshold--> [Open] --recovery time--> [Half-Open]
    ^                                                          |
    |                                                          |
    +-------------------success--------------------------------+
    |
    +-------------------failure--------------------------------> [Open]
```

### Behavior When Open

```typescript
if (circuitBreaker.isOpen("llm-api")) {
  throw new ExternalError({
    code: "SERVICE_UNAVAILABLE",
    message: "Please try again later.",
    retriable: false  // Don't retry while circuit is open
  });
}
```

---

## Failure Logging Requirements

### Structured Log Format

All failures must be logged with:

```typescript
interface FailureLog {
  timestamp: string;
  correlationId: string;
  workflow: string;
  step: string;
  errorCode: string;
  errorMessage: string;
  retriable: boolean;
  attemptNumber: number;
  maxAttempts: number;
  context: {
    profileId?: string;
    bookingId?: string;
    [key: string]: any;
  };
  stack?: string;  // Only in non-production or debug mode
}
```

### Log Levels

| Scenario | Level |
|----------|-------|
| Non-retriable failure | ERROR |
| Retry attempt | WARN |
| Max retries exhausted | ERROR |
| Shadow suppression | WARN |
| Partial success | WARN |
| Circuit breaker open | ERROR |

---

## Recovery Procedures

### Manual Intervention Triggers

| Condition | Action |
|-----------|--------|
| > 10% error rate for 5 minutes | Alert on-call |
| Circuit breaker open > 5 minutes | Alert on-call |
| Database connection failures | Alert on-call |
| Email delivery rate < 90% | Alert on-call |

### Replay Queue

Failed tasks that may be recoverable are placed in a replay queue:

```typescript
interface ReplayQueueEntry {
  correlationId: string;
  workflow: string;
  input: any;
  failedAt: string;
  errorCode: string;
  attemptCount: number;
}
```

Replay is triggered manually or by scheduled job after incident resolution.

---

## Summary Table

| Aspect | Specification |
|--------|--------------|
| Max Retries | 3 (default) |
| Backoff Strategy | Exponential with jitter |
| Initial Backoff | 500-1000ms |
| Max Backoff | 10000ms |
| Idempotency | Required for all workflows |
| Non-Retriable Errors | Immediate failure, no retry |
| Rate Limiting | Shadow suppression (no error surfacing) |
| Partial Failures | Supported, surfaced with warnings |
| Circuit Breakers | Applied to external dependencies |
| Error Surfacing | Bounded messages, correlation IDs always included |
