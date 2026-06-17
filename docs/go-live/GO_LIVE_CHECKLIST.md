# SilentApply.ai — Go-Live Checklist

CANON.md is binding throughout. Nothing ships that violates it.
Items are ordered by dependency — later items often assume earlier ones are done.

---

## Priority — Must Ship First

These five items block every real user from using the product.

### 1. Fix OMEGA branding on landing page
The landing page footer currently reads "SilentApply AI • Powered by OMEGA • Governed by Keon." OMEGA is removed from the codebase; this copy is stale and violates CANON (no AI/vendor branding on public pages). Strip all three phrases. The landing page should carry no AI attribution whatsoever.

**File:** `app/page.tsx` — search for "OMEGA" and "Governed by Keon" in the footer section.

---

### 2. Resume file storage
Resume uploads are written to `uploads/resumes/` on the local container filesystem. Any redeploy or container restart deletes them, orphaning the parsed text stored in Postgres. Resumes must be stored in persistent external blob storage before real users upload anything.

**What to build:**
- Swap `writeFile` in `app/api/resume/route.ts` for a blob upload (Azure Blob Storage, Cloudflare R2, or Vercel Blob)
- Store the returned blob URL in the `fileUrl` column instead of a local path
- The public download route (`app/api/resume/public/route.ts`) already uses `fileUrl` — it will work without changes once the URL is real
- Add the storage connection string to `.env.example` and `DEPLOYMENT.md`

**Note:** If deploying to Railway or Render with a persistent volume mount, local storage works and this item can be deferred — but only if the volume is guaranteed to survive deploys.

---

### 3. Email provider (magic links)
NextAuth magic-link sign-in is the only auth flow. Without a configured email provider it silently fails — users request a link and nothing arrives. No one can log in.

**What to do:**
- Sign up for Resend (free tier covers launch volume) or configure any SMTP provider
- Set `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, and `EMAIL_FROM` in the deployment environment
- Send a test magic link to yourself before calling this done

---

### 4. Hosted PostgreSQL
The app needs a real Postgres instance, not localhost. The Prisma driver adapter pattern (`@prisma/adapter-pg`) works with any standard Postgres — no code changes required.

**Recommended options:**
- **Neon** — serverless Postgres, generous free tier, works with the current driver adapter without modification
- **Supabase** — free tier, connection pooling built in
- **Railway** — easiest if you want Postgres + Redis + app hosting in one place
- **Azure Database for PostgreSQL Flexible Server** — if staying in the Azure stack per `docs/internal/SilentApply_Infra_Blueprint.md`

Set `DATABASE_URL` and `DIRECT_URL` (for Prisma CLI migrations) in the deployment environment. Run `npx prisma migrate deploy` as part of every deploy.

---

### 5. Hosted Redis
Redis backs the Q&A and auth rate limiters. The rate limiter in `lib/rateLimit.ts` is fail-open — the app runs without Redis, but anyone can spam Q&A endpoints without limit. Don't go live without it.

**Recommended options:**
- **Upstash** — serverless Redis, free tier, pairs cleanly with any host
- **Railway Redis** — if using Railway for everything else
- **Azure Cache for Redis** — if staying in Azure; use port 6380 with TLS (`rediss://`)

Set `REDIS_URL` in the deployment environment. Verify the connection on first deploy by watching that a Q&A rate-limit event appears in logs.

---

## Core Feature Gaps

The product builds and deploys cleanly, but these gaps make the core value proposition incomplete.

### 6. Candidate availability / booking slot definition
The public booking flow (`BookingSection.tsx`) lets recruiters pick a date and browse slots — but the API returns no slots because candidates have no UI to define their available times. The entire booking feature is a dead end until this exists.

**What to build:**
- A candidate-side page (e.g. `/candidate/availability`) where they define repeating weekly windows (days + time ranges) or specific available dates
- A Prisma model to store these windows (or reuse the existing `BookingSlot` schema if it exists)
- Update `GET /api/booking` to generate bookable slots from those windows for a given date range
- Respect the BOOKING_CANON_v1 rules: calm, no urgency, no countdown, optional feature

**Visibility gate:** Booking already has a `visibility.booking` flag. The candidate's profile edit page already exposes this toggle. The backend is wired. The gap is slot generation.

---

### 7. Booking confirmation emails
When a recruiter confirms a slot, neither party receives a notification. The booking is stored in Postgres but is invisible to both sides outside the app.

**What to build:**
- On `booking.confirmed` in `app/api/booking/route.ts`, send a plain transactional email to:
  - The recruiter's submitted email address (confirmation + calendar link/ICS attachment)
  - The candidate (notification that a slot was booked, who it was, and when)
- Keep copy calm. No urgency language. No "Your opportunity awaits!" copy.
- Log the send as a `booking.confirmed` analytics event (already in `ALLOWED_EVENTS`)
- Reuse the email provider configured in item 3

---

### 8. Post-login onboarding redirect
After a first magic-link sign-in, the user lands on the dashboard with no profile and no prompt. There is nothing telling them what to do.

**What to build:**
- On dashboard load, if the candidate has zero profiles, redirect to `/candidate/profile/edit?new=true`
- Alternatively, render an inline empty-state card with a single "Create your Quiet Link" button
- No gamification, no progress bars, no "complete your profile 60%" pressure copy

---

### 9. Profile preview before publish
Candidates can fill out a profile and save it, but there is no way to see what the public page will look like before they hit Publish. This creates anxiety and support friction.

**What to build:**
- A "Preview" link or button on the dashboard and profile edit page
- Route to `/p/[handle]?preview=true` — render the public page but with a top banner: "This is a preview. Your profile is not yet published."
- The preview route should require candidate auth and bypass the `published: true` guard only when the preview param is present and the session owns the profile

---

## Infrastructure

### 10. Dockerfile
`DEPLOYMENT.md` references a Docker build but no `Dockerfile` exists. Required for Azure Container Apps and most container-based hosts.

**What to build:**
- Multi-stage Node 20 build: `npm ci` → `npx prisma generate` → `npm run build` in the build stage; copy `.next`, `public`, `node_modules`, `prisma` to a slim runtime stage
- Expose port 3000
- Set `NODE_ENV=production`
- Do not bake secrets into the image — all env vars injected at runtime

---

### 11. `/api/health` endpoint
Container orchestrators (Azure Container Apps, ECS, Railway, etc.) need a liveness probe that returns fast and confirms the app + database are reachable.

**What to build:**
- `app/api/health/route.ts`
- Returns `{ ok: true, ts: <ISO timestamp> }` with HTTP 200
- Does a single `prisma.$queryRaw\`SELECT 1\`` to confirm DB connectivity
- Returns HTTP 503 if the DB ping fails
- No auth required

---

### 12. CI/CD pipeline
Currently there is no automated build, test, or deploy pipeline. Manual deploys are error-prone and won't scale.

**What to build:**
- A GitHub Actions workflow (or equivalent) with two jobs:
  1. **CI** — runs on every push/PR: `npm ci` → `npx prisma generate` → `npm run build` → `npm test`
  2. **Deploy** — runs on merge to `main`: build Docker image → push to registry → trigger container app update → run `npx prisma migrate deploy`
- Gate deploys on CI passing
- Store secrets in GitHub Actions secrets, not in the repo

---

### 13. Domain and DNS
`silentapply.ai` needs to point at the deployed host. This is the last step before sharing a public link.

**Steps:**
- Set the A/CNAME record for `silentapply.ai` and `www.silentapply.ai` in the DNS registrar
- Configure SSL/TLS on the host (most managed hosts handle this automatically via Let's Encrypt)
- Update `NEXTAUTH_URL` to `https://silentapply.ai`
- Verify magic-link emails arrive with correct callback URLs

---

## Canon Compliance Verification

Run these checks before launch and before every significant deploy.

- [ ] `npm test` passes — 7 canon compliance tests green
- [ ] No OMEGA references in `app/` or `lib/` outside `lib/omega/` stubs: `grep -r "lib/omega" app/ lib/ --include="*.ts" --include="*.tsx"`
- [ ] No persuasion copy on public pages: search for "urgency", "limited", "act now", "only X left", "hurry", "don't miss"
- [ ] No monetization visible on `/p/[handle]`, `/api/qa`, `/api/booking`, or auth pages
- [ ] Unpublished handle → 404 (not a "coming soon" or "private profile" page)
- [ ] Resume download returns 404 (not 403) when `visibility.resume` is false
- [ ] Q&A out-of-scope question returns "That information isn't available here." — not an error, not a redirect
- [ ] Booking section does not appear on public profile when `visibility.booking` is false
- [ ] Free plan API (`/api/billing`) returns `limits: null` — no feature caps

---

## Post-Launch

Items that aren't blockers for launch but matter for a real product.

### Account deletion
Candidates have no way to delete their account or permanently remove their Quiet Link. This is a basic expectation and may be a legal requirement (GDPR, CCPA). Build a delete-account flow that removes the user, all profiles, all resumes (including blobs), all events, and all sessions.

### Observability
The app logs structured JSON but there is no aggregation. Wire logs to a destination (Azure Monitor, Datadog, Logtail, Axiom) so errors and abuse patterns surface without grepping raw container logs.

### Backup policy
Define and test a Postgres backup schedule. Most managed providers (Neon, Supabase, Railway) handle this automatically — confirm it is enabled and test a restore before launch.

### Rate limit tuning
Current Q&A limits are set in `lib/rateLimit.ts` at hardcoded values. After real traffic, review whether the per-profile and per-IP limits are too tight or too loose.

### Resume storage cleanup
When a candidate deletes a resume or their account, the blob in external storage is not deleted. Add cleanup logic so orphaned blobs don't accumulate.
