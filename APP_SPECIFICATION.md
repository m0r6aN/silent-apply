# SilentApply — Application Specification

**Extraction Date:** 2026-02-11
**Source Repository:** https://github.com/m0r6aN/silent-apply.git
**Commit SHA:** 40431e33304391a3632c1888fcadb3eca1d6893c
**Branch:** main

---

## 1. System Overview

**Purpose:** SilentApply is a professional coordination tool that provides job candidates with a single, public profile link to reduce friction in recruiter interactions.

**Core Philosophy:**
- Reduce friction, not create leverage
- Silence is a feature (restraint over urgency)
- Candidate control over all shared information
- Infrastructure behavior (reliable, boring, predictable)

**Key Interactions:**
1. Candidates create profiles with professional information
2. Candidates publish a "Quiet Link" (public profile URL)
3. Recruiters view profiles without requiring accounts
4. Recruiters ask questions answered from candidate-approved data only
5. Recruiters optionally book time slots with candidates

---

## 2. Unique Features

| Feature | Description | Evidence | Confidence |
|---------|-------------|----------|------------|
| **Quiet Link** | Single public profile URL at `/p/{handle}` that answers common recruiter questions | [app/p/[handle]/page.tsx:10-246](app/p/[handle]/page.tsx#L10-L246) | High |
| **Passwordless Auth** | Email-only magic link authentication with 15-minute expiry | [app/api/auth/[...nextauth]/route.ts:10-109](app/api/auth/[...nextauth]/route.ts#L10-L109) | High |
| **Bounded Q&A** | AI-powered answers using ONLY candidate-shared data, with strict out-of-scope detection | [lib/omega/tasks/qaAnswer.ts:41-324](lib/omega/tasks/qaAnswer.ts#L41-L324) | High |
| **Hold-Based Booking** | Slot reservation with 10-minute holds, automatic expiry, and confirmation flow | [app/api/booking/route.ts:166-318](app/api/booking/route.ts#L166-L318) | High |
| **Quiet Rate Limiting** | Silent throttling that returns neutral responses instead of "blocked" messages | [lib/rateLimit.ts:28-61](lib/rateLimit.ts#L28-L61) | High |
| **Resume Chunking** | Async parsing of PDF/DOCX resumes into searchable chunks for Q&A retrieval | [lib/omega/tasks/resumeIngest.ts:44-127](lib/omega/tasks/resumeIngest.ts#L44-L127) | High |
| **Correlation Threading** | UUIDv7-based correlation IDs propagated through all async operations | [lib/omega/correlation.ts:17-117](lib/omega/correlation.ts#L17-L117) | High |
| **Canon Governance** | Behavioral constraints document that defines allowed/prohibited features | [CANON.md](CANON.md) | High |

---

## 3. Business Rules

### 3.1 Profile Visibility

| Rule | Trigger | Condition | Outcome | Evidence | Confidence |
|------|---------|-----------|---------|----------|------------|
| Unpublished profile returns 404 | GET `/p/{handle}` | `published=false` | HTTP 404 (no explanation) | [app/api/profile/[handle]/route.ts:31-33](app/api/profile/[handle]/route.ts#L31-L33) | High |
| Visibility controls filter sensitive data | GET `/p/{handle}` | `visibilityJson.{field}=false` | Field omitted from response | [app/api/profile/[handle]/route.ts:36-53](app/api/profile/[handle]/route.ts#L36-L53) | High |
| Handle uniqueness | POST `/api/profile` | Handle exists | HTTP 409 "Handle already taken" | [app/api/profile/route.ts:93-102](app/api/profile/route.ts#L93-L102) | High |

### 3.2 Q&A Rules

| Rule | Trigger | Condition | Outcome | Evidence | Confidence |
|------|---------|-----------|---------|----------|------------|
| Out-of-scope refusal | Question submitted | Matches forbidden patterns (salary, personal, legal, predictions) | Returns bounded refusal phrase | [lib/omega/tasks/qaAnswer.ts:41-69](lib/omega/tasks/qaAnswer.ts#L41-L69) | High |
| Source-bounded answers | Question submitted | Question in scope | Answer prefixed with "This profile indicates" / "The candidate has shared" | [lib/omega/tasks/qaAnswer.ts:79-88](lib/omega/tasks/qaAnswer.ts#L79-L88) | High |
| Quiet rate limit | 11th question per profile in 15min | Rate exceeded | Returns "That isn't available here." with HTTP 200 | [app/api/qa/route.ts:76-96](app/api/qa/route.ts#L76-L96) | High |
| IP rate limit | 21st question per IP in 15min | Rate exceeded | Same quiet suppression | [lib/rateLimit.ts:77-79](lib/rateLimit.ts#L77-L79) | High |

### 3.3 Booking Rules

| Rule | Trigger | Condition | Outcome | Evidence | Confidence |
|------|---------|-----------|---------|----------|------------|
| Slot hold creation | POST `/api/booking` | Slot available | Creates hold with 10-minute expiry | [app/api/booking/route.ts:231-273](app/api/booking/route.ts#L231-L273) | High |
| Hold expiry cleanup | Any booking request | Holds with `heldUntil < now()` | Status reset to 'open' | [app/api/booking/route.ts:83-90](app/api/booking/route.ts#L83-L90) | High |
| Confirmation requires email | PUT `/api/booking` with `confirm=true` | Email not provided | HTTP 400 "Email is required" | [app/api/booking/route.ts:383-393](app/api/booking/route.ts#L383-L393) | High |
| Expired hold rejection | PUT `/api/booking` | `heldUntil < now()` | HTTP 410 "Booking hold has expired" | [app/api/booking/route.ts:368-381](app/api/booking/route.ts#L368-L381) | High |
| Booking rate limit per profile | 6th hold per profile in 15min | Rate exceeded | HTTP 409 disguised as slot conflict | [app/api/booking/route.ts:212-227](app/api/booking/route.ts#L212-L227) | High |

### 3.4 Authentication Rules

| Rule | Trigger | Condition | Outcome | Evidence | Confidence |
|------|---------|-----------|---------|----------|------------|
| Magic link expiry | Link clicked | Link older than 15 minutes | Auth fails | [app/api/auth/[...nextauth]/route.ts:12](app/api/auth/[...nextauth]/route.ts#L12) | High |
| Email rate limit | 4th email request in 15min | Rate exceeded | Returns success UI but suppresses email | [lib/auth/rateLimit.ts:15-38](lib/auth/rateLimit.ts#L15-L38) | High |
| Fail-open on Redis error | Rate check fails | Redis unavailable | Allow auth (do not block legitimate users) | [lib/auth/rateLimit.ts:35-37](lib/auth/rateLimit.ts#L35-L37) | High |

### 3.5 Resume Rules

| Rule | Trigger | Condition | Outcome | Evidence | Confidence |
|------|---------|-----------|---------|----------|------------|
| File type validation | Resume upload | Not PDF or DOCX | HTTP 400 "Invalid file type" | [app/api/resume/route.ts:67-72](app/api/resume/route.ts#L67-L72) | High |
| File size limit | Resume upload | Size > 10MB | HTTP 400 "File too large" | [app/api/resume/route.ts:76-80](app/api/resume/route.ts#L76-L80) | High |
| Async processing | Resume uploaded | Always | Returns HTTP 202, processing in background | [app/api/resume/route.ts:137-152](app/api/resume/route.ts#L137-L152) | High |
| Chunk creation | Resume parsed | Text extracted | Split into ~2000 char chunks for retrieval | [lib/omega/tools/chunkStore.ts:33-95](lib/omega/tools/chunkStore.ts#L33-L95) | High |

### 3.6 Monetization Rules

| Rule | Trigger | Condition | Outcome | Evidence | Confidence |
|------|---------|-----------|---------|----------|------------|
| Free core features | Always | User on free tier | Full access to Quiet Link, Q&A, booking, resume upload | [CANON.md:226-232](CANON.md#L226-L232) | High |
| Invisible monetization | Public profile view | Any visitor | No upgrade prompts, no payment indicators | [CANON.md:239-246](CANON.md#L239-L246) | High |
| Stripe checkout flow | User requests upgrade | Valid session | Redirect to Stripe checkout | [app/api/billing/route.ts:130-147](app/api/billing/route.ts#L130-L147) | Medium |

---

## 4. Resource Dependencies

### 4.1 Required Resources

| Resource | Type | Purpose | Configuration | Evidence | Confidence |
|----------|------|---------|---------------|----------|------------|
| **PostgreSQL** | Relational Database | User, profile, resume, booking, Q&A storage | `DATABASE_URL` env var with pg adapter | [lib/prisma.ts:16-32](lib/prisma.ts#L16-L32), [prisma/schema.prisma](prisma/schema.prisma) | High |
| **Redis** | Cache/Rate Limiting | Rate limiting for auth, Q&A, booking | `REDIS_URL` env var (TLS recommended for Azure) | [lib/redis.ts:18-36](lib/redis.ts#L18-L36) | High |
| **SMTP Server** | Email | Passwordless auth links, booking notifications | `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD` | [app/api/auth/[...nextauth]/route.ts:13-21](app/api/auth/[...nextauth]/route.ts#L13-L21) | High |

### 4.2 Optional Resources

| Resource | Type | Purpose | Configuration | Evidence | Confidence |
|----------|------|---------|---------------|----------|------------|
| **Stripe** | Payment Processor | Pro tier subscriptions | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs | [app/api/billing/route.ts:10-21](app/api/billing/route.ts#L10-L21) | Medium |
| **pgvector extension** | Vector Database | Semantic resume chunk search (prepared but not active) | Unsupported("vector") in schema | [prisma/schema.prisma:63](prisma/schema.prisma#L63) | Low |

### 4.3 File Storage

| Resource | Type | Purpose | Configuration | Evidence | Confidence |
|----------|------|---------|---------------|----------|------------|
| **Local Filesystem** | Blob Storage | Resume file storage | `uploads/resumes/` directory | [app/api/resume/route.ts:11](app/api/resume/route.ts#L11) | High |

---

## 5. Domain Canon

### 5.1 Core Entities

| Entity | Description | Key Attributes | Invariants |
|--------|-------------|----------------|------------|
| **User** | Authenticated account holder | `id`, `email`, `createdAt` | Email is unique |
| **Profile** | Candidate's public presence | `handle`, `headline`, `roles`, `locationMode`, `published` | Handle is unique; one user can have multiple profiles |
| **Resume** | Uploaded document with parsed content | `fileUrl`, `parsedText`, `chunks[]` | Belongs to exactly one profile |
| **ResumeChunk** | Searchable segment of parsed resume | `content`, `embedding?` | Belongs to exactly one resume |
| **QAThread** | Container for Q&A conversation | `profileId`, `messages[]` | Belongs to exactly one profile |
| **QAMessage** | Single question or answer | `role` (recruiter/system/candidate), `content`, `status` | Belongs to exactly one thread |
| **Booking** | Time slot reservation | `startTime`, `endTime`, `status` (open/held/booked), `heldUntil` | Belongs to exactly one profile |
| **AnalyticsEvent** | Minimal observability record | `eventType`, `metadataJson` | Non-marketing usage only |

### 5.2 Domain Terms

| Term | Definition |
|------|------------|
| **Quiet Link** | A single public profile URL that silently answers recruiter questions |
| **Canon** | Behavioral constraints document that defines what the system may/may not become |
| **Bounded Answer** | A Q&A response derived only from candidate-approved data, never inference |
| **Hold** | A temporary slot reservation with automatic expiry (default 10 minutes) |
| **Quiet Rate Limiting** | Throttling that returns neutral responses instead of explicit "blocked" messages |
| **Correlation ID** | UUIDv7-prefixed identifier (`t:tenant|c:uuid`) threaded through async operations |
| **OMEGA Task** | Background job with correlation threading (e.g., resume.ingest, qa.answer) |

### 5.3 Key Invariants

| Invariant | Enforcement | Evidence |
|-----------|-------------|----------|
| Q&A answers only from candidate-approved sources | Out-of-scope pattern matching + source tracking | [lib/omega/tasks/qaAnswer.ts:41-69](lib/omega/tasks/qaAnswer.ts#L41-L69) |
| No urgency language in any user-facing copy | Canon governance + agent guardrails | [AGENTS.md:36-42](AGENTS.md#L36-L42) |
| Monetization never appears on public surfaces | Canon rule, not implemented in recruiter flows | [CANON.md:239-246](CANON.md#L239-L246) |
| Rate limiting fails open on infrastructure errors | Try-catch with fallback to allow | [lib/rateLimit.ts:52-60](lib/rateLimit.ts#L52-L60) |
| Unpublished profiles return 404 with no explanation | `published=false` check before render | [app/p/[handle]/page.tsx:26-28](app/p/[handle]/page.tsx#L26-L28) |
| Hold expiry is automatic | Cleanup runs on every booking request | [app/api/booking/route.ts:83-90](app/api/booking/route.ts#L83-L90) |

### 5.4 Key Workflows

#### 5.4.1 Candidate Onboarding
```
Email Entry → Magic Link Sent → Link Clicked (15min window) → Session Created → Profile Creation → Resume Upload (optional) → Publish Profile
```

#### 5.4.2 Resume Ingestion
```
File Upload → Validation → Local Storage → Dispatch resume.ingest Task → Parse PDF/DOCX → Create Chunks → Store Chunks → Update Resume Record
```

#### 5.4.3 Recruiter Q&A
```
Question Submitted → Rate Limit Check → Profile Lookup → Out-of-Scope Check → Source Extraction → Bounded Answer Generation → Store Thread/Messages → Return Response
```

#### 5.4.4 Booking Flow
```
Get Available Slots → Create Hold (10min) → Confirm with Email → Update to Booked → Dispatch booking.notify Task → Send Emails
```

---

## 6. API Contracts

### 6.1 Profile API

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| GET | `/api/profile` | Required | - | `{ profiles: Profile[] }` |
| POST | `/api/profile` | Required | `{ handle, headline?, roles[], locationMode, ... }` | `{ profile: Profile }` |
| GET | `/api/profile/{handle}` | None | - | `{ id, handle, headline, roles, availability, proofLinks, resume? }` |

### 6.2 Q&A API

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/qa` | None | `{ profileHandle, question, recruiterEmail?, recruiterName? }` | `{ answer, status, sources[], qaRecordId, correlationId }` |

### 6.3 Booking API

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| GET | `/api/booking?profileHandle=X&date=YYYY-MM-DD` | None | - | `{ date, slots[], timezone }` |
| POST | `/api/booking` | None | `{ profileHandle, startTime, endTime }` | `{ bookingId, status: "held", heldUntil }` |
| PUT | `/api/booking` | None | `{ bookingId, confirm, email?, name? }` | `{ success, bookingId, status }` |

### 6.4 Resume API

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/resume` | Required | FormData with `file` | `{ success, resume: { id, fileUrl, status: "processing" } }` |
| GET | `/api/resume` | Required | - | `Resume[]` with status |
| GET | `/api/resume/download?id=X` | Required | - | File binary |

---

## 7. Out of Scope / Unknown

### 7.1 Explicitly Deferred (Per Canon/MVP Checklist)

| Item | Status | Notes |
|------|--------|-------|
| Resume variants | Future scope | Canon allows candidate-initiated contextual variants |
| Advanced analytics | Future scope | Only minimal events captured |
| Vector search for Q&A | Prepared | Schema has `Unsupported("vector")` but not implemented |
| Subscription tracking | TODO | Comments indicate "TODO: Implement actual subscription check" |
| Cancel/reschedule URLs | TODO | Template has placeholder, not generated |
| Candidate booking notifications | Conditional | Only sent if `notifyCandidate=true` |

### 7.2 Assumptions

| Assumption | Basis | Confidence |
|------------|-------|------------|
| Single-tenant deployment | `TENANT_ID = 'silentapply'` hardcoded | High |
| Azure target platform | Comments reference Azure Cache for Redis, ACS Email | Medium |
| Local file storage for MVP | No blob storage integration visible | High |
| Pro tier = unlimited everything | Limits set to 999/9999 | Medium |

### 7.3 Open Questions

| Question | Context |
|----------|---------|
| How are resume downloads authorized for public visitors? | Current flow appears to require session, conflicting with public profile concept |
| What triggers candidate booking notifications? | `notifyCandidate` parameter source unclear |
| How is timezone handled for booking slots? | Currently hardcoded to UTC |
| What happens to expired hold slots over time? | Cleanup only runs on-demand, not scheduled |

---

## 8. Evidence Index

| Category | Primary Files |
|----------|---------------|
| Data Model | [prisma/schema.prisma](prisma/schema.prisma) |
| API Routes | [app/api/](app/api/) |
| Business Logic | [lib/omega/tasks/](lib/omega/tasks/) |
| Rate Limiting | [lib/rateLimit.ts](lib/rateLimit.ts), [lib/auth/rateLimit.ts](lib/auth/rateLimit.ts) |
| Canon/Governance | [CANON.md](CANON.md), [AGENTS.md](AGENTS.md) |
| Public UI | [app/p/[handle]/page.tsx](app/p/[handle]/page.tsx) |
| Observability | [lib/omega/correlation.ts](lib/omega/correlation.ts) |
| Task Dispatch | [lib/omega/dispatch.ts](lib/omega/dispatch.ts) |

---

*Document generated by get_app_specs skill. All claims include evidence pointers. Items marked Low confidence require additional validation.*
