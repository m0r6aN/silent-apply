# SilentApply Agent Roster (OMEGA SDK)

This document defines the agents required for SilentApply MVP orchestration.
All agents operate under OMEGA SDK patterns with no bespoke orchestration frameworks.

---

## Agent Principles

1. **Canon Compliance**: All agent behavior must comply with CANON.md
2. **Bounded Authority**: Agents only access data the candidate has chosen to share
3. **No Inference**: Agents never infer, predict, or assume beyond provided facts
4. **Auditability**: All agent actions are logged with correlation IDs
5. **Idempotency**: Agent operations are safe to retry

---

## 1. ResumeIngestAgent

### Purpose
Parses uploaded resume files, extracts text content, and creates searchable chunks for downstream Q&A retrieval.

### Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `correlationId` | `string` | Yes | Request correlation identifier |
| `profileId` | `string` | Yes | Candidate profile identifier |
| `fileReference` | `FileReference` | Yes | Reference to uploaded file in blob storage |
| `fileType` | `"pdf" \| "docx"` | Yes | Document format |

```typescript
interface FileReference {
  blobUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}
```

### Outputs

| Field | Type | Description |
|-------|------|-------------|
| `correlationId` | `string` | Echoed correlation identifier |
| `profileId` | `string` | Echoed profile identifier |
| `status` | `"success" \| "failure"` | Operation result |
| `resumeId` | `string?` | Created resume record ID (on success) |
| `chunkCount` | `number?` | Number of chunks created (on success) |
| `error` | `AgentError?` | Error details (on failure) |

```typescript
interface AgentError {
  code: string;
  message: string;
  retriable: boolean;
}
```

### Tools Invoked

| Tool | Purpose |
|------|---------|
| `DocumentParser` | Extract text from PDF/DOCX |
| `ChunkStore` | Store extracted chunks in database |

### Correlation Handling

- Receives `correlationId` from task dispatch
- Propagates `correlationId` to all tool invocations
- Includes `correlationId` in all log entries
- Returns `correlationId` in output for upstream tracing

### Error Behavior

| Error Code | Meaning | Retriable |
|------------|---------|-----------|
| `PARSE_FAILED` | Document could not be parsed | No |
| `UNSUPPORTED_FORMAT` | File type not supported | No |
| `FILE_NOT_FOUND` | Blob reference invalid | No |
| `STORAGE_ERROR` | Database write failed | Yes |
| `TIMEOUT` | Operation exceeded time limit | Yes |

---

## 2. QAAnswerAgent

### Purpose
Generates bounded answers to recruiter questions using only candidate-approved profile data and resume content.

### Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `correlationId` | `string` | Yes | Request correlation identifier |
| `profileId` | `string` | Yes | Candidate profile identifier |
| `question` | `string` | Yes | Recruiter question text |
| `recruiterEmail` | `string?` | No | Optional recruiter email for context |
| `recruiterName` | `string?` | No | Optional recruiter name for context |

### Outputs

| Field | Type | Description |
|-------|------|-------------|
| `correlationId` | `string` | Echoed correlation identifier |
| `profileId` | `string` | Echoed profile identifier |
| `status` | `"answered" \| "refused" \| "failure"` | Operation result |
| `answer` | `string?` | Generated answer (when answered) |
| `refusalReason` | `string?` | Bounded refusal text (when refused) |
| `qaRecordId` | `string?` | Stored Q&A record ID |
| `error` | `AgentError?` | Error details (on failure) |

### Tools Invoked

| Tool | Purpose |
|------|---------|
| `ProfileLoader` | Load candidate profile data |
| `ResumeChunkLoader` | Load relevant resume chunks for RAG |
| `AnswerGenerator` | Generate bounded answer via LLM |
| `QAStore` | Store Q&A record in database |

### Correlation Handling

- Receives `correlationId` from task dispatch
- Propagates `correlationId` to all tool invocations
- Includes `correlationId` in all log entries
- Logs `qa.answered` or `qa.refused` events with correlation
- Returns `correlationId` in output for upstream tracing

### Answer Generation Rules (Canon Enforcement)

The agent enforces RECRUITER_Q&A_CANON_v1:

1. **Answering Authority**: Only from profile data, resume, and candidate-approved availability
2. **Forbidden Sources**: No inference, assumptions, or external enrichment
3. **Tone**: Calm, declarative, neutral, bounded
4. **Allowed Phrasing**: "This profile indicates...", "The candidate has shared...", "That information isn't available here."
5. **Forbidden Phrasing**: "Based on experience...", "Likely...", "This suggests...", "The best fit would be..."

### Out-of-Scope Detection

Questions are refused if they concern:
- Salary negotiation
- Compensation pressure
- Personal questions
- Legal interpretations
- Guarantees or predictions
- Behavioral hypotheticals

Canon refusal responses:
- "That isn't available here."
- "The candidate hasn't shared that here."
- "You can discuss that directly with the candidate."

### Error Behavior

| Error Code | Meaning | Retriable |
|------------|---------|-----------|
| `PROFILE_NOT_FOUND` | Profile does not exist or is unpublished | No |
| `GENERATION_FAILED` | LLM call failed | Yes |
| `STORAGE_ERROR` | Database write failed | Yes |
| `RATE_LIMITED` | Too many requests for this profile | No |
| `TIMEOUT` | Operation exceeded time limit | Yes |

---

## 3. BookingNotifyAgent

### Purpose
Sends booking confirmation emails to recruiters and optionally notifies candidates when a booking is confirmed.

### Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `correlationId` | `string` | Yes | Request correlation identifier |
| `bookingId` | `string` | Yes | Booking record identifier |
| `profileId` | `string` | Yes | Candidate profile identifier |
| `recruiterEmail` | `string` | Yes | Recruiter email address |
| `recruiterName` | `string?` | No | Recruiter name for personalization |
| `slotStart` | `string` | Yes | ISO 8601 datetime of slot start |
| `slotEnd` | `string` | Yes | ISO 8601 datetime of slot end |
| `notifyCandidate` | `boolean` | Yes | Whether to notify candidate |

### Outputs

| Field | Type | Description |
|-------|------|-------------|
| `correlationId` | `string` | Echoed correlation identifier |
| `bookingId` | `string` | Echoed booking identifier |
| `status` | `"success" \| "partial" \| "failure"` | Operation result |
| `recruiterNotified` | `boolean` | Whether recruiter email was sent |
| `candidateNotified` | `boolean?` | Whether candidate email was sent (if requested) |
| `error` | `AgentError?` | Error details (on failure) |

### Tools Invoked

| Tool | Purpose |
|------|---------|
| `ProfileLoader` | Load candidate profile data for email content |
| `EmailSender` | Send transactional email via ACS |
| `EventLogger` | Log booking.confirmed event |

### Correlation Handling

- Receives `correlationId` from task dispatch
- Propagates `correlationId` to all tool invocations
- Includes `correlationId` in all log entries
- Logs `booking.confirmed` event with correlation
- Returns `correlationId` in output for upstream tracing

### Email Content Rules (Canon Enforcement)

The agent enforces BOOKING_CANON_v1:

1. **Tone**: Factual, minimal, calm
2. **No urgency language**: No countdowns, no "limited availability"
3. **No marketing**: Pure transactional content
4. **Candidate control**: Only notify candidate if opt-in enabled

### Email Templates

**Recruiter Confirmation Email**
- Subject: "Booking confirmed with [Candidate Name]"
- Body: Slot time, candidate name, cancel/reschedule link
- No promotional content

**Candidate Notification Email** (if enabled)
- Subject: "A conversation has been scheduled"
- Body: Slot time, recruiter name (if provided)
- No promotional content

### Error Behavior

| Error Code | Meaning | Retriable |
|------------|---------|-----------|
| `PROFILE_NOT_FOUND` | Profile does not exist | No |
| `EMAIL_SEND_FAILED` | ACS email delivery failed | Yes |
| `INVALID_EMAIL` | Recruiter email format invalid | No |
| `BOOKING_NOT_FOUND` | Booking record does not exist | No |
| `TIMEOUT` | Operation exceeded time limit | Yes |

### Partial Success Handling

If recruiter notification succeeds but candidate notification fails:
- Return `status: "partial"`
- Set `recruiterNotified: true`, `candidateNotified: false`
- Log warning with correlation ID
- Do not retry candidate notification automatically (candidate preference)

---

## Agent Communication Patterns

### Task Dispatch

All agents are invoked via OMEGA SDK task dispatch:

```
API Request
    |
    v
OMEGA Task Dispatch (correlationId assigned)
    |
    v
Agent Invocation (correlationId propagated)
    |
    v
Tool Calls (correlationId propagated)
    |
    v
Agent Response (correlationId echoed)
    |
    v
Task Completion (correlationId logged)
```

### No Direct Agent-to-Agent Communication

Agents do not invoke other agents directly. All orchestration flows through OMEGA task DAGs:

- Task A completes -> OMEGA dispatches Task B
- Never: Agent A calls Agent B

This ensures:
- Clear audit trail
- Correlation integrity
- Failure isolation
- Retry safety

---

## Shared Types

```typescript
interface AgentError {
  code: string;
  message: string;
  retriable: boolean;
}

interface FileReference {
  blobUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

// Standard agent input envelope
interface AgentInput<T> {
  correlationId: string;
  profileId: string;
  payload: T;
}

// Standard agent output envelope
interface AgentOutput<T> {
  correlationId: string;
  status: string;
  payload?: T;
  error?: AgentError;
}
```

---

## Observability Requirements

All agents must emit structured logs with:

| Field | Description |
|-------|-------------|
| `correlationId` | Request correlation identifier |
| `agentName` | Name of the agent |
| `operation` | Current operation being performed |
| `status` | Operation status |
| `durationMs` | Operation duration in milliseconds |
| `error` | Error details if applicable |

Allowed events (per CANON.md):
- `resume.parsed`
- `qa.answered`
- `qa.refused`
- `booking.confirmed`

Forbidden metrics:
- Conversion tracking
- Recruiter scoring
- Behavioral analysis
