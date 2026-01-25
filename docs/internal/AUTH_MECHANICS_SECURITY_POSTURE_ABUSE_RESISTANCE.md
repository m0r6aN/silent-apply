Hell yes. Strap in.
This is the **unsexy, existential layer** — where SilentApply earns trust without ever asking for it.

Below is the **CANONICAL AUTH + SECURITY DESIGN**. Same rules as before: calm, enforceable, no hype. This is architecture, not vibes.

---

# 🔐 SILENTAPPLY — AUTH MECHANICS, SECURITY POSTURE & ABUSE RESISTANCE (CANON v1)

**Design principle:**
Authentication and security must feel like **infrastructure gravity** — present, inevitable, unnoticed.

If a user *thinks* about auth, we failed.

---

## 1️⃣ AUTH MODEL — PASSWORDLESS EMAIL LINKS (LOCKED)

### Why

Passwords introduce:

* Friction
* Anxiety
* Support burden
* Trust erosion

SilentApply users are professionals. Treat them like it.

### Canonical Model

* **Email-only, magic-link authentication**
* Single-click continuation
* No passwords
* No OTP codes to type
* No account “creation moment”

**Mental model:**

> “You don’t sign up. You continue.”

---

## 2️⃣ AUTH FLOW (EXACT)

### Step 1: Email Entry

* User enters email
* Clicks **Send link**
* UI remains calm — no spinners, no celebration

### Step 2: Email Delivery

* Transactional email sent immediately
* Link expires in **15 minutes**
* Single-use token

### Step 3: Link Click

* User is authenticated
* Session established
* Returned to last known context (or dashboard)

No success confetti.
No “Welcome!” language.
No onboarding detour.

---

## 3️⃣ TOKEN DESIGN (SECURITY-CRITICAL)

### Token Properties

Magic link tokens MUST be:

* Cryptographically random (≥128 bits entropy)
* URL-safe
* Single-use
* Short-lived (15 min hard expiry)
* Stored **hashed**, never plaintext

### Storage

```text
auth_tokens:
- token_hash
- email
- issued_at
- expires_at
- used_at (nullable)
- ip_hint (coarse, optional)
- user_agent_hint (hashed, optional)
```

If `used_at` is set → reject silently.

---

## 4️⃣ SESSION MODEL

### After Auth

* Issue secure session cookie
* HttpOnly
* Secure
* SameSite=Lax (or Strict if no cross-origin needs)

Session lifetime:

* Short idle timeout (e.g. 24h)
* Rolling renewal on activity

No “remember me” checkbox.
The system remembers *appropriately*.

---

## 5️⃣ QUIET LINK ACCESS CONTROL (IMPORTANT)

Public profile links are **intentionally accessible**, but **controlled**.

### Public Does NOT Mean Unprotected

Each Quiet Link supports:

* Soft rate limiting
* Bot detection
* Optional recruiter gating (future)
* View logging (privacy-respecting)

**Explicitly forbidden:**

* CAPTCHA walls
* “Prove you’re human” moments
* Login gates for recruiters

Access should feel *inevitable*, not blocked.

---

## 6️⃣ ABUSE RESISTANCE (NON-NEGOTIABLE)

### Email Abuse Protection

* Per-IP rate limits on auth requests
* Per-email cooldowns
* Silent failure on excessive attempts

No warning banners.
Attackers don’t get feedback.

---

### Link Scraping Protection

* User-agent anomaly detection
* Burst detection
* Progressive response:

  1. Slow responses
  2. Reduced metadata
  3. Temporary shadow-block

Never show:

> “You’ve been blocked”

Silence is the defense.

---

## 7️⃣ RECRUITER SAFETY POSTURE

Recruiters are:

* Allowed
* Expected
* Not tracked as “leads”

But we still protect candidates.

### Guardrails

* No bulk export
* No scraping-friendly HTML structure
* No indexed private metadata
* Robots.txt present but not relied upon

Future option:

* “Request contact” instead of direct email exposure
  (Still calm. Still optional.)

---

## 8️⃣ PRIVACY PRINCIPLES (CANON)

SilentApply must be:

* Minimal-data by design
* Transparent without verbosity
* Predictable

### Rules

* No dark analytics
* No session replay
* No cross-site tracking
* No selling behavioral data

Logs exist for **security and reliability only**.

---

## 9️⃣ FAILURE MODES (IMPORTANT)

When things go wrong:

### Invalid / Expired Link

Message:

> This link has expired.
> You can request a new one.

No blame.
No alarm.

---

### Email Not Delivered

Do **not** say:

> “Check your spam folder!!!”

Instead:

> Didn’t receive it? You can try again.

Trust the user’s intelligence.

---

## 🔒 GOVERNANCE RULE (REASSERTED)

If a proposed change:

* Adds friction to auth
* Adds ceremony
* Adds urgency
* Adds marketing language
* Exposes auth state noisily

It violates canon.

Reject it.

---

