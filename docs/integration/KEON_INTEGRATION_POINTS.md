# Keon Integration Points

**Status:** 🟡 SCAFFOLDED — Awaiting Keon Endpoints  
**Owner:** AugmentTitan (Orchestrator 4)  
**Last Updated:** 2026-01-25

---

## Overview

This document maps where Keon evidence verification and governance will integrate into SilentApply.

**Current State:** Stub adapter returns safe defaults  
**Future State:** Real Keon API calls for evidence verification

---

## Integration Architecture

```
SilentApply UI
    ↓
lib/keon/client.ts (factory)
    ↓
lib/keon/adapter.stub.ts (current)
lib/keon/adapter.http.ts (future)
    ↓
Keon API (external service)
```

---

## Evidence Verification Flow

### 1. Candidate Submits Evidence

**Location:** `app/candidate/profile/edit` (future)  
**Action:** Candidate adds proof link (GitHub, LinkedIn, portfolio, etc.)

**Integration Point:**
```typescript
import { getKeonClient } from '@/lib/keon';

const keon = getKeonClient();
const result = await keon.verifyEvidence({
  evidenceId: evidence.id,
  type: 'github_profile',
  url: 'https://github.com/username',
  correlationId: correlationId
});
```

**Current Behavior:** Returns `status: 'pending'`  
**Future Behavior:** Keon verifies URL ownership and authenticity

---

### 2. Evidence Status Display

**Location:** `app/p/[handle]/page.tsx`  
**Action:** Show verification badges on public profile

**Integration Point:**
```typescript
const statusCheck = await keon.checkEvidenceStatus({
  evidenceId: evidence.id,
  correlationId: correlationId
});

// Display badge based on status:
// - 'verified' → green checkmark
// - 'pending' → gray clock
// - 'failed' → no badge
// - 'expired' → warning icon
```

**Current Behavior:** No verification badges shown  
**Future Behavior:** Visual indicators of Keon verification status

---

### 3. Governance Policy Checks

**Location:** `app/api/profile` (publish action)  
**Action:** Check if profile can be published

**Integration Point:**
```typescript
const policyCheck = await keon.checkPolicy({
  profileId: profile.id,
  action: 'publish',
  correlationId: correlationId
});

if (!policyCheck.allowed) {
  return { error: policyCheck.reason };
}
```

**Current Behavior:** All actions allowed  
**Future Behavior:** Keon enforces governance rules (e.g., minimum evidence required)

---

## Supported Evidence Types

| Type | Description | Verification Method |
|------|-------------|---------------------|
| `github_profile` | GitHub profile URL | OAuth or public API check |
| `linkedin_profile` | LinkedIn profile URL | URL validation + scraping |
| `portfolio_url` | Personal website/portfolio | URL reachability + metadata |
| `certification` | Professional certification | Manual review or API integration |
| `work_sample` | Code sample, design, etc. | URL reachability |
| `reference` | Professional reference | Email verification (future) |
| `custom_link` | Any other proof link | URL reachability only |

---

## Verification Statuses

| Status | Meaning | UI Treatment |
|--------|---------|--------------|
| `pending` | Submitted, not yet verified | Gray clock icon |
| `verified` | Keon confirmed authenticity | Green checkmark |
| `failed` | Verification failed | No badge shown |
| `expired` | Verification expired | Warning icon |
| `revoked` | Manually revoked | No badge shown |

---

## Configuration

### Environment Variables

```bash
# Enable Keon integration
KEON_ENABLED=false

# Keon API endpoint (when available)
KEON_BASE_URL=https://keon.example.com/api

# Keon API key (when available)
KEON_API_KEY=keon_xxx
```

### Feature Flags

```typescript
// lib/config/features.ts
export const FEATURES = {
  keonVerification: process.env.KEON_ENABLED === 'true',
  keonPolicyEnforcement: false, // Enable when ready
};
```

---

## Wiring Checklist

When Keon endpoints are available:

- [ ] Create `lib/keon/adapter.http.ts` (real HTTP client)
- [ ] Update `lib/keon/client.ts` to use HTTP adapter when configured
- [ ] Add Keon API credentials to environment
- [ ] Update UI to show verification badges
- [ ] Add policy checks to profile publish flow
- [ ] Add evidence submission UI in candidate dashboard
- [ ] Add tests for Keon integration
- [ ] Update this document with actual API contracts

---

## Assumptions

1. Keon will provide REST API for evidence verification
2. Verification is async (submit → poll for status)
3. Verification results are cached in SilentApply DB
4. Governance policies are configurable per tenant
5. Evidence can expire and require re-verification

---

## Dependencies

**Blocked By:**
- Keon API endpoints must be available
- Keon API documentation must be published
- Keon authentication mechanism must be defined

**Blocking:**
- Public profile evidence display
- Candidate evidence submission UI
- Profile publish governance

---

## Next Steps

1. Wait for Keon API specification
2. Implement HTTP adapter when endpoints are ready
3. Wire evidence submission UI
4. Wire verification badge display
5. Add governance policy enforcement

