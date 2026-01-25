# DTO Schemas — Team Bravo

TypeScript interfaces for all data transfer objects used in the SilentApply API.

All DTOs are correlation-aware and designed for explicit boundaries between the API layer and OMEGA orchestration.

---

## Core Profile DTOs

### ProfileDTO
Complete user profile (authenticated endpoints only).

```typescript
export interface ProfileDTO {
  id: string;
  handle: string;
  headline: string | null;
  roles: string[];
  locationMode: 'remote' | 'hybrid' | 'onsite';
  commuteMiles: number | null;
  workAuth: WorkAuthJSON;
  availability: AvailabilityJSON;
  comp: CompJSON | null;
  proofLinks: ProofLink[];
  visibility: VisibilityJSON;
  published: boolean;
  updatedAt: string; // ISO 8601
}

export interface WorkAuthJSON {
  countries: string[]; // ISO 3166-1 alpha-2
  requiresSponsorship: boolean;
}

export interface AvailabilityJSON {
  startDate: string | null; // ISO 8601 date
  notice: string | null; // e.g., "2 weeks", "immediate"
}

export interface CompJSON {
  min: number | null;
  target: number | null;
  currency: string; // ISO 4217
  equity: boolean;
}

export interface ProofLink {
  url: string;
  label: string;
}

export interface VisibilityJSON {
  resumeDownloadable: boolean;
  bookingEnabled: boolean;
  qaEnabled: boolean;
}
```

### ProfileUpdateDTO
Subset of ProfileDTO used for PATCH/PUT operations.

```typescript
export interface ProfileUpdateDTO {
  headline?: string | null;
  roles?: string[];
  locationMode?: 'remote' | 'hybrid' | 'onsite';
  commuteMiles?: number | null;
  workAuth?: WorkAuthJSON;
  availability?: AvailabilityJSON;
  comp?: CompJSON | null;
  proofLinks?: ProofLink[];
  visibility?: Partial<VisibilityJSON>;
}
```

### PublicProfileDTO
Publicly visible profile (no auth required, respects visibility rules).

```typescript
export interface PublicProfileDTO {
  handle: string;
  headline: string | null;
  roles: string[];
  locationMode: 'remote' | 'hybrid' | 'onsite';
  commuteMiles: number | null;
  workAuth: WorkAuthJSON;
  proofLinks: ProofLink[];
  visibility: VisibilityJSON;
  published: boolean;
}
```

**Note:** `comp` and `availability.startDate` are excluded from public profiles.

---

## Resume DTOs

### ResumeDTO
Full resume metadata (authenticated).

```typescript
export interface ResumeDTO {
  id: string;
  profileId: string;
  fileUrl: string; // Azure Blob Storage URL
  parsedText: string; // Extracted text for search/RAG
  createdAt: string; // ISO 8601
}
```

### ResumeUploadResponse
Response after resume upload.

```typescript
export interface ResumeUploadResponse {
  resumeId: string;
  status: 'uploaded' | 'processing';
  message: string;
}
```

**OMEGA Trigger:** Resume upload triggers `resume.ingest` task with correlation ID.

---

## Q&A DTOs

### QuestionDTO
Recruiter question submission (public, no auth).

```typescript
export interface QuestionDTO {
  profileId: string;
  question: string; // max 1000 chars
  email?: string | null; // optional for follow-up
}
```

### AnswerDTO
System-generated answer (returned after OMEGA processing).

```typescript
export interface AnswerDTO {
  threadId: string;
  messageId: string;
  answer: string;
  sources: AnswerSource[];
  status: 'answered' | 'escalated';
  createdAt: string; // ISO 8601
}

export interface AnswerSource {
  type: 'profile' | 'resume';
  field: string; // e.g., "roles", "experience section"
}
```

### QAHistoryDTO
Public Q&A thread for a profile.

```typescript
export interface QAHistoryDTO {
  threadId: string;
  messages: QAMessage[];
}

export interface QAMessage {
  role: 'recruiter' | 'system';
  content: string;
  createdAt: string; // ISO 8601
}
```

**OMEGA Trigger:** Question submission triggers `qa.answer` task with correlation ID.

---

## Booking DTOs

### BookingSlotDTO
Booking slot metadata (public if bookingEnabled).

```typescript
export interface BookingSlotDTO {
  id: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  status: 'open' | 'held' | 'booked';
  heldUntil?: string | null; // ISO 8601, null if not held
}
```

### BookingHoldDTO
Request to hold a slot.

```typescript
export interface BookingHoldDTO {
  slotId: string;
}
```

### BookingHoldResponse
Response after creating a hold.

```typescript
export interface BookingHoldResponse {
  slotId: string;
  status: 'held';
  heldUntil: string; // ISO 8601
  message: string; // e.g., "Slot held for 10 minutes"
}
```

### BookingConfirmDTO
Request to confirm a booking.

```typescript
export interface BookingConfirmDTO {
  slotId: string;
  email: string; // recruiter email
  name: string; // recruiter name
}
```

### BookingConfirmResponse
Response after confirming a booking.

```typescript
export interface BookingConfirmResponse {
  slotId: string;
  status: 'booked';
  message: string; // e.g., "Booking confirmed"
}
```

**OMEGA Trigger:** Booking confirmation triggers `booking.notify` task (optional email).

### BookingCancelDTO
Request to cancel a booking.

```typescript
export interface BookingCancelDTO {
  slotId: string;
}
```

---

## Error DTO

### ErrorDTO
Standard error response for all API endpoints.

```typescript
export interface ErrorDTO {
  error: string; // e.g., "BAD_REQUEST", "NOT_FOUND", "RATE_LIMIT_EXCEEDED"
  message: string; // human-readable
  correlationId?: string; // correlation ID for tracing
}
```

**Error Codes:**
- `BAD_REQUEST` — Invalid input
- `UNAUTHORIZED` — Not authenticated
- `FORBIDDEN` — Not authorized (e.g., download disabled)
- `NOT_FOUND` — Resource not found (includes unpublished profiles)
- `CONFLICT` — State conflict (e.g., slot already booked)
- `RATE_LIMIT_EXCEEDED` — Quiet rate limit (no countdown, no urgency)
- `INTERNAL_ERROR` — Unexpected failure

---

## Correlation Metadata

All API responses include correlation tracking.

### CorrelationContext
Internal metadata propagated to OMEGA tasks.

```typescript
export interface CorrelationContext {
  correlationId: string; // t:<tenant>|c:<uuidv7>
  tenant: string;
  timestamp: string; // ISO 8601
  source: 'api' | 'omega' | 'cron';
  userId?: string | null;
  profileId?: string | null;
}
```

**Not exposed via API:** Used internally for logging and tracing.

---

## Usage Notes

1. **Idempotency:** All POST/PUT operations are idempotent where safe (e.g., publish, hold, confirm).
2. **Correlation:** All requests accept `X-Correlation-ID` header. If not provided, server generates one.
3. **Rate Limiting:** Applied quietly. Exceeding limits returns `429` with calm language, no countdown.
4. **Visibility Rules:**
   - `resumeDownloadable` controls `/api/resume/download`
   - `bookingEnabled` controls `/api/booking/*`
   - `qaEnabled` controls `/api/qa/*`
5. **Published State:** Unpublished profiles return `404` on public endpoints (no explanation).

---

## Type Guards (Optional)

```typescript
export function isProfileDTO(obj: unknown): obj is ProfileDTO {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'handle' in obj &&
    'published' in obj
  );
}

export function isErrorDTO(obj: unknown): obj is ErrorDTO {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    'message' in obj
  );
}
```

---

## Validation Rules

- `handle`: 3-30 chars, lowercase alphanumeric + hyphens only
- `question`: max 1000 chars
- `email`: valid email format (RFC 5322)
- `fileUrl`: valid HTTPS URL
- `correlationId`: format `t:<tenant>|c:<uuidv7>`

---

## End of DTO Schemas
