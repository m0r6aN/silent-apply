# PHASE 2 — CORRELATION PROOF

**Date:** 2026-01-25
**Status:** COMPLETE

---

## Vertical Slice Implemented

The following end-to-end flow has been implemented with full correlation threading:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CORRELATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Browser Request                                                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API: POST /api/resume                                   │   │
│  │  • getOrCreateCorrelationId()                           │   │
│  │  • correlationId: t:silentapply|c:<uuidv7>              │   │
│  │  • Log: api.resume.upload_started                        │   │
│  │  • Log: api.resume.authenticated                         │   │
│  │  • Log: api.resume.file_validated                        │   │
│  │  • Log: api.resume.file_saved                            │   │
│  │  • Log: api.resume.record_created                        │   │
│  │  • Response Header: X-Correlation-ID                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  OMEGA: dispatchTask('resume.ingest', ...)              │   │
│  │  • Receives correlationId from API                       │   │
│  │  • Log: task.dispatched                                  │   │
│  │  • Fire-and-forget async execution                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Task: executeResumeIngest()                             │   │
│  │  • Log: task.resume_ingest.started                       │   │
│  │  • Log: task.resume_ingest.step (parse_document)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tool: parseDocument()                                   │   │
│  │  • Receives correlationId from task                      │   │
│  │  • Log: document.parse_started                           │   │
│  │  • Log: document.file_read                               │   │
│  │  • Log: document.pdf_parsed / document.docx_parsed       │   │
│  │  • Log: document.parse_completed                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tool: storeChunks()                                     │   │
│  │  • Receives correlationId from task                      │   │
│  │  • Log: chunks.store_started                             │   │
│  │  • Log: chunks.chunk_created (for each chunk)            │   │
│  │  • Log: chunks.store_completed                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Task Complete                                           │   │
│  │  • Log: task.resume_ingest.completed                     │   │
│  │  • Returns correlationId in output                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Correlation Format

**Sealed format:** `t:<tenant>|c:<uuidv7>`

Example: `t:silentapply|c:01926a3b-4c5d-7e8f-9a0b-1c2d3e4f5a6b`

Components:
- `t:` - Tenant prefix (single tenant for MVP: `silentapply`)
- `c:` - Correlation/request ID prefix
- UUIDv7 - Time-ordered UUID for natural log ordering

---

## Files Implemented

### Correlation Infrastructure
- `lib/omega/correlation.ts` — ID generation, parsing, validation, logger factory

### OMEGA Task System
- `lib/omega/dispatch.ts` — Task dispatch with correlation threading
- `lib/omega/tasks/resumeIngest.ts` — Resume ingest task implementation

### Tools
- `lib/omega/tools/documentParser.ts` — PDF/DOCX text extraction
- `lib/omega/tools/chunkStore.ts` — Chunk creation and database storage

### API Integration
- `app/api/resume/route.ts` — Updated with correlation + OMEGA dispatch

---

## Log Entry Format

All logs are structured JSON with consistent fields:

```json
{
  "level": "info",
  "correlationId": "t:silentapply|c:01926a3b-4c5d-7e8f-9a0b-1c2d3e4f5a6b",
  "event": "task.resume_ingest.completed",
  "resumeId": "abc123",
  "chunkCount": 5,
  "timestamp": "2026-01-25T10:30:00.000Z"
}
```

---

## Correlation Survival Points

The correlation ID is verified to survive:

| Boundary | From | To | Verified |
|----------|------|-----|----------|
| HTTP Request | Browser | API Route | ✅ Header extraction |
| API → Task | Route Handler | Dispatch | ✅ Parameter pass |
| Dispatch → Execution | Sync | Async | ✅ Closure capture |
| Task → Tool | Task Handler | Document Parser | ✅ Parameter pass |
| Task → Tool | Task Handler | Chunk Store | ✅ Parameter pass |
| Tool → Database | Chunk Store | Prisma | ✅ Logged before/after |
| Response | API Route | Browser | ✅ X-Correlation-ID header |

---

## Error Path Correlation

Errors also carry correlation:

```json
{
  "level": "error",
  "correlationId": "t:silentapply|c:01926a3b-4c5d-7e8f-9a0b-1c2d3e4f5a6b",
  "event": "document.parse_failed",
  "error": {
    "message": "PDF parse failed: Invalid PDF structure",
    "stack": "..."
  },
  "timestamp": "2026-01-25T10:30:00.000Z"
}
```

---

## Exit Gate Confirmation

**Phase 2 Exit Criteria:**

- [x] One Quiet Link page renders (`/p/[handle]`)
- [x] Read-only profile loads from database
- [x] One async OMEGA task implemented (resume.ingest)
- [x] Correlation propagates: API → Task → Parser → ChunkStore
- [x] Correlation visible in response headers
- [x] Structured logs include correlationId at every step
- [x] Error paths preserve correlation

**Correlation proof complete. Phase 2 exit gate cleared.**

---

## Next: Phase 3 — MVP Completion

Remaining MVP_CHECKLIST items to implement:
- Quiet Auth (passwordless magic links)
- Abuse resistance (Redis rate limiting)
- Q&A endpoint with bounded answers
- Booking flow with hold semantics
- Observability events
