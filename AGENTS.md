# SilentApply — Agent Guardrails

This repository is governed by the public canon:

- CANON.md is the source of truth.
- If a change violates CANON.md, it must be rejected.

These guardrails apply to all AI agents and automated contributors.

---

## Non-Negotiables

### Canon First
Before proposing or implementing changes:
1) Read CANON.md
2) Confirm the change does not introduce:
- urgency
- persuasion
- excitement framing
- funnel language
- loud UI patterns

If it does, stop.

---

## Tone and Copy Rules

SilentApply copy must be:
- calm
- declarative
- bounded
- minimal

Forbidden language includes:
- “win”, “crush”, “dominate”, “transform”
- “don’t miss”, “limited”, “act now”
- “magic”, “powered by AI”, model names

Copy must never beg, rush, or hype.

---

## Public Surface Rules

Recruiter-facing surfaces must:
- require no accounts
- avoid identity theater
- avoid tracking-like behavior
- never show monetization
- never show “upgrade” cues
- never use CAPTCHAs or “you are blocked” messaging

If a profile is unpublished:
- return 404
- no explanation

Absence is intentional.

---

## Q&A Rules

Q&A answers may be generated only from:
- candidate-provided profile fields
- candidate resume content (canonical or candidate-approved variants)
- candidate-approved availability/location/work authorization

Forbidden:
- inference beyond provided facts
- external enrichment
- assumptions or “likely” language
- negotiation, pressure, leverage

When out of scope:
- respond once, briefly, bounded
- do not justify, apologize, or escalate by default

---

## Booking Rules

Booking must:
- remain optional
- avoid urgency language
- support holds with automatic expiry
- support calm confirmation and quiet cancellation

Never:
- countdown timers
- “limited availability” emphasis
- sticky CTAs

---

## Monetization Rules

Monetization must:
- never appear on public profiles
- never appear in recruiter flows
- never appear in auth, booking, or Q&A

Free core must remain fully usable:
- Quiet Link
- profile basics
- proof links
- Q&A
- booking
- canonical resume upload/download
- visibility controls

Paid features must be optional and candidate-only.

---

## Engineering Rules

### Security/Privacy
- Prefer minimal logging.
- No fingerprinting or cross-profile tracking.
- Do not store sensitive data unless explicitly required.
- Do not expose abuse thresholds in public docs or UI.

### Determinism and Safety
- Avoid “clever” behavior that changes based on user type.
- Default to stable ordering and predictable responses.
- Fail closed for privacy; fail open for availability only where canon requires calm continuity.

---

## Output Requirements for Agents

Every PR must include:
- What changed
- Why it is canon-compliant (1–3 bullets)
- Test notes (what was run)

If copy/UI is changed:
- include before/after text
- confirm forbidden language was not introduced

---

## If Unsure
When uncertain, choose:
- restraint over novelty
- clarity over persuasion
- fewer features over more surface area
