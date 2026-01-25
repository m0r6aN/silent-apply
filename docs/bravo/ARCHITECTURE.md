# Team Bravo — API Architecture

Visual representation of the API layer's role in SilentApply.

---

## System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         SilentApply MVP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Candidate  │         │  Recruiter   │                     │
│  │   (authed)   │         │  (no auth)   │                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                              │
│         │                        │                              │
│         ▼                        ▼                              │
│  ┌─────────────────────────────────────────┐                   │
│  │        Team Charlie (Quiet UX)          │                   │
│  │  - Next.js App Router pages             │                   │
│  │  - Client-side state management         │                   │
│  │  - Form validation                      │                   │
│  └─────────────┬───────────────────────────┘                   │
│                │                                                │
│                │ HTTP + X-Correlation-ID                        │
│                ▼                                                │
│  ┌─────────────────────────────────────────┐                   │
│  │       Team Bravo (API / Contracts)      │ ◄── YOU ARE HERE  │
│  │  - OpenAPI spec                         │                   │
│  │  - DTO schemas                          │                   │
│  │  - Correlation propagation              │                   │
│  │  - OMEGA task triggers                  │                   │
│  └─────────────┬───────────────────────────┘                   │
│                │                                                │
│                │ Task Queue (BullMQ)                            │
│                ▼                                                │
│  ┌─────────────────────────────────────────┐                   │
│  │      Team OMEGA (Orchestration)         │                   │
│  │  - Resume ingestion                     │                   │
│  │  - Q&A answer generation                │                   │
│  │  - Booking notifications                │                   │
│  └─────────────┬───────────────────────────┘                   │
│                │                                                │
│                │ Prisma ORM                                     │
│                ▼                                                │
│  ┌─────────────────────────────────────────┐                   │
│  │        Team Delta (Data Layer)          │                   │
│  │  - Prisma schema                        │                   │
│  │  - Migrations                           │                   │
│  │  - Query optimization                   │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                        Team Bravo Scope                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request Flow:                                                   │
│                                                                  │
│  1. HTTP Request (with optional X-Correlation-ID)               │
│     │                                                            │
│     ▼                                                            │
│  2. Correlation Middleware                                       │
│     - Extract or generate correlation ID                        │
│     - Validate format: t:<tenant>|c:<uuidv7>                    │
│     - Attach to request context                                 │
│     │                                                            │
│     ▼                                                            │
│  3. Rate Limit Middleware (Redis)                               │
│     - Check request count for IP/profileId                      │
│     - Return 429 if exceeded (quiet, no countdown)              │
│     │                                                            │
│     ▼                                                            │
│  4. Auth Middleware (NextAuth)                                  │
│     - Verify session cookie (if endpoint requires auth)         │
│     - Attach user/profile to context                            │
│     │                                                            │
│     ▼                                                            │
│  5. Validation Layer (Zod)                                      │
│     - Validate request body against DTO schema                  │
│     - Return 400 with ErrorDTO if invalid                       │
│     │                                                            │
│     ▼                                                            │
│  6. Business Logic Handler                                      │
│     - Read/write database (Prisma)                              │
│     - Trigger OMEGA task if needed                              │
│     - Log with correlation ID                                   │
│     │                                                            │
│     ▼                                                            │
│  7. Response Formatter                                          │
│     - Serialize DTO to JSON                                     │
│     - Add X-Correlation-ID header                               │
│     - Return HTTP response                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Correlation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Correlation Lifecycle                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client Request                                                  │
│  │                                                               │
│  ▼                                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ HTTP Headers                                              │  │
│  │ X-Correlation-ID: t:default|c:01932a3c-4b5e-7890-...     │  │
│  │                                    (optional)             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ API Handler                                               │  │
│  │ - Extract or generate correlation ID                     │  │
│  │ - Log: "Request received"                                │  │
│  │ - Process request                                        │  │
│  │ - Log: "Response sent"                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ├────► Prisma query (log with ID)     │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ OMEGA Task Queue                                          │  │
│  │ {                                                         │  │
│  │   taskName: "resume.ingest",                             │  │
│  │   correlationId: "t:default|c:01932a3c-4b5e-7890-...",   │  │
│  │   payload: { resumeId, fileUrl }                         │  │
│  │ }                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ OMEGA Worker                                              │  │
│  │ - Log: "Task started" (with correlation ID)              │  │
│  │ - Execute tools (PDF parsing, embedding, etc.)           │  │
│  │ - Log: "Task completed" (with correlation ID)            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Azure Log Analytics                                       │  │
│  │ Query: Find all logs for correlation ID                  │  │
│  │ Result: Full trace across API → OMEGA → Tools            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoint Groups

### 1. Profile Endpoints (Authenticated)

```
GET    /api/profile          → ProfileDTO
PUT    /api/profile          → ProfileDTO
POST   /api/profile/publish  → ProfileDTO
```

**Characteristics:**
- Requires NextAuth session
- No OMEGA triggers (pure CRUD)
- Immediate response

---

### 2. Public Profile Endpoint (No Auth)

```
GET    /api/profile/[handle] → PublicProfileDTO | 404
```

**Characteristics:**
- No authentication required
- Returns 404 if unpublished (no explanation)
- Respects visibility settings
- Canon-compliant: calm, bounded, no tracking

---

### 3. Resume Endpoints

```
POST   /api/resume           → ResumeUploadResponse (triggers OMEGA)
GET    /api/resume/download  → Binary file | 403
```

**Characteristics:**
- Upload triggers `resume.ingest` task
- Download requires `resumeDownloadable: true`
- Async processing (OMEGA handles parsing)

---

### 4. Q&A Endpoints (Public)

```
POST   /api/qa               → { threadId, status: "processing" } (triggers OMEGA)
GET    /api/qa/[profileId]   → QAHistoryDTO[]
```

**Characteristics:**
- No authentication required
- Rate limited quietly
- Triggers `qa.answer` task
- Bounded answers only

---

### 5. Booking Endpoints (Public)

```
GET    /api/booking/[profileId] → BookingSlotDTO[]
POST   /api/booking/hold        → BookingHoldResponse
POST   /api/booking/confirm     → BookingConfirmResponse (triggers OMEGA)
POST   /api/booking/cancel      → { slotId, status: "open" }
```

**Characteristics:**
- No authentication required
- Rate limited quietly
- Idempotent where safe (hold, confirm)
- Triggers `booking.notify` task on confirm

---

## Data Flow: Resume Upload Example

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/resume                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Client uploads file (multipart/form-data)                   │
│     │                                                            │
│     ▼                                                            │
│  2. API validates file (type, size)                             │
│     │                                                            │
│     ├─ Invalid → 400 Bad Request                                │
│     │                                                            │
│     ▼                                                            │
│  3. Upload to Azure Blob Storage                                │
│     │                                                            │
│     └─ fileUrl: "https://storage.blob.../resume.pdf"            │
│     │                                                            │
│     ▼                                                            │
│  4. Create Resume record in database                            │
│     │                                                            │
│     └─ resumeId: "abc123..."                                    │
│     │                                                            │
│     ▼                                                            │
│  5. Trigger OMEGA task: resume.ingest                           │
│     │                                                            │
│     └─ Queue task with correlation ID                           │
│     │                                                            │
│     ▼                                                            │
│  6. Return 201 Created immediately                              │
│     │                                                            │
│     └─ { resumeId, status: "uploaded" }                         │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  7. OMEGA worker picks up task (async)                          │
│     │                                                            │
│     ├─ Download file from blob storage                          │
│     ├─ Extract text (PDF → plaintext)                           │
│     ├─ Chunk text into semantic units                           │
│     ├─ Generate embeddings                                      │
│     └─ Store chunks in resume_chunks table                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** API returns immediately. OMEGA processes asynchronously.

---

## Data Flow: Q&A Question Example

```
┌─────────────────────────────────────────────────────────────────┐
│                      POST /api/qa                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Recruiter submits question (no auth)                        │
│     │                                                            │
│     └─ { profileId, question, email? }                          │
│     │                                                            │
│     ▼                                                            │
│  2. Rate limit check (Redis)                                    │
│     │                                                            │
│     ├─ Exceeded → 429 (quiet)                                   │
│     │                                                            │
│     ▼                                                            │
│  3. Create QAThread and QAMessage (recruiter role)              │
│     │                                                            │
│     └─ threadId: "xyz789..."                                    │
│     │                                                            │
│     ▼                                                            │
│  4. Trigger OMEGA task: qa.answer                               │
│     │                                                            │
│     └─ Queue task with correlation ID                           │
│     │                                                            │
│     ▼                                                            │
│  5. Return 202 Accepted immediately                             │
│     │                                                            │
│     └─ { threadId, status: "processing" }                       │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  6. OMEGA worker picks up task (async)                          │
│     │                                                            │
│     ├─ Load profile data and resume chunks                      │
│     ├─ Semantic search on question                              │
│     ├─ Generate bounded answer (LLM)                            │
│     ├─ Identify sources (profile fields, resume)                │
│     └─ Create QAMessage (system role) with answer               │
│                                                                  │
│  7. Recruiter polls GET /api/qa/[profileId] to see answer       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** API does NOT generate answers. OMEGA does.

---

## Technology Stack

### API Layer
- **Framework:** Next.js 14+ (App Router)
- **Runtime:** Node.js 20+
- **Validation:** Zod
- **Logging:** Pino (structured JSON)

### Task Queue
- **Queue:** BullMQ
- **Storage:** Redis (Azure Cache for Redis)
- **Concurrency:** 5 workers per task type

### Database
- **ORM:** Prisma
- **Database:** PostgreSQL (Azure)
- **Migrations:** Prisma Migrate

### Storage
- **File Storage:** Azure Blob Storage
- **Session Storage:** NextAuth (database sessions)
- **Rate Limiting:** Redis

### Observability
- **Logs:** Azure Log Analytics
- **Metrics:** Azure Monitor
- **Traces:** Correlation ID-based

---

## Scaling Considerations

### Horizontal Scaling
- Next.js API routes are stateless (scale via Azure Container Apps)
- OMEGA workers scale independently (increase replicas)
- Redis handles distributed rate limiting

### Performance Bottlenecks
- **Resume upload:** Blob storage write speed (acceptable for MVP)
- **Q&A answer:** LLM API latency (acceptable for async flow)
- **Booking hold:** Redis lock contention (unlikely at MVP scale)

### Database Optimization
- Index on `Profile.handle` (unique, frequent lookups)
- Index on `Booking.profileId, startTime` (slot queries)
- Index on `QAThread.profileId` (history queries)

---

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Public Endpoints (No Auth):                                    │
│  - /api/profile/[handle]                                        │
│  - /api/resume/download                                         │
│  - /api/qa                                                      │
│  - /api/qa/[profileId]                                          │
│  - /api/booking/*                                               │
│                                                                  │
│  Security Measures:                                             │
│  ✓ Rate limiting (Redis)                                        │
│  ✓ Input validation (Zod)                                       │
│  ✓ Visibility controls (published, resumeDownloadable, etc.)    │
│  ✓ No CORS (same-origin only)                                   │
│  ✓ Content-Type validation                                      │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  Authenticated Endpoints (NextAuth):                            │
│  - /api/profile (GET, PUT)                                      │
│  - /api/profile/publish                                         │
│  - /api/resume (POST)                                           │
│                                                                  │
│  Security Measures:                                             │
│  ✓ Session cookie validation                                    │
│  ✓ CSRF protection (NextAuth built-in)                          │
│  ✓ User/Profile ownership checks                                │
│  ✓ Rate limiting (Redis)                                        │
│  ✓ Input validation (Zod)                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Strategy

All errors return ErrorDTO:

```typescript
{
  error: "RATE_LIMIT_EXCEEDED",
  message: "Too many requests",
  correlationId: "t:default|c:01932a3c-4b5e-7890-..."
}
```

**Error Codes:**
- `BAD_REQUEST` — Invalid input (400)
- `UNAUTHORIZED` — Not authenticated (401)
- `FORBIDDEN` — Not authorized (403)
- `NOT_FOUND` — Resource not found (404)
- `CONFLICT` — State conflict (409)
- `RATE_LIMIT_EXCEEDED` — Quiet rate limit (429)
- `INTERNAL_ERROR` — Unexpected failure (500)

**Canon Compliance:**
- No stack traces
- No internal details
- Calm language only
- No urgency cues

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure Container Apps                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js Container (API + UI)                           │   │
│  │  - Replicas: 2-10 (autoscale on CPU)                    │   │
│  │  - Health check: /api/health                            │   │
│  │  - Env: NEXTAUTH_URL, DATABASE_URL, REDIS_URL           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OMEGA Worker Container                                  │   │
│  │  - Replicas: 2-5 (autoscale on queue depth)             │   │
│  │  - Health check: /health                                │   │
│  │  - Env: DATABASE_URL, REDIS_URL, OPENAI_API_KEY         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Phase 2:** Generate API route stubs from OpenAPI spec
2. **Phase 3:** Implement correlation middleware
3. **Phase 4:** Integrate with Team OMEGA (task queue)
4. **Phase 5:** E2E testing with Team Charlie (UI)

---

**Team Bravo Architecture: SEALED ✓**
