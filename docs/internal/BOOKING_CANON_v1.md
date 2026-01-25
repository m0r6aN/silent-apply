Perfect order. That’s the *correct* dependency chain.
We’ll seal these **in sequence**, no shortcuts, no SaaS brain.

Below is **#1 Booking Semantics** sealed now. When you confirm, we roll straight into **#2 Layout**, then **#3 Monetization**.

---

# 🔒 BOOKING CANON v1 (SilentApply)

## Purpose

Booking exists to **reduce coordination friction**, not to create pressure or urgency.

**Booking is not**

* a calendar replacement
* a sales funnel
* a scheduling game
* a commitment trap

**Prime mental model**

> “If there’s mutual interest, this makes it easy.”

---

## 1) Booking Surface (LOCKED)

### Entry

* Booking appears as a **single, calm affordance**

  * e.g. “Book a conversation”
* No animation
* No urgency language
* No “limited availability” messaging

Booking is always **optional** and **non-assertive**.

---

## 2) Slot Types (CRITICAL)

You already have the right primitive in your schema.

### Status meanings (sealed)

```text
open     = visible, available
held     = temporarily reserved
booked   = confirmed
```

### Canon behavior

* Recruiters can **hold** a slot
* Slots are not booked instantly
* Holds **expire automatically**

---

## 3) Hold Semantics (ANTI-GHOSTING CORE)

### Hold behavior

* When a recruiter selects a slot:

  * status → `held`
  * `heldUntil` is set (e.g. now + 10 minutes)
* Slot is **invisible** to others while held

### Hold expiry

* If not confirmed before `heldUntil`:

  * status reverts to `open`
  * no notifications
  * no audit noise

**Canon default:**
10-minute hold window.

This prevents:

* double booking
* calendar sniping
* “race clicking”

---

## 4) Confirmation (Deliberate, Calm)

To confirm a booking:

* Recruiter provides:

  * name (optional)
  * email (required)
* Clicks **Confirm booking**

### On confirmation

* status → `booked`
* booking is finalized
* optional notification sent to candidate (opt-in)

**Forbidden**

* auto-confirm on click
* countdown timers
* “Almost there!” copy

---

## 5) Candidate Control (SEALED)

Candidates control:

* which slots exist
* how far in advance booking is allowed
* buffer time
* whether booking is enabled at all

Candidates do **not**:

* negotiate live in the booking flow
* approve individual recruiters manually (unless future setting)

Booking is structural, not evaluative.

---

## 6) Cancellation & Reschedule (Quiet)

### Recruiter side

* Cancellation allowed via link
* No account required
* No guilt language

### Candidate side

* Candidate can cancel/reschedule
* No penalties
* No tracking of recruiter behavior

SilentApply does not score humans.

---

## 7) Abuse Resistance (Booking)

* Rate limit holds per profile
* Rate limit per IP
* Shadow suppression for abuse

Never:

* CAPTCHA
* “You are blocked”
* forced auth

If abused, booking simply becomes unavailable temporarily.

---

## 8) Logging (Minimal)

Allowed events:

* `booking.hold_created`
* `booking.hold_expired`
* `booking.confirmed`
* `booking.cancelled`

Not allowed:

* conversion metrics
* recruiter ranking
* “success rate” nonsense

---

## 9) Email Integration (Optional, Calm)

If emails are enabled:

* confirmation email
* cancellation email

Tone:

* factual
* minimal
* no reminders unless candidate opts in

Email is **supporting infrastructure**, not a driver.

---

## 10) UI Rules (Booking)

* No calendar heatmaps
* No “next available” pressure
* No flashing slots

A simple list or grid is sufficient.

---

## ✅ Immediate Implementation Notes

### A) Enforce hold expiration

* Background cleanup or request-time cleanup
* Never rely on manual release

### B) Confirm requires email

* This is identity-light, not auth

### C) Booking visibility

* Booking appears **after** profile info and proof
* Never at the very top

---
