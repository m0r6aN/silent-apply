# SilentApply Tool Definitions (OMEGA SDK)

This document defines the tools that agents may invoke within SilentApply workflows. Each tool has a clear contract, idempotency guarantee, and defined side effects.

---

## Tool Design Principles

1. **Single Responsibility**: Each tool does one thing well
2. **Explicit Side Effects**: All side effects are documented
3. **Idempotency Where Possible**: Tools are safe to retry
4. **Correlation Threading**: All tools accept and propagate correlationId
5. **Bounded Output**: Output schemas are well-defined and limited

---

## 1. DocumentParser

### Purpose
Extracts text content from PDF and DOCX resume files.

### Input Schema

```typescript
interface DocumentParserInput {
  correlationId: string;
  fileReference: {
    blobUrl: string;        // Azure Blob Storage URL
    fileName: string;       // Original file name
    contentType: string;    // MIME type
    sizeBytes: number;      // File size in bytes
  };
  fileType: "pdf" | "docx";
  options?: {
    maxPages?: number;      // Limit pages processed (default: 50)
    timeoutMs?: number;     // Per-file timeout (default: 30000)
  };
}
```

### Output Schema

```typescript
interface DocumentParserOutput {
  correlationId: string;
  status: "success" | "failure";
  result?: {
    rawText: string;        // Extracted text content
    pageCount: number;      // Number of pages processed
    characterCount: number; // Total characters extracted
    metadata: {
      title?: string;       // Document title (if available)
      author?: string;      // Document author (if available)
      createdAt?: string;   // Document creation date (if available)
      modifiedAt?: string;  // Document modification date (if available)
    };
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| Blob Read | Reads file from Azure Blob Storage |
| Memory | Temporary memory allocation for parsing |
| None persisted | No database writes |

### Idempotency

**Idempotent**: Yes

Same input produces identical output. No persistent side effects.

### Error Codes

| Code | Meaning | Retriable |
|------|---------|-----------|
| `FILE_NOT_FOUND` | Blob URL does not exist or expired | No |
| `UNSUPPORTED_FORMAT` | File type not PDF or DOCX | No |
| `PARSE_FAILED` | Document structure could not be parsed | No |
| `CORRUPTED_FILE` | File is corrupted or encrypted | No |
| `SIZE_EXCEEDED` | File exceeds maximum size limit | No |
| `TIMEOUT` | Parsing exceeded time limit | Yes |
| `BLOB_ERROR` | Azure Blob Storage error | Yes |

### Implementation Notes

```typescript
// PDF parsing: Use pdf-parse or similar
// DOCX parsing: Use mammoth or similar
// Text normalization:
//   - Collapse multiple whitespace
//   - Remove control characters
//   - Preserve paragraph structure
//   - UTF-8 encoding only
```

### Limits

| Limit | Value |
|-------|-------|
| Max file size | 10 MB |
| Max pages | 50 |
| Max characters | 500,000 |
| Timeout | 30 seconds |

---

## 2. ProfileLoader

### Purpose
Loads candidate profile data by ID for use in Q&A and notifications.

### Input Schema

```typescript
interface ProfileLoaderInput {
  correlationId: string;
  profileId: string;
  fields?: string[];  // Optional: specific fields to load (default: all)
}
```

### Output Schema

```typescript
interface ProfileLoaderOutput {
  correlationId: string;
  status: "success" | "failure";
  profile?: {
    id: string;
    handle: string;
    name: string;
    email: string;
    headline?: string;
    roles: string[];
    location?: string;
    workMode?: "remote" | "hybrid" | "onsite";
    workAuthorization?: string;
    availability?: string;
    published: boolean;
    bookingEnabled: boolean;
    bookingNotificationsEnabled: boolean;
    resumeEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| Database Read | Reads from Profile table |
| None persisted | No database writes |

### Idempotency

**Idempotent**: Yes

Read-only operation. Same input produces consistent output (subject to data changes).

### Error Codes

| Code | Meaning | Retriable |
|------|---------|-----------|
| `PROFILE_NOT_FOUND` | Profile does not exist | No |
| `PROFILE_UNPUBLISHED` | Profile exists but not published | No* |
| `DATABASE_ERROR` | Database connection/query failed | Yes |
| `TIMEOUT` | Query exceeded time limit | Yes |

*Note: Per Canon, `PROFILE_UNPUBLISHED` returns same error as `PROFILE_NOT_FOUND` to avoid information leakage.

### Canon Enforcement

```typescript
// ProfileLoader enforces Canon visibility rules:
async function load(input: ProfileLoaderInput): Promise<ProfileLoaderOutput> {
  const profile = await db.profile.findUnique({
    where: { id: input.profileId }
  });

  // Canon: Unpublished profiles are indistinguishable from non-existent
  if (!profile || !profile.published) {
    return {
      correlationId: input.correlationId,
      status: "failure",
      error: {
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found",
        retriable: false
      }
    };
  }

  return {
    correlationId: input.correlationId,
    status: "success",
    profile
  };
}
```

---

## 3. ResumeChunkLoader

### Purpose
Loads relevant resume chunks for RAG-based Q&A retrieval.

### Input Schema

```typescript
interface ResumeChunkLoaderInput {
  correlationId: string;
  profileId: string;
  query: string;              // Question text for relevance matching
  options?: {
    maxChunks?: number;       // Maximum chunks to return (default: 5)
    minRelevance?: number;    // Minimum relevance score 0-1 (default: 0.7)
    includeMetadata?: boolean; // Include chunk metadata (default: false)
  };
}
```

### Output Schema

```typescript
interface ResumeChunkLoaderOutput {
  correlationId: string;
  status: "success" | "failure";
  result?: {
    hasResume: boolean;       // Whether profile has a resume
    chunks: Array<{
      content: string;        // Chunk text content
      relevanceScore: number; // 0-1 relevance to query
      chunkIndex?: number;    // Position in original document
      metadata?: {
        charStart: number;
        charEnd: number;
      };
    }>;
    totalChunksAvailable: number;
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| Database Read | Reads from ResumeChunk table |
| Vector Search | Performs embedding similarity search |
| None persisted | No database writes |

### Idempotency

**Idempotent**: Yes

Read-only operation. Results may vary slightly due to vector similarity scoring but are deterministic given same embeddings.

### Error Codes

| Code | Meaning | Retriable |
|------|---------|-----------|
| `PROFILE_NOT_FOUND` | Profile does not exist | No |
| `NO_RESUME` | Profile has no uploaded resume | No* |
| `EMBEDDING_FAILED` | Query embedding generation failed | Yes |
| `DATABASE_ERROR` | Database connection/query failed | Yes |
| `TIMEOUT` | Search exceeded time limit | Yes |

*Note: `NO_RESUME` is not an error for Q&A flow - returns empty chunks array.

### Implementation Notes

```typescript
// Chunk retrieval flow:
// 1. Generate embedding for query
// 2. Vector similarity search against chunk embeddings
// 3. Filter by minimum relevance
// 4. Return top N chunks ordered by relevance

async function load(input: ResumeChunkLoaderInput): Promise<ResumeChunkLoaderOutput> {
  const { profileId, query, options } = input;
  const maxChunks = options?.maxChunks ?? 5;
  const minRelevance = options?.minRelevance ?? 0.7;

  // Check if resume exists
  const resume = await db.resume.findFirst({
    where: { profileId }
  });

  if (!resume) {
    return {
      correlationId: input.correlationId,
      status: "success",
      result: {
        hasResume: false,
        chunks: [],
        totalChunksAvailable: 0
      }
    };
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Vector similarity search
  const chunks = await db.$queryRaw`
    SELECT content, 1 - (embedding <=> ${queryEmbedding}) as relevance
    FROM resume_chunk
    WHERE resume_id = ${resume.id}
    AND 1 - (embedding <=> ${queryEmbedding}) >= ${minRelevance}
    ORDER BY relevance DESC
    LIMIT ${maxChunks}
  `;

  return {
    correlationId: input.correlationId,
    status: "success",
    result: {
      hasResume: true,
      chunks: chunks.map(c => ({
        content: c.content,
        relevanceScore: c.relevance
      })),
      totalChunksAvailable: await db.resumeChunk.count({
        where: { resumeId: resume.id }
      })
    }
  };
}
```

---

## 4. AnswerGenerator

### Purpose
Generates bounded Q&A answers using LLM with strict Canon compliance.

### Input Schema

```typescript
interface AnswerGeneratorInput {
  correlationId: string;
  profile: {
    name: string;
    headline?: string;
    roles: string[];
    location?: string;
    workMode?: string;
    workAuthorization?: string;
    availability?: string;
  };
  chunks: Array<{
    content: string;
    relevanceScore: number;
  }>;
  question: string;
  options?: {
    maxTokens?: number;     // Max response tokens (default: 200)
    temperature?: number;   // LLM temperature (default: 0.3)
  };
}
```

### Output Schema

```typescript
interface AnswerGeneratorOutput {
  correlationId: string;
  status: "success" | "failure";
  result?: {
    type: "answered" | "refused";
    answer?: string;          // When type = "answered"
    refusalReason?: string;   // When type = "refused"
    tokensUsed: number;
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| LLM API Call | External call to LLM provider |
| Token Consumption | Uses LLM tokens (cost) |
| None persisted | No database writes |

### Idempotency

**Partially Idempotent**: LLM responses may vary slightly, but behavior is deterministic (answer vs refuse).

### Error Codes

| Code | Meaning | Retriable |
|------|---------|-----------|
| `GENERATION_FAILED` | LLM API call failed | Yes |
| `CONTENT_FILTER` | LLM content filter triggered | No |
| `RATE_LIMITED` | LLM API rate limit exceeded | Yes |
| `TIMEOUT` | LLM call exceeded time limit | Yes |
| `INVALID_INPUT` | Input validation failed | No |

### Canon Enforcement (CRITICAL)

The AnswerGenerator must enforce RECRUITER_Q&A_CANON_v1:

```typescript
const SYSTEM_PROMPT = `
You are a bounded Q&A system for a professional profile. You must follow these rules strictly:

ANSWERING AUTHORITY:
You may ONLY answer using information explicitly provided in:
1. The profile data below
2. The resume chunks below

FORBIDDEN:
- Do not infer or assume anything not explicitly stated
- Do not use external knowledge
- Do not make predictions or guarantees
- Do not offer opinions or recommendations

TONE:
- Calm, declarative, neutral, bounded
- Use phrases like: "This profile indicates...", "The candidate has shared..."
- Never use: "Based on experience...", "Likely...", "This suggests..."

OUT-OF-SCOPE QUESTIONS (MUST REFUSE):
- Salary or compensation
- Personal questions
- Legal interpretations
- Guarantees or predictions
- Behavioral hypotheticals

REFUSAL RESPONSES (use exactly):
- "That isn't available here."
- "The candidate hasn't shared that here."
- "You can discuss that directly with the candidate."

NEVER:
- Apologize
- Explain why you can't answer
- Redirect to other services
- Use urgency or persuasion
`;
```

### Implementation Notes

```typescript
async function generate(input: AnswerGeneratorInput): Promise<AnswerGeneratorOutput> {
  const { profile, chunks, question, options } = input;

  // Build context from profile and chunks
  const profileContext = formatProfileContext(profile);
  const resumeContext = chunks.map(c => c.content).join("\n\n");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `
PROFILE DATA:
${profileContext}

RESUME CONTENT:
${resumeContext || "No resume available."}

QUESTION:
${question}

Respond according to the rules. If you cannot answer from the provided information, use a refusal response.
` }
  ];

  try {
    const response = await llm.chat({
      messages,
      max_tokens: options?.maxTokens ?? 200,
      temperature: options?.temperature ?? 0.3
    });

    const answer = response.choices[0].message.content;

    // Classify response
    const isRefusal = REFUSAL_PATTERNS.some(p => answer.includes(p));

    return {
      correlationId: input.correlationId,
      status: "success",
      result: {
        type: isRefusal ? "refused" : "answered",
        answer: isRefusal ? undefined : answer,
        refusalReason: isRefusal ? answer : undefined,
        tokensUsed: response.usage.total_tokens
      }
    };
  } catch (error) {
    return {
      correlationId: input.correlationId,
      status: "failure",
      error: {
        code: classifyLLMError(error),
        message: error.message,
        retriable: isRetriableLLMError(error)
      }
    };
  }
}

const REFUSAL_PATTERNS = [
  "That isn't available here",
  "The candidate hasn't shared that",
  "You can discuss that directly"
];
```

### Limits

| Limit | Value |
|-------|-------|
| Max input tokens | 4000 |
| Max output tokens | 200 |
| Timeout | 15 seconds |
| Temperature | 0.3 (low variance) |

---

## 5. EmailSender

### Purpose
Sends transactional emails via Azure Communication Services (ACS).

### Input Schema

```typescript
interface EmailSenderInput {
  correlationId: string;
  template: "booking_confirmation" | "booking_cancelled" | "candidate_notification";
  to: {
    email: string;
    name?: string;
  };
  data: Record<string, any>;  // Template-specific data
  options?: {
    replyTo?: string;
    importance?: "normal" | "high";
  };
}
```

### Template Data Schemas

```typescript
// booking_confirmation
interface BookingConfirmationData {
  candidateName: string;
  slotDate: string;       // Formatted date
  slotTime: string;       // Formatted time
  cancelLink: string;
}

// booking_cancelled
interface BookingCancelledData {
  candidateName: string;
  slotDate: string;
  slotTime: string;
}

// candidate_notification
interface CandidateNotificationData {
  recruiterName?: string;
  slotDate: string;
  slotTime: string;
  dashboardLink: string;
}
```

### Output Schema

```typescript
interface EmailSenderOutput {
  correlationId: string;
  status: "success" | "failure";
  result?: {
    messageId: string;      // ACS message ID
    sentAt: string;         // ISO 8601 timestamp
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| Email Sent | Sends email via ACS SMTP |
| ACS Logging | ACS logs delivery attempt |
| Cost | Consumes ACS email quota |

### Idempotency

**Not Idempotent**: Each invocation sends a new email.

Use idempotency keys at the workflow level to prevent duplicate sends.

### Error Codes

| Code | Meaning | Retriable |
|------|---------|-----------|
| `INVALID_EMAIL` | Recipient email format invalid | No |
| `TEMPLATE_NOT_FOUND` | Unknown template name | No |
| `SEND_FAILED` | ACS send operation failed | Yes |
| `RATE_LIMITED` | ACS rate limit exceeded | Yes |
| `DOMAIN_NOT_VERIFIED` | Sender domain not verified | No |
| `TIMEOUT` | Send operation exceeded time limit | Yes |

### Email Templates (Canon Compliant)

```typescript
const TEMPLATES = {
  booking_confirmation: {
    subject: "Booking confirmed with {candidateName}",
    body: `
A conversation has been scheduled.

Date: {slotDate}
Time: {slotTime}

To cancel or reschedule:
{cancelLink}

---
SilentApply
`
  },

  candidate_notification: {
    subject: "A conversation has been scheduled",
    body: `
A recruiter has booked a conversation.

Date: {slotDate}
Time: {slotTime}
{recruiterName ? With: {recruiterName} : ""}

To manage your availability:
{dashboardLink}

---
SilentApply
`
  },

  booking_cancelled: {
    subject: "Booking cancelled",
    body: `
A scheduled conversation has been cancelled.

Original date: {slotDate}
Original time: {slotTime}

No further action is needed.

---
SilentApply
`
  }
};
```

### Canon Enforcement

Per BOOKING_CANON_v1, emails must be:
- Factual
- Minimal
- No urgency language
- No marketing content
- No "don't miss" or "limited" phrasing

### Implementation Notes

```typescript
async function send(input: EmailSenderInput): Promise<EmailSenderOutput> {
  const { correlationId, template, to, data, options } = input;

  // Validate email format
  if (!isValidEmail(to.email)) {
    return {
      correlationId,
      status: "failure",
      error: {
        code: "INVALID_EMAIL",
        message: "Invalid email format",
        retriable: false
      }
    };
  }

  // Get template
  const templateDef = TEMPLATES[template];
  if (!templateDef) {
    return {
      correlationId,
      status: "failure",
      error: {
        code: "TEMPLATE_NOT_FOUND",
        message: `Unknown template: ${template}`,
        retriable: false
      }
    };
  }

  // Render template
  const subject = renderTemplate(templateDef.subject, data);
  const body = renderTemplate(templateDef.body, data);

  // Send via ACS
  try {
    const result = await acs.sendEmail({
      from: "noreply@silentapply.com",
      to: [{ address: to.email, displayName: to.name }],
      subject,
      plainText: body,
      replyTo: options?.replyTo,
      importance: options?.importance ?? "normal"
    });

    return {
      correlationId,
      status: "success",
      result: {
        messageId: result.id,
        sentAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      correlationId,
      status: "failure",
      error: {
        code: classifyACSError(error),
        message: error.message,
        retriable: isRetriableACSError(error)
      }
    };
  }
}
```

---

## 6. ChunkStore (Internal Tool)

### Purpose
Stores resume text chunks in the database for RAG retrieval.

### Input Schema

```typescript
interface ChunkStoreInput {
  correlationId: string;
  profileId: string;
  resumeId: string;
  chunks: Array<{
    index: number;
    content: string;
    charStart: number;
    charEnd: number;
  }>;
}
```

### Output Schema

```typescript
interface ChunkStoreOutput {
  correlationId: string;
  status: "success" | "failure";
  result?: {
    chunksStored: number;
    resumeId: string;
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| Database Write | Inserts/updates ResumeChunk records |
| Embedding Generation | Generates embeddings for each chunk |
| Previous Chunks Deleted | Replaces existing chunks for resume |

### Idempotency

**Idempotent**: Upserting with same resumeId produces identical state.

---

## 7. QAStore (Internal Tool)

### Purpose
Stores Q&A records in the database.

### Input Schema

```typescript
interface QAStoreInput {
  correlationId: string;
  profileId: string;
  question: string;
  answer: string;
  answerType: "answered" | "refused";
  recruiterEmail?: string;
  recruiterName?: string;
}
```

### Output Schema

```typescript
interface QAStoreOutput {
  correlationId: string;
  status: "success" | "failure";
  result?: {
    qaRecordId: string;
    storedAt: string;
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| Database Write | Inserts QA record |

### Idempotency

**Not Idempotent**: Each invocation creates a new record.

Duplicate prevention handled at workflow level via idempotency keys.

### Canon Enforcement

Per RECRUITER_Q&A_CANON_v1, stored data:
- Does NOT include cross-profile recruiter linkage
- Does NOT include behavioral scoring
- Is per-profile, not per-recruiter

---

## 8. EventLogger (Internal Tool)

### Purpose
Emits structured events for observability.

### Input Schema

```typescript
interface EventLoggerInput {
  correlationId: string;
  eventType: string;
  payload: Record<string, any>;
}
```

### Output Schema

```typescript
interface EventLoggerOutput {
  correlationId: string;
  status: "success" | "failure";
  result?: {
    eventId: string;
    emittedAt: string;
  };
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}
```

### Side Effects

| Effect | Description |
|--------|-------------|
| Log Write | Writes to logging infrastructure |
| Event Bus Publish | Optionally publishes to event bus |

### Allowed Events (Canon)

| Event Type | Workflow |
|------------|----------|
| `profile.viewed` | Public profile |
| `resume.parsed` | resume.ingest |
| `resume.downloaded` | Public profile |
| `qa.answered` | qa.answer |
| `qa.refused` | qa.answer |
| `booking.hold_created` | Booking flow |
| `booking.hold_expired` | Background job |
| `booking.confirmed` | booking.notify |
| `booking.cancelled` | Booking flow |

### Forbidden Events (Canon)

- Conversion metrics
- Recruiter scoring
- Session replay data
- Cross-profile tracking

---

## Tool Invocation Patterns

### Standard Invocation

```typescript
// All tool invocations follow this pattern:
const result = await tool.execute({
  correlationId: context.correlationId,
  ...toolSpecificInput
});

// Log tool completion
logger.info({
  event: "tool.completed",
  correlationId: context.correlationId,
  toolName: tool.name,
  status: result.status,
  durationMs: Date.now() - startTime
});

// Handle result
if (result.status === "failure") {
  if (result.error.retriable) {
    throw new RetriableError(result.error);
  }
  throw new FatalError(result.error);
}

return result.result;
```

### Error Handling

```typescript
try {
  return await tool.execute(input);
} catch (error) {
  logger.error({
    event: "tool.failed",
    correlationId: input.correlationId,
    toolName: tool.name,
    errorCode: error.code,
    errorMessage: error.message,
    retriable: error.retriable
  });
  throw error;
}
```

---

## Summary Table

| Tool | Purpose | Side Effects | Idempotent |
|------|---------|--------------|------------|
| DocumentParser | Parse PDF/DOCX | Blob read | Yes |
| ProfileLoader | Load profile data | DB read | Yes |
| ResumeChunkLoader | Load resume chunks | DB read, vector search | Yes |
| AnswerGenerator | Generate Q&A answer | LLM API call | Partial |
| EmailSender | Send transactional email | ACS send | No |
| ChunkStore | Store resume chunks | DB write | Yes |
| QAStore | Store Q&A record | DB write | No |
| EventLogger | Emit events | Log write | Yes |
