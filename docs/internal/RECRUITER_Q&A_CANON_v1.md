Locked. This is a **big one** — Q&A is where trust is either *earned* or *obliterated*. We’re going to make it feel calm, bounded, and boring in the best possible way.

---

# 🔒 RECRUITER Q&A CANON v1 (SilentApply)

## Purpose

Recruiter Q&A exists to:

* reduce repetitive questions
* provide clarity using candidate-approved information
* preserve candidate control and dignity

**Q&A is not**

* a negotiation proxy
* a persuasion engine
* a chatbot demo
* a lead capture mechanism

**Prime mental model**

> “This answers what’s already reasonable to ask.”

---

## 1) Interaction Model (LOCKED)

### Entry

* Recruiter sees a simple prompt:

  > “Have a question?”

* No login required

* Optional fields:

  * name
  * email

* No verification ceremony

**Canon:** Asking a question should feel like knocking, not registering.

---

## 2) Answering Authority (CRITICAL)

The system may answer **only** from:

1. Candidate-provided profile data
2. Candidate resume (canonical or variant)
3. Candidate-approved availability / location / work authorization
4. Prior Q&A answers (if explicitly allowed)

**Forbidden sources**

* inference beyond provided facts
* assumptions
* external enrichment
* “typical” industry guesses

If it’s not explicitly present, it’s not answered.

---

## 3) Answer Tone (NON-NEGOTIABLE)

Every system response must be:

* Calm
* Declarative
* Neutral
* Bounded

### Allowed phrasing

* “This profile indicates…”
* “The candidate has shared…”
* “That information isn’t available here.”

### Forbidden phrasing

* “Based on experience…”
* “Likely…”
* “This suggests…”
* “The best fit would be…”

**Never sell. Never convince. Never predict.**

---

## 4) Scope Boundaries (SEALED)

### In-scope question categories

* Role fit (high-level)
* Location / remote / hybrid
* Availability
* Work authorization (if shared)
* Skills listed in resume
* Proof links (“Do you have examples of X?”)

### Out-of-scope categories (system must refuse)

* Salary negotiation
* Compensation pressure (“What would it take?”)
* Personal questions
* Legal interpretations
* Guarantees or predictions
* Behavioral hypotheticals

---

## 5) Refusal Behavior (IMPORTANT)

When refusing, the system must:

* Respond **once**
* Be brief
* Not justify itself
* Not escalate

### Canon refusal responses

* “That isn’t available here.”
* “The candidate hasn’t shared that here.”
* “You can discuss that directly with the candidate.”

**Forbidden**

* explanations
* policy references
* apologies
* redirection to upgrade / paywalls

Refusal is a boundary, not an error.

---

## 6) Escalation to Candidate (OPTIONAL, QUIET)

If a question is:

* reasonable
* out-of-scope
* and escalation is enabled by the candidate

Then the system may:

* offer a neutral option:

  > “You can ask the candidate directly.”

This creates a **human handoff**, not an AI bridge.

No notifications unless the candidate opted in.

---

## 7) Memory & Persistence Rules

### What is stored

* The question
* The answer
* Timestamp
* Profile ID

### What is NOT stored

* Recruiter identity (beyond optional name/email for context)
* Cross-profile linkage
* Behavioral scoring

**Canon:** Q&A memory is per-profile, not per-recruiter.

---

## 8) Reuse of Prior Answers (Controlled)

If the same question is asked again:

* The system may reuse a prior answer **verbatim**
* Only if the answer still matches current profile state

No paraphrasing. No optimization.

If profile data changed → answer must be regenerated or withheld.

---

## 9) Abuse Resistance (Q&A)

Defenses are quiet and progressive:

1. Rate limit per profile
2. Rate limit per IP
3. Shadow suppression

Never:

* show CAPTCHA
* show “you are blocked”
* ask to log in

When abused, the system simply becomes less responsive.

---

## 10) Logging (Minimal, Allowed)

Allowed events:

* `qa.question_submitted`
* `qa.answered`
* `qa.refused`
* `qa.escalated` (if applicable)

Not allowed:

* sentiment analysis
* recruiter scoring
* response optimization metrics

---

## 11) UI Presentation Rules

* Q&A appears **below core profile info**
* No chat bubbles that imply conversation momentum
* Each Q&A item stands alone

Avoid:

* typing indicators
* “assistant is thinking”
* conversational fluff

This is a reference surface, not a chat room.

---

## 12) AI Disclosure (Subtle)

Allowed (once, small):

> “Answers are generated from information the candidate has chosen to share.”

Not allowed:

* “Powered by AI”
* model names
* confidence claims

---

## ✅ Immediate Implementation Notes

### A) Enforce hard answer boundaries

If the answer would require inference → refuse.

### B) Tie Q&A answers to profile version

If profile updates:

* invalidate prior answers if affected

### C) Rate limit Q&A separately from auth

Redis keys:

* `sa:qa:profile:<profileId>`
* modest thresholds

---