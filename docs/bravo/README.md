# Team Bravo — API / Contracts

**Phase 1 Complete: Interfaces Before Implementation**

This directory contains the sealed API contract for SilentApply MVP.

---

## What Team Bravo Owns

- Thin HTTP API layer (Next.js API routes)
- Request validation and response formatting
- Correlation ID generation and propagation
- OMEGA task triggering (fire-and-forget)
- Public endpoint visibility controls

---

## What Team Bravo Does NOT Own

- Orchestration logic (owned by Team OMEGA)
- Async processing (resume parsing, Q&A answering, email sending)
- Business rules (owned by domain layer)
- Database migrations (owned by Team Delta)

---

## Deliverables

### 1. [openapi.yaml](./openapi.yaml)
Complete OpenAPI 3.0 specification covering:
- Auth endpoints (NextAuth integration)
- Profile CRUD (authenticated)
- Public profile endpoint (Quiet Link)
- Resume upload/download
- Q&A submission and history
- Booking (hold, confirm, cancel)

All endpoints include:
- Correlation header requirements
- Request/response schemas
- Error responses
- Rate limit behavior

### 2. [DTO_SCHEMAS.md](./DTO_SCHEMAS.md)
TypeScript interfaces for all DTOs:
- ProfileDTO, ProfileUpdateDTO, PublicProfileDTO
- ResumeDTO, ResumeUploadResponse
- QuestionDTO, AnswerDTO, QAHistoryDTO
- BookingSlotDTO, BookingHoldDTO, BookingConfirmDTO
- ErrorDTO, CorrelationContext

Includes validation rules and type guards.

### 3. [CORRELATION.md](./CORRELATION.md)
Correlation tracking specification:
- Correlation ID format: `t:<tenant>|c:<uuidv7>`
- Header propagation rules
- Flow across API → OMEGA → Tools
- Logging requirements
- Production observability

### 4. [OMEGA_TRIGGERS.md](./OMEGA_TRIGGERS.md)
API → OMEGA trigger map:
- Resume upload → resume.ingest
- Q&A question → qa.answer
- Booking confirm → booking.notify

Each trigger includes:
- Input payload schema
- API responsibility boundary
- Expected OMEGA behavior
- Correlation handoff

---

## Key Principles

### 1. Correlation-Aware
Every request includes correlation tracking:
```
X-Correlation-ID: t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890
```

Correlation flows:
- HTTP request → API handler
- API handler → OMEGA task
- OMEGA task → tools → logs

### 2. Idempotent Where Safe
- PUT /api/profile — idempotent
- POST /api/profile/publish — idempotent
- POST /api/booking/hold — idempotent (extends hold)
- POST /api/booking/confirm — idempotent (succeeds if already booked)

### 3. Side Effects Delegated
API layer NEVER implements:
- Resume parsing
- Q&A answer generation
- Email sending
- Long-running operations

All async work is delegated to OMEGA via task queue.

### 4. Canon-Compliant
- Calm error messages (no urgency)
- Quiet rate limiting (no countdown timers)
- Unpublished profiles return 404 (no explanation)
- No monetization visible on public endpoints

---

## API Design Constraints

### Visibility Rules
- `published: false` → 404 on public endpoints
- `resumeDownloadable: false` → 403 on /api/resume/download
- `bookingEnabled: false` → 403 on /api/booking/*
- `qaEnabled: false` → 403 on /api/qa/*

### Rate Limiting
All rate limits are **quiet**:
- No "X requests remaining" headers
- No countdown timers
- Simple 429 response with calm message

Limits:
- Auth email: 3 sends / 15 min / email (4th request silently suppresses)
- Q&A: 5 questions / 5 min / IP + profileId
- Booking: 10 actions / 10 min / IP + profileId

### Error Responses
All errors return ErrorDTO:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "correlationId": "t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890"
}
```

No stack traces, no internal details.

---

## Implementation Roadmap

**Phase 1 (Complete):** Interface design
- OpenAPI spec
- DTO schemas
- Correlation rules
- OMEGA trigger contracts

**Phase 2 (Next):** Scaffolding
- Generate Next.js API route stubs from OpenAPI
- Implement correlation middleware
- Set up OMEGA task queue (BullMQ + Redis)
- Add rate limiting middleware

**Phase 3:** Core Implementation
- Profile CRUD handlers
- Resume upload (with Azure Blob integration)
- Q&A submission (with OMEGA trigger)
- Booking state machine

**Phase 4:** Integration
- Connect to Team OMEGA handlers
- Test correlation propagation end-to-end
- Validate rate limits in staging
- Public profile smoke tests

---

## Testing Strategy

### Unit Tests
- DTO validation (Zod schemas)
- Correlation ID generation/parsing
- Error response formatting

### Integration Tests
- API routes with mocked Prisma
- OMEGA task triggering (mocked queue)
- Rate limiting (Redis)

### E2E Tests
- Public profile access (published vs unpublished)
- Resume upload → ingestion flow
- Q&A question → answer flow
- Booking hold → confirm → cancel flow

---

## Dependencies

**Required Services:**
- Azure Blob Storage (resume files)
- Azure Cache for Redis (rate limiting, task queue)
- Azure Postgres (Prisma ORM)
- NextAuth (session management)

**Required Libraries:**
- Next.js 14+ (App Router)
- Prisma (database client)
- BullMQ (task queue)
- ioredis (Redis client)
- Zod (validation)
- Pino (structured logging)

---

## Canon Alignment

All API behaviors are canon-compliant:

✓ **Silence is a feature** — No urgency, no hype, no persuasion
✓ **Control belongs to candidate** — Visibility rules enforced
✓ **Clarity over cleverness** — Simple, declarative responses
✓ **Infrastructure, not theater** — Reliable, boring, predictable

If a feature requires urgency to justify itself, it does not belong here.

---

## Contact

Questions about API contracts? See:
- CANON.md (behavioral constraints)
- AGENTS.md (contribution guardrails)
- MVP_CHECKLIST.md (acceptance criteria)

---

**Team Bravo Phase 1 Status: SEALED ✓**

Ready for implementation handoff to Team Charlie (Quiet UX).
