# 🔒 QUIET LINK — RESUME CANON v1

## 1) Resume Exposure (LOCKED)

**Default state**

* Resume is **not downloadable** by default
* Resume visibility is **candidate-controlled**
* Resume is a **proof artifact**, not a marketing asset

### Visibility behavior

* `visibility.resume = hidden` → no resume surface at all
* `visibility.resume = limited` → explicit “Download resume” action
* `visibility.resume = public` → allowed but discouraged (edge case)

**Canon default:** `limited`

---

## 2) Download Semantics (Important)

When resume download is enabled:

* Requires an **explicit click**
* No auto-download
* No inline rendering by default
* No indexing encouragement
* No “share” affordances

Headers / delivery posture:

* discourage caching where reasonable
* signed or controlled URLs preferred
* calm, neutral UI (“Download resume” — nothing else)

SilentApply never frames resumes as “optimized” or “enhanced.”

---

## 3) Resume Identity Model (CRITICAL FOR FUTURE)

We now formally distinguish **resume identity** from **resume instances**.

### Canon concepts

* **Resume Root** – the candidate’s canonical resume identity
* **Resume Variant** – a derived, contextual instance of that resume

This is the key that unlocks AI tailoring *without breaking trust*.

---

## 4) Data Model Extension (Future-safe, Additive)

Your existing model:

```prisma
model Resume {
  id         String   @id @default(uuid())
  profileId  String
  fileUrl    String
  parsedText String
  createdAt  DateTime
  profile    Profile
  chunks     ResumeChunk[]
}
```

### Canonical evolution (non-breaking)

#### A) Resume Root

The current `Resume` becomes the **root** by default.

Add (later, additive):

```prisma
variantType String @default("canonical") // canonical | tailored
```

#### B) Resume Variant (new model, future)

```prisma
model ResumeVariant {
  id            String   @id @default(uuid())
  resumeId      String
  profileId     String
  variantType   String   // tailored
  contextJson   Json     // job description, recruiter signal, role, etc.
  fileUrl       String
  generatedAt   DateTime @default(now())

  resume        Resume   @relation(fields: [resumeId], references: [id])
}
```

**Key rule:**
Variants **never replace** the canonical resume. They are always derived.

---

## 5) AI-Tailored Resume Guardrails (SEALED)

This is where most products screw it up. We won’t.

### What SilentApply may do (future)

* Generate **contextual variants** when explicitly requested by the candidate
* Tailor phrasing or emphasis to:

  * role type
  * industry
  * recruiter/company context
* Make variants **clearly contextual**, never deceptive

### What SilentApply will never do

* Automatically tailor without consent
* Present a variant as “the resume”
* Rewrite facts
* Generate negotiation language
* Optimize for manipulation

**Canon framing**

> “A contextual version, prepared for this role.”

Not:

* “Optimized”
* “Maximized”
* “Engineered to win”

---

## 6) Quiet Link UX for Variants (Future)

When variants exist:

* Default download = **canonical resume**
* Variant downloads are:

  * clearly labeled
  * optional
  * candidate-triggered

Recruiters never see:

* internal prompts
* AI settings
* generation mechanics

They just see:

> “Resume (contextual)”

---

## 7) Logging + Privacy (Resume-specific)

Allowed events:

* `resume.downloaded`
* `resume.variant.generated`
* `resume.variant.downloaded`

Not allowed:

* tracking recruiter identity across downloads
* using resume access for retargeting
* ranking recruiters

Candidate may see aggregate counts only.

---

## 8) Monetization Boundary (Important, but quiet)

Resume variants are a **natural premium boundary**, but:

* never teased aggressively
* never mentioned in hero
* never gated mid-flow

If monetized:

* framed as **control and clarity**
* not “better chances”

---

## ✅ Immediate Implementation Adjustments (Now)

### A) Enforce `visibility.resume = limited` default

When creating a profile:

* resume exists
* download disabled until candidate enables it

### B) Resume download endpoint checks

Before serving:

* profile.published === true
* visibility.resume !== hidden

### C) Schema note (no migration yet)

Add a comment / TODO near `Resume`:

> “This is the canonical resume root. Variants will be additive.”

That prevents future refactors from collapsing identity.

---