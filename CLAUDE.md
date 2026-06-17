# SilentApply

A candidate-controlled quiet link tool. Candidates publish a public profile URL that answers recruiter questions without requiring a resume blast or application. CANON.md is binding product law — read it before touching any user-facing flow.

## Stack

- **Next.js 16.1.4** — App Router, TypeScript strict, React 19
- **Prisma 7** with PostgreSQL — driver adapter pattern (`@prisma/adapter-pg` + `pg.Pool`)
- **NextAuth v4** — email magic link, JWT session strategy
- **Redis** (ioredis) — rate limiting, fail-open
- **Keon MCP Gateway** — optional governed AI execution (env-gated)
- **pdf-parse v2 + mammoth** — local resume parsing, no external AI

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build (must pass before shipping)
npm test             # jest (7 canon compliance tests)
npm run lint         # eslint
npm start            # production server

npx prisma generate  # required after schema changes or fresh clone
npx prisma migrate dev --name <name>   # local schema migration
npx prisma migrate deploy              # production migration (CI/deploy)
```

## Project Structure

```
app/
  api/
    auth/            → NextAuth handler
    billing/         → Free plan metadata (no paywalls on core flows)
    booking/         → Hold + confirm slots
    events/          → Analytics event read endpoint
    profile/         → Profile CRUD + publish/unpublish
    qa/              → Bounded recruiter Q&A
    resume/          → Upload + parse (POST), list (GET)
    resume/public/   → Download when visibility.resume=true
  candidate/         → Authenticated candidate pages
    dashboard/       → Profile list + quick actions
    profile/edit/    → Create/edit profile form
    analytics/       → View counts, Q&A, bookings
    bookings/        → Confirmed booking list
  p/[handle]/        → Public profile page (no auth required)
    QASection.tsx    → Client: ask a question
    BookingSection.tsx → Client: browse and book slots
lib/
  correlation.ts     → Correlation ID utilities (uuid-based)
  observability.ts   → Canon-compliant analytics (5 sealed event types)
  prisma.ts          → Prisma client singleton (driver adapter)
  rateLimit.ts       → Profile + IP rate limiting (Redis-backed, fail-open)
  redis.ts           → Redis client singleton
  keon/
    client.ts        → Keon MCP Gateway HTTP client
    governance.ts    → Non-blocking governance wrappers
  omega/             → DEAD CODE — stubs only, do not use or expand
prisma/
  schema.prisma      → Source of truth for data model
  migrations/        → Never edit manually
__tests__/
  canon.test.ts      → ALLOWED_EVENTS sealed, no OMEGA imports, no persuasion copy
__mocks__/
  uuid.ts            → CJS stub for Jest (uuid is ESM)
  next-headers.ts    → Stub for Jest (server-only API)
  prisma.ts          → Jest stub for DB calls
```

## Prisma 7 — Critical Quirks

**`PrismaClient` is not exported from `@prisma/client` directly.** Always import from the generated path:
```ts
import { PrismaClient } from '../.prisma/client';   // or via lib/prisma.ts
```
Run `npx prisma generate` after any schema change or on first clone.

**Driver adapter pattern** — `lib/prisma.ts` instantiates with `new PrismaAdapter(pool)`. The schema has no `url` in the `datasource` block. CLI migrations use `prisma.config.ts` which reads `DIRECT_URL ?? DATABASE_URL`.

**Json fields** — Prisma 7 strict typing rejects plain objects and interfaces without index signatures. Use this pattern everywhere a `metadataJson` or similar Json field is written:
```ts
metadataJson: JSON.parse(JSON.stringify(obj)) as any,
```

## Keon MCP Governance

Governance is **optional and env-gated**. The app works fully without it — local logic always runs first, Keon is called async for receipt tracking only.

**Governed flows** (call `recordQAGovernance` / `recordResumeParseGovernance`):
- Q&A answer generation
- Resume parsing

**Not governed** (never add Keon calls here):
- Profile CRUD
- Static public profile rendering
- Visibility checks
- Direct resume download
- Basic booking display

**Never fake receipts.** If `KEON_GOVERNANCE_ENABLED` is falsy or the gateway is unreachable, return `governed: false`. Do not claim governance that didn't happen.

Required env vars to enable:
```
KEON_GOVERNANCE_ENABLED=true
KEON_MCP_GATEWAY_ENDPOINT=https://keon-mcp-gateway.redrock-24997c6f.eastus2.azurecontainerapps.io
KEON_MCP_API_KEY=...
KEON_MCP_TENANT_ID=...
KEON_MCP_ACTOR_ID=...
```

## CANON.md Constraints (non-negotiable)

- **No urgency, pressure, or persuasion** anywhere — no countdowns, scarcity copy, "apply now" CTAs
- **Q&A answers only from candidate-provided data** — keyword match against profile fields; return "That information isn't available here." for anything out of scope
- **Unpublished profiles → 404**, not a "private profile" page
- **Resume download gated** on `visibility.resume === true`; return 404 otherwise, never 403
- **Monetization invisible** on public profile, recruiter, auth, booking, and Q&A flows
- **Free core unlimited**: Quiet Link, profile data, Q&A, booking — no per-feature caps
- **Minimal logging**: only the 5 sealed event types in `ALLOWED_EVENTS` (`lib/observability.ts`)

## Key Patterns

**Correlation IDs** — every API route calls `getOrCreateCorrelationId()` at the top and returns `X-Correlation-ID` in the response header.

**Rate limiting** — Q&A uses both `allowQAQuestion(profileId)` and `allowQAQuestionByIP(ip)`. Rate limit failures return HTTP 200 with a bounded answer (not 429) to avoid leaking internal state.

**Bounded Q&A** — `boundedAnswer()` in `app/api/qa/route.ts` matches against profile fields only. Do not add LLM calls, inference, or web search. Keon governance is for receipts, not answer generation.

**Visibility guards** — always check the profile's `visibilityJson` before exposing fields. Cast with `as Record<string, unknown>` and check each sub-field.

**`lib/omega/` is dead** — the four files are stubs left to avoid import breakage. Do not write new code there. Do not add new imports from these files.

## Environment Variables

See `.env.example` for the full list. Minimum to run locally:
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Redis and email are required for rate limiting and magic links respectively; both fail open in development.

## Deployment

See `DEPLOYMENT.md` for full production steps (Azure Container Apps, `prisma migrate deploy`, env var checklist, file storage note).
