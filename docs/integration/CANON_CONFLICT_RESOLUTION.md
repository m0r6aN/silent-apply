# Canon Conflict Resolution — Gemini Handoff

**Date:** 2026-01-25  
**Orchestrator:** AugmentTitan (Orchestrator 4)  
**Status:** 🔴 BLOCKING ISSUE — Requires Gemini Campaign II Resolution

---

## 🚨 Issue Summary

Two competing canons exist in the SilentApply repository:

1. **CANON.md** (root level, public, Apache 2.0)
2. **SILENTAPPLY_BRAND_DOCTRINE.md** (contractor handoff, internal)

These documents contain **incompatible positioning and language**.

---

## 📋 Pantheon Ruling (2026-01-25)

**CANON.md is authoritative.**

- SILENTAPPLY_BRAND_DOCTRINE.md is **non-authoritative** where it conflicts
- Must be archived/annotated by Gemini in Campaign II
- Merge order: Gemini resolves copy/canon alignment **before** Augment merges

---

## 🔍 Conflict Details

### CANON.md (Authoritative)

**Tone:** Calm, restrained, minimal, silent  
**Philosophy:** Infrastructure, not theater  
**Language:** "quiet professional presence", "silence is a feature"

**Forbidden:**
- urgency
- persuasion
- excitement
- "win", "crush", "dominate", "transform"
- "don't miss", "limited", "act now"
- "magic", "powered by AI", model names

### SILENTAPPLY_BRAND_DOCTRINE.md (Non-Authoritative)

**Tone:** Confident, opportunity-focused, declarative  
**Philosophy:** Systematic career advancement  
**Language:** "win interviews", "eliminate back-and-forth", "transforms job search"

**Violations of CANON.md:**
- ❌ "win interviews for job seekers" (forbidden: "win")
- ❌ "transforming the job search" (forbidden: "transform")
- ❌ "tangible manifestation of career opportunity" (persuasion)
- ❌ "cognitive core that transforms candidate profiles" (excitement framing)
- ❌ "systematic career advancement rather than incremental job searching" (pressure)

---

## 📂 Affected Files

### Files Requiring Gemini Rewrite (Canon Violations)

1. **app/page.tsx**
   - Contains: "Your job search, already handled."
   - Contains: "SilentApply AI" branding
   - Contains: "Powered by OMEGA • Governed by Keon"
   - **Action:** Rewrite to match CANON.md tone (calm, minimal, no hype)

2. **app/p/[handle]/page.tsx**
   - Contains: "SilentApply AI" branding
   - Contains: "Powered by OMEGA • Governed by Keon"
   - Contains: "Questions answered instantly via SilentApply AI Q&A"
   - **Action:** Rewrite to match CANON.md tone

3. **silentapply-contractor-handoff/DOCTRINE/SILENTAPPLY_BRAND_DOCTRINE.md**
   - **Action:** Archive to `/docs/_archive/` with deprecation notice

4. **docs/internal/SILENTAPPLY_BRAND_DOCTRINE.md**
   - **Action:** Archive to `/docs/_archive/` with deprecation notice

---

## ✅ Gemini Campaign II Required Actions

### 1. Archive Non-Authoritative Doctrine

Move to `/docs/_archive/SILENTAPPLY_BRAND_DOCTRINE.md` with header:

```markdown
# ⚠️ DEPRECATED — Non-Authoritative

This document is **not authoritative** where it conflicts with CANON.md.

**Authoritative Source:** `/CANON.md`  
**Deprecated:** 2026-01-25  
**Reason:** Conflicts with public canon (urgency, persuasion, excitement framing)

This file is preserved for historical reference only.
```

### 2. Rewrite Public-Facing Copy

**app/page.tsx:**
- Remove "SilentApply AI" → use "SilentApply"
- Remove "Powered by OMEGA • Governed by Keon" (model name exposure)
- Rewrite hero copy to be calm, declarative, minimal
- Remove any urgency/excitement language

**app/p/[handle]/page.tsx:**
- Remove "SilentApply AI" → use "SilentApply"
- Remove "Powered by OMEGA • Governed by Keon"
- Simplify Q&A messaging to be bounded, not promotional

### 3. Add Canon Guardrails

Create `/docs/CANON_COMPLIANCE_CHECKLIST.md`:
- Copy review checklist
- Forbidden language detector
- Pre-commit hook suggestions

---

## 🔒 AugmentTitan Constraints

**Until Gemini completes the above:**

### ✅ Allowed
- Create integration scaffolds (types, interfaces, stubs)
- Create configuration infrastructure
- Document integration points
- Build canon-neutral directory structure

### ❌ Forbidden
- Modify `app/page.tsx` or `app/p/[handle]/page.tsx`
- Introduce any copy that could drift into persuasion
- Implement behavior that implies trust/safety/governance
- Merge to main

---

## 📊 Resolution Status

- [ ] BRAND_DOCTRINE archived with deprecation notice
- [ ] `app/page.tsx` rewritten to match CANON.md
- [ ] `app/p/[handle]/page.tsx` rewritten to match CANON.md
- [ ] Canon compliance checklist created
- [ ] Gemini Campaign II complete
- [ ] AugmentTitan green-lit for merge

---

## 🔗 References

- **Authoritative Canon:** `/CANON.md`
- **Agent Guardrails:** `/AGENTS.md`
- **Pantheon Ruling:** This document (2026-01-25)
- **Gemini Handoff:** Campaign II (copy/canon alignment)

---

**Next Owner:** Gemini (Campaign II)  
**Blocked Work:** AugmentTitan merge authority

