# SilentApply MVP Checklist (Canon-Compliant)

This checklist defines what “v1 ships” means for SilentApply.
Anything not listed here is not required for MVP.

---

## A) Canon Documents Present

- [ ] CANON.md exists at repo root
- [ ] README.md exists at repo root and links to CANON.md
- [ ] AGENTS.md exists at repo root
- [ ] LICENSE exists (Apache 2.0)

---

## B) Quiet Auth (Passwordless)

- [ ] NextAuth Email provider configured with maxAge = 15 minutes
- [ ] Auth pages:
  - [ ] /continue
  - [ ] /continue/check-email
- [ ] Email copy matches canon:
  - [ ] Subject: “Sign-in link for SilentApply”
  - [ ] Preheader includes “expires in 15 minutes”
  - [ ] Button: “Continue to SilentApply”
  - [ ] No marketing language

---

## C) Abuse Resistance (Quiet)

- [ ] Redis-backed rate limiting for auth email sends:
  - [ ] 3 sends / 15 min / email
  - [ ] 4th request returns success UI but does not send email
- [ ] Q&A endpoint rate limited (quietly)
- [ ] Booking hold/confirm endpoints rate limited (quietly)
- [ ] No CAPTCHAs
- [ ] No “you are blocked” messages

---

## D) Quiet Link Public Page

- [ ] Public URL: /[handle]
- [ ] Published semantics:
  - [ ] published=false → 404
  - [ ] published=true → renders
- [ ] Layout ordering (locked):
  - [ ] Above fold: name, headline, roles, location/work mode, optional actions
  - [ ] Below fold: proof, resume (if enabled), Q&A, booking (if enabled)
- [ ] No monetization appears on public profile

---

## E) Resume (Candidate-Controlled)

- [ ] Resume download is disabled unless candidate enables it
- [ ] Resume download requires explicit click
- [ ] No auto-preview required for MVP
- [ ] Resume variants: NOT required for MVP (future scope)

---

## F) Recruiter Q&A (Bounded)

- [ ] Recruiters can submit a question without account
- [ ] Q&A answers only from candidate-shared data/resume
- [ ] Out-of-scope questions respond with bounded refusal
- [ ] No inference beyond source data
- [ ] No negotiation/salary automation in MVP

---

## G) Booking (Optional, Calm)

- [ ] Booking slots exist per profile
- [ ] Hold semantics:
  - [ ] Selecting a slot creates a hold
  - [ ] Holds expire automatically (default 10 minutes)
- [ ] Confirmation requires recruiter email
- [ ] Calm cancel support (optional for MVP but recommended)

---

## H) Minimal Observability (Non-Marketing)

- [ ] Basic events allowed:
  - [ ] profile.viewed
  - [ ] resume.downloaded
  - [ ] qa.question_submitted
  - [ ] booking.hold_created / booking.confirmed
- [ ] No session replay
- [ ] No cross-profile recruiter tracking

---

## I) Deployment Readiness

- [ ] Azure Container Apps deploys successfully
- [ ] Azure Postgres connection works with Prisma migrations
- [ ] Azure Cache for Redis reachable via REDIS_URL (TLS)
- [ ] ACS Email SMTP sending works
- [ ] Domain + SPF/DKIM fully verified for sender domain

---

## MVP Acceptance Test (Human)

- [ ] Visit /continue → request link → receive email → sign in
- [ ] Rate limit: 4th request silent suppresses email
- [ ] Visit /[handle] (published) → page renders in canonical order
- [ ] Visit /[handle] (unpublished) → 404
- [ ] Submit recruiter question → bounded answer
- [ ] Hold booking slot → confirm → booked
