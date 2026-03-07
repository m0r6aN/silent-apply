# Team Bravo — Quick Reference Card

One-page overview of Team Bravo's API contracts.

---

## Correlation ID Format

```
t:<tenant>|c:<uuidv7>
Example: t:default|c:01932a3c-4b5e-7890-abcd-ef1234567890
```

**Header:** `X-Correlation-ID`

---

## Endpoint Summary

### Authenticated Endpoints

```
GET    /api/profile           → ProfileDTO
PUT    /api/profile           → ProfileDTO
POST   /api/profile/publish   → ProfileDTO
POST   /api/resume            → ResumeUploadResponse (triggers OMEGA)
```

### Public Endpoints (No Auth)

```
GET    /api/profile/[handle]      → PublicProfileDTO | 404
GET    /api/resume/download       → Binary | 403
POST   /api/qa                    → { threadId, status } (triggers OMEGA)
GET    /api/qa/[profileId]        → QAHistoryDTO[]
GET    /api/booking/[profileId]   → BookingSlotDTO[]
POST   /api/booking/hold          → BookingHoldResponse
POST   /api/booking/confirm       → BookingConfirmResponse (triggers OMEGA)
POST   /api/booking/cancel        → { slotId, status }
```

---

## OMEGA Triggers

| Endpoint | Task Name | Behavior |
|----------|-----------|----------|
| POST /api/resume | resume.ingest | Parse, chunk, embed resume |
| POST /api/qa | qa.answer | Generate bounded answer |
| POST /api/booking/confirm | booking.notify | Send confirmation emails |

---

## Error Response Format

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "correlationId": "t:default|c:01932a3c-4b5e-7890-..."
}
```

**Error Codes:**
- `BAD_REQUEST` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)

---

## Visibility Rules

| Flag | Controls |
|------|----------|
| `published: false` | 404 on public profile endpoint |
| `resumeDownloadable: false` | 403 on resume download |
| `bookingEnabled: false` | 403 on booking endpoints |
| `qaEnabled: false` | 403 on Q&A endpoints |

---

## Rate Limits (Quiet)

- Auth email: 3 sends / 15 min / email
- Q&A: 5 questions / 5 min / IP + profileId
- Booking: 10 actions / 10 min / IP + profileId

**Behavior:** Return 429 with calm message. No countdown timers.

---

## Idempotent Endpoints

- `PUT /api/profile`
- `POST /api/profile/publish`
- `POST /api/booking/hold` (extends hold)
- `POST /api/booking/confirm` (succeeds if already booked)

---

## Key DTOs

### ProfileDTO
```typescript
{
  id: string;
  handle: string;
  headline: string | null;
  roles: string[];
  locationMode: 'remote' | 'hybrid' | 'onsite';
  visibility: { resumeDownloadable, bookingEnabled, qaEnabled };
  published: boolean;
}
```

### PublicProfileDTO
```typescript
// Same as ProfileDTO but excludes: comp, availability.startDate
```

### ResumeDTO
```typescript
{
  id: string;
  profileId: string;
  fileUrl: string;
  parsedText: string;
  createdAt: string;
}
```

### QAHistoryDTO
```typescript
{
  threadId: string;
  messages: Array<{
    role: 'recruiter' | 'system';
    content: string;
    createdAt: string;
  }>;
}
```

### BookingSlotDTO
```typescript
{
  id: string;
  startTime: string;
  endTime: string;
  status: 'open' | 'held' | 'booked';
  heldUntil?: string | null;
}
```

---

## Correlation Flow

```
HTTP Request
  └─> API Handler (extract/generate correlation ID)
      └─> Log: "Request received"
      └─> Prisma query (include correlation ID)
      └─> Trigger OMEGA task (include correlation ID)
      └─> Log: "Response sent"
      └─> HTTP Response (X-Correlation-ID header)

OMEGA Worker
  └─> Receive task (correlation ID in payload)
      └─> Log: "Task started"
      └─> Execute tools (include correlation ID)
      └─> Log: "Task completed"
```

---

## Canon Compliance

All API behaviors:
- Calm (no urgency)
- Bounded (no inference beyond data)
- Quiet (no hype, no countdown timers)
- Candidate-controlled (visibility rules)

---

## Implementation Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** Prisma + PostgreSQL
- **Queue:** BullMQ + Redis
- **Storage:** Azure Blob Storage
- **Auth:** NextAuth (email magic links)
- **Logging:** Pino (structured JSON)

---

## Testing Checklist

- [ ] DTO validation (Zod schemas)
- [ ] Correlation ID generation/parsing
- [ ] Rate limiting (Redis)
- [ ] OMEGA task triggering (queue)
- [ ] Public profile visibility (published vs unpublished)
- [ ] Resume upload → ingestion flow
- [ ] Q&A question → answer flow
- [ ] Booking hold → confirm → cancel flow

---

## Files

All specs in: `D:\Repos\silent-apply\docs\bravo/`

- `openapi.yaml` — OpenAPI 3.0 spec
- `DTO_SCHEMAS.md` — TypeScript interfaces
- `CORRELATION.md` — Correlation spec
- `OMEGA_TRIGGERS.md` — API → OMEGA contracts
- `ARCHITECTURE.md` — Architecture diagrams
- `README.md` — Team overview

---

**Team Bravo Phase 1: SEALED ✓**
