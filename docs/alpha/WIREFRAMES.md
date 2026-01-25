# Wireframes — SilentApply MVP

**Team Alpha Phase 1 Deliverable**

ASCII and markdown wireframes for all MVP pages. Layout order matches QUIET_LINK_PAGE_LAYOUT_CANON_v1.md exactly.

---

## Design Principles

- Vertical single-column flow
- Calm spacing (no competing sections)
- Mobile-first (same order on all breakpoints)
- No sticky CTAs or persuasive patterns
- Sections suppress silently when empty

---

## 1. Public Quiet Link Page (/[handle])

### Above-the-Fold

```
┌─────────────────────────────────────────────┐
│                                             │
│  [Name]                                     │
│  ══════                                     │
│  Large, plain text, no badges               │
│                                             │
│  [Headline]                                 │
│  ─────────                                 │
│  Single declarative sentence                │
│  (e.g., "Senior Backend Engineer focused    │
│   on distributed systems")                  │
│                                             │
│  [Roles / Focus]                            │
│  • Backend Engineering                      │
│  • Distributed Systems                      │
│  • Infrastructure                           │
│                                             │
│  [Location + Work Mode]                     │
│  Remote • US-based • Open to hybrid         │
│  within 20 miles                            │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ [ Ask a question ]                   │  │
│  │ [ Book a conversation ]              │  │
│  │ [ Download resume ]                  │  │
│  │                                      │  │
│  │ (Only enabled actions shown)         │  │
│  │ (Secondary visual weight)            │  │
│  └──────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Name is `<h1>`, no icons or badges
- Headline is declarative, no adjective stacking
- Roles listed without hierarchy
- Location factual, no urgency
- Actions are affordances, not CTAs (no color dominance)

**Mobile Behavior:**
- Same vertical order
- Actions stack vertically
- No sticky buttons

---

### Below-the-Fold

#### Section 1: Proof & Work

```
┌─────────────────────────────────────────────┐
│                                             │
│  Proof & Work                               │
│  ────────────                               │
│                                             │
│  • Portfolio: example.com/portfolio         │
│  • Case Study: example.com/case-study       │
│  • GitHub: github.com/username              │
│                                             │
│  (Neutral labels, no thumbnails)            │
│  (No engagement metrics)                    │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Simple link list, no visual dominance
- Links underlined for accessibility
- External link indicators for screen readers
- Suppressed if no proof items exist

---

#### Section 2: Resume (If Enabled)

```
┌─────────────────────────────────────────────┐
│                                             │
│  Resume                                     │
│  ──────                                     │
│                                             │
│  [ Download resume ]                        │
│                                             │
│  (Single button, no preview)                │
│  (Entire section suppressed if disabled)    │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Single affordance, no explanation text
- Button secondary weight, not CTA styled
- Entire section hidden if `resumeEnabled === false`

---

#### Section 3: Q&A (If Enabled)

```
┌─────────────────────────────────────────────┐
│                                             │
│  Questions                                  │
│  ─────────                                 │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Your email                          │   │
│  │ [email input]                       │   │
│  │                                     │   │
│  │ Question                            │   │
│  │ [textarea]                          │   │
│  │                                     │   │
│  │ [ Submit question ]                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Previous Questions                         │
│  ─────────────────                         │
│                                             │
│  Q: [Question text]                         │
│  A: [Answer text]                           │
│  [timestamp]                                │
│                                             │
│  Q: [Question text]                         │
│  A: [Answer text]                           │
│  [timestamp]                                │
│                                             │
│  (Each Q&A stands alone, no threading)      │
│  (No "assistant typing…" indicators)        │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Email required, no account creation
- No placeholder persuasion
- Previous Q&A displayed as reference blocks, not conversation
- Out-of-scope answers are bounded refusals
- Entire section suppressed if `qaEnabled === false`

---

#### Section 4: Availability & Booking (If Enabled)

```
┌─────────────────────────────────────────────┐
│                                             │
│  Availability                               │
│  ────────────                               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [ Monday, Jan 27 • 2:00 PM ]        │   │
│  │ [ Monday, Jan 27 • 3:00 PM ]        │   │
│  │ [ Tuesday, Jan 28 • 10:00 AM ]      │   │
│  │ [ Tuesday, Jan 28 • 2:00 PM ]       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  (Calm list, no calendar dominance)         │
│  (No heatmaps or urgency)                   │
│  (Entire section suppressed if disabled)    │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Simple list, no calendar UI for MVP
- No "next available" emphasis
- Time offered, not sold
- Entire section hidden if `bookingEnabled === false`

---

### Booking Confirmation Modal

```
┌─────────────────────────────────────────────┐
│                                             │
│  Confirm Booking                            │
│  ───────────────                           │
│                                             │
│  Monday, January 27, 2025                   │
│  2:00 PM – 3:00 PM EST                      │
│                                             │
│  This slot is held until 2:15 PM.           │
│                                             │
│  Your email                                 │
│  [email input]                              │
│                                             │
│  Optional message                           │
│  [textarea]                                 │
│                                             │
│  [ Confirm booking ]  [ Cancel ]            │
│                                             │
│  (No countdown emphasis)                    │
│  (Cancel equally visible)                   │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Hold expiry stated factually, no countdown timer
- Email required for confirmation
- Optional message field
- Cancel button equal weight to confirm
- No urgency language

---

### Footer (Minimal)

```
┌─────────────────────────────────────────────┐
│                                             │
│  Privacy  •  Terms                          │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- No marketing copy
- No calls to action
- No cross-links
- Page ends quietly

---

## 2. Auth Pages

### /continue

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│         Continue to SilentApply             │
│         ═══════════════════════             │
│                                             │
│         Email address                       │
│         [email input]                       │
│                                             │
│         [ Continue ]                        │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Centered, minimal
- No marketing language
- No persuasive copy
- Button labeled "Continue"

**Accessibility:**
- Email input with proper type and autocomplete
- Focus on email input on mount
- Error messages linked to input

---

### /continue/check-email

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│         Check your email                    │
│         ════════════════                    │
│                                             │
│         A sign-in link has been sent to     │
│         user@example.com. It expires in     │
│         15 minutes.                         │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Factual statement only
- No countdown or urgency emphasis
- No "magic link" language

**Accessibility:**
- Focus on heading on mount
- Email address displayed clearly

---

## 3. Candidate Dashboard

### Dashboard Layout (Common)

```
┌─────────────────────────────────────────────┐
│ SilentApply                    user@ex.com  │
│ ───────────────────────────────────────────│
│                                             │
│ [ Profile ] [ Resume ] [ Availability ]     │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│         [PAGE CONTENT]                      │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Minimal navigation
- No monetization prompts
- No urgency indicators

**Accessibility:**
- Skip to content link
- Navigation landmarks
- Current page indicated

---

### Profile Editor

```
┌─────────────────────────────────────────────┐
│                                             │
│  Profile                                    │
│  ═══════                                    │
│                                             │
│  Name                                       │
│  [text input]                               │
│                                             │
│  Headline                                   │
│  [text input]                               │
│                                             │
│  Roles / Focus                              │
│  [multi-select or tags]                     │
│                                             │
│  Location                                   │
│  [text input]                               │
│                                             │
│  Work Mode                                  │
│  ( ) Remote  ( ) Hybrid  ( ) Onsite         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ☐ Profile visible to recruiters    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [ Save changes ]                           │
│                                             │
│  (No "optimize your profile" prompts)       │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- All fields optional
- Published toggle clear and factual
- No optimization suggestions
- No urgency

**Accessibility:**
- Form labels and fieldsets
- Save confirmation announced
- Required fields indicated

---

### Resume Management

```
┌─────────────────────────────────────────────┐
│                                             │
│  Resume                                     │
│  ══════                                     │
│                                             │
│  Current Resume                             │
│  ─────────────────                         │
│                                             │
│  resume.pdf                                 │
│  Uploaded on Jan 15, 2025                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ☐ Allow resume download             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [ Remove resume ]                          │
│                                             │
│  ───────────────────────────────────────   │
│                                             │
│  Upload New Resume                          │
│  ──────────────────                        │
│                                             │
│  [ Choose file ]                            │
│                                             │
│  (No preview required for MVP)              │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Download toggle off by default
- Remove requires confirmation
- No preview for MVP
- No persuasive language

**Accessibility:**
- File input with accept attribute
- Upload progress announced
- Delete confirmation dialog

---

### Proof Links Manager

```
┌─────────────────────────────────────────────┐
│                                             │
│  Proof & Work                               │
│  ════════════                               │
│                                             │
│  • Portfolio: example.com/portfolio         │
│    [Edit] [Remove]                          │
│                                             │
│  • GitHub: github.com/username              │
│    [Edit] [Remove]                          │
│                                             │
│  [ Add proof link ]                         │
│                                             │
│  ───────────────────────────────────────   │
│                                             │
│  Add Proof Link                             │
│  ──────────────                            │
│                                             │
│  Label                                      │
│  [text input]                               │
│                                             │
│  URL                                        │
│  [url input]                                │
│                                             │
│  Type                                       │
│  [select: Portfolio / Case Study / Other]   │
│                                             │
│  [ Save ]  [ Cancel ]                       │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Simple list, no ordering emphasis
- No portfolio theater
- Add/edit inline or in modal

**Accessibility:**
- Form validation
- Remove confirmation
- Success announcements

---

### Availability Editor

```
┌─────────────────────────────────────────────┐
│                                             │
│  Availability                               │
│  ════════════                               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ☐ Enable booking                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Time Slots                                 │
│  ──────────                                │
│                                             │
│  • Monday, Jan 27 • 2:00 PM                 │
│    [Remove]                                 │
│                                             │
│  • Monday, Jan 27 • 3:00 PM                 │
│    [Remove]                                 │
│                                             │
│  [ Add time slot ]                          │
│                                             │
│  ───────────────────────────────────────   │
│                                             │
│  Add Time Slot                              │
│  ──────────────                            │
│                                             │
│  Date                                       │
│  [date picker]                              │
│                                             │
│  Start Time                                 │
│  [time picker]                              │
│                                             │
│  End Time                                   │
│  [time picker]                              │
│                                             │
│  [ Save ]  [ Cancel ]                       │
│                                             │
│  (No calendar heatmaps for MVP)             │
│                                             │
└─────────────────────────────────────────────┘
```

**Canon Compliance:**
- Toggle clear and bounded
- Simple list view, no calendar UI for MVP
- No urgency patterns

**Accessibility:**
- Date/time inputs with proper formats
- Remove confirmations
- Success announcements

---

## 4. Section Suppression Examples

### Published Profile (All Sections Enabled)

```
Above fold:
- Name, headline, roles, location, actions

Below fold:
- Proof & Work
- Resume
- Q&A
- Availability
```

### Profile with Resume Disabled

```
Above fold:
- Name, headline, roles, location
- Actions (no "Download resume" button)

Below fold:
- Proof & Work
- Q&A
- Availability

(Resume section not rendered at all)
```

### Profile with No Proof Links

```
Above fold:
- Name, headline, roles, location, actions

Below fold:
- Resume
- Q&A
- Availability

(Proof & Work section not rendered at all)
```

**Canon Rule:** If a section has no content or is disabled, it does not render. No placeholder. No explanation. Absence is intentional.

---

## 5. Mobile Responsive Notes

### Breakpoints

- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

### Mobile-Specific Rules

1. Same vertical order on all breakpoints
2. Actions stack vertically on mobile
3. No collapsible tricks to hide content
4. Actions remain visible but not sticky (no sticky CTAs)
5. Typography scales proportionally
6. Touch targets minimum 44x44px

### Example: Mobile Quiet Link Header

```
┌───────────────────────┐
│                       │
│  John Doe             │
│  ═════════            │
│                       │
│  Senior Backend       │
│  Engineer focused on  │
│  distributed systems  │
│                       │
│  • Backend            │
│  • Distributed        │
│  • Infrastructure     │
│                       │
│  Remote • US-based    │
│                       │
│  ┌─────────────────┐ │
│  │ Ask a question  │ │
│  └─────────────────┘ │
│  ┌─────────────────┐ │
│  │ Book a convo    │ │
│  └─────────────────┘ │
│  ┌─────────────────┐ │
│  │ Download resume │ │
│  └─────────────────┘ │
│                       │
└───────────────────────┘
```

---

## Definition of Done

- [x] All MVP pages wireframed
- [x] Layout order matches canon exactly
- [x] Above/below fold structure clear
- [x] Section suppression rules documented
- [x] Mobile behavior specified
- [x] Canon compliance notes for each page
- [x] No business logic leaked into specs

---

**Status:** Phase 1 Complete — Ready for Implementation
