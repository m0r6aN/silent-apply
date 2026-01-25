# Copy & Tone Rules — SilentApply MVP

**Team Alpha Phase 1 Deliverable**

Specific copy for all buttons, error messages, empty states, and auth flows. Enforces zero forbidden language per AGENTS.md.

---

## Tone Principles

SilentApply copy must be:

- **Calm** — No urgency, no excitement
- **Declarative** — Facts, not persuasion
- **Bounded** — Minimal, no explanations
- **Respectful** — Infrastructure, not theater

**Forbidden Language:**

- No "win", "crush", "dominate", "transform"
- No "don't miss", "limited", "act now"
- No "magic", "powered by AI", model names
- No exclamation marks
- No apologies or justifications
- No "likely", "probably", or speculative language

---

## 1. Public Quiet Link Copy

### Page Title (Browser Tab)

```
[Candidate Name] — SilentApply
```

Example: `Jane Doe — SilentApply`

---

### Heading Copy

**Name:** Plain text, no suffix

```
Jane Doe
```

**Headline:** Single declarative sentence

```
Senior Backend Engineer focused on distributed systems
```

Not:
- ~~"Results-driven Senior Backend Engineer who crushes deadlines"~~
- ~~"Transforming backend architecture with cutting-edge solutions"~~

---

### Location/Work Mode

```
Remote • US-based
```

```
Hybrid • San Francisco • Open to onsite within 20 miles
```

```
Onsite • New York, NY
```

Not:
- ~~"Remote work enthusiast"~~
- ~~"Location-flexible superstar"~~

---

### Primary Actions

**Buttons:**

```
Ask a question
```

```
Book a conversation
```

```
Download resume
```

Not:
- ~~"Get answers instantly"~~
- ~~"Schedule now"~~
- ~~"Grab my resume"~~

---

### Proof & Work Section

**Heading:**

```
Proof & Work
```

or

```
Work
```

**Link Labels:**

```
Portfolio: example.com/portfolio
```

```
Case Study: example.com/case-study
```

```
GitHub: github.com/username
```

Not:
- ~~"Check out my amazing portfolio"~~
- ~~"See how I transformed this client's infrastructure"~~

---

### Resume Section

**Heading:**

```
Resume
```

**Button:**

```
Download resume
```

Not:
- ~~"Get my full story"~~
- ~~"Download my credentials"~~

---

### Q&A Section

**Heading:**

```
Questions
```

**Form Labels:**

```
Your email
```

```
Question
```

**Button:**

```
Submit question
```

Not:
- ~~"Fire away"~~
- ~~"Ask me anything"~~

**Placeholder Text (if needed):**

```
name@example.com
```

```
Type your question here
```

Not:
- ~~"Enter your email to get instant answers"~~
- ~~"What would you like to know?"~~

---

### Q&A Bounded Refusals

When a question is out of scope:

```
That isn't available here.
```

```
The candidate hasn't shared that.
```

```
That information is not included.
```

Not:
- ~~"Sorry, I can't answer that."~~
- ~~"Great question, but I don't have that info."~~
- ~~"Unfortunately, that's beyond my scope."~~

---

### Availability Section

**Heading:**

```
Availability
```

**Button Text (Slot):**

```
Monday, Jan 27 • 2:00 PM
```

Format: `Day, Month Date • Time`

Not:
- ~~"Book Monday at 2PM now"~~
- ~~"Limited availability"~~

---

### Booking Confirmation Modal

**Heading:**

```
Confirm Booking
```

**Date/Time Display:**

```
Monday, January 27, 2025
2:00 PM – 3:00 PM EST
```

**Hold Message:**

```
This slot is held until [time].
```

Example: `This slot is held until 2:15 PM.`

Not:
- ~~"Hurry, your hold expires in 10 minutes!"~~
- ~~"Don't lose this slot!"~~

**Form Labels:**

```
Your email
```

```
Optional message
```

**Buttons:**

```
Confirm booking
```

```
Cancel
```

Not:
- ~~"Secure my spot"~~
- ~~"Never mind"~~

---

### Footer

```
Privacy  •  Terms
```

Not:
- ~~"Made with love"~~
- ~~"Join thousands of candidates"~~

---

## 2. Auth Pages Copy

### /continue

**Page Title:**

```
Continue to SilentApply
```

**Heading:**

```
Continue to SilentApply
```

**Form Label:**

```
Email address
```

**Button:**

```
Continue
```

Not:
- ~~"Sign up / Log in"~~
- ~~"Get started"~~
- ~~"Join now"~~

**Placeholder:**

```
name@example.com
```

---

### /continue/check-email

**Page Title:**

```
Check your email — SilentApply
```

**Heading:**

```
Check your email
```

**Body Copy:**

```
A sign-in link has been sent to [email]. It expires in 15 minutes.
```

Example:
```
A sign-in link has been sent to jane@example.com. It expires in 15 minutes.
```

Not:
- ~~"We've sent you a magic link!"~~
- ~~"Check your inbox for a special link"~~
- ~~"Your link is on the way!"~~

---

### Auth Email

**Subject:**

```
Sign-in link for SilentApply
```

**Preheader:**

```
Expires in 15 minutes
```

**Email Body:**

```
You requested a sign-in link for SilentApply.

[Button: Continue to SilentApply]

This link expires in 15 minutes.

If you did not request this, you can ignore this email.
```

**Button Text:**

```
Continue to SilentApply
```

Not:
- ~~"Click here to sign in"~~
- ~~"Your magic link is here"~~

---

## 3. Candidate Dashboard Copy

### Navigation

**Tabs/Links:**

```
Profile
```

```
Resume
```

```
Availability
```

Not:
- ~~"My Profile"~~
- ~~"Manage Resume"~~

---

### Profile Editor

**Page Title:**

```
Profile — SilentApply
```

**Heading:**

```
Profile
```

**Form Labels:**

```
Name
```

```
Headline
```

```
Roles / Focus
```

```
Location
```

```
Work Mode
```

**Work Mode Options:**

```
Remote
```

```
Hybrid
```

```
Onsite
```

**Published Toggle:**

```
Profile visible to recruiters
```

Not:
- ~~"Make my profile live"~~
- ~~"Go public"~~

**Button:**

```
Save changes
```

Not:
- ~~"Update profile"~~
- ~~"Save and publish"~~

---

### Resume Management

**Page Title:**

```
Resume — SilentApply
```

**Heading:**

```
Resume
```

**Section Heading:**

```
Current Resume
```

**File Display:**

```
resume.pdf
Uploaded on Jan 15, 2025
```

**Toggle:**

```
Allow resume download
```

Not:
- ~~"Let recruiters download my resume"~~
- ~~"Enable resume sharing"~~

**Buttons:**

```
Remove resume
```

```
Upload resume
```

```
Choose file
```

Not:
- ~~"Delete resume"~~
- ~~"Upload new version"~~

---

### Proof Links Manager

**Page Title:**

```
Proof & Work — SilentApply
```

**Heading:**

```
Proof & Work
```

**Form Labels:**

```
Label
```

```
URL
```

```
Type
```

**Type Options:**

```
Portfolio
```

```
Case Study
```

```
Other
```

**Buttons:**

```
Add proof link
```

```
Save
```

```
Cancel
```

```
Edit
```

```
Remove
```

Not:
- ~~"Add awesome work"~~
- ~~"Showcase your projects"~~

---

### Availability Editor

**Page Title:**

```
Availability — SilentApply
```

**Heading:**

```
Availability
```

**Toggle:**

```
Enable booking
```

Not:
- ~~"Open for bookings"~~
- ~~"Accept meeting requests"~~

**Section Heading:**

```
Time Slots
```

**Form Labels:**

```
Date
```

```
Start Time
```

```
End Time
```

**Buttons:**

```
Add time slot
```

```
Remove
```

```
Save
```

```
Cancel
```

Not:
- ~~"Create availability"~~
- ~~"Delete slot"~~

---

## 4. Error Messages

All error messages must be:

- Factual statements
- No apologies
- No exclamation marks
- Bounded

### Auth Errors

**Email required:**

```
Email address is required.
```

**Invalid email format:**

```
Email address is not valid.
```

Not:
- ~~"Oops! Please enter a valid email."~~
- ~~"That doesn't look like an email address!"~~

**Rate limited (4th attempt):**

UI shows success state. No error message. Email is silently suppressed.

**Link expired:**

```
This link has expired.
```

Not:
- ~~"Sorry, this link is no longer valid."~~

---

### Profile Errors

**Name required:**

```
Name is required.
```

**Headline too long:**

```
Headline must be 200 characters or less.
```

**Save failed:**

```
Changes could not be saved.
```

Not:
- ~~"Uh oh! Something went wrong."~~
- ~~"Failed to update profile. Please try again."~~

---

### Resume Errors

**No file selected:**

```
No file selected.
```

**File too large:**

```
File must be 5MB or less.
```

**Invalid file type:**

```
File must be PDF or DOCX.
```

**Upload failed:**

```
Upload failed.
```

Not:
- ~~"Oops! We couldn't upload that."~~

---

### Booking Errors

**Slot no longer available:**

```
That slot is no longer available.
```

**Hold expired:**

```
Your hold has expired.
```

**Email required:**

```
Email address is required.
```

**Confirmation failed:**

```
Booking could not be confirmed.
```

Not:
- ~~"Oh no! Someone grabbed that slot."~~
- ~~"Sorry, you ran out of time!"~~

---

### Q&A Errors

**Question required:**

```
Question is required.
```

**Email required:**

```
Email address is required.
```

**Rate limited:**

```
Too many questions submitted.
```

Not:
- ~~"Whoa, slow down!"~~
- ~~"You're asking too many questions!"~~

**Question too long:**

```
Question must be 500 characters or less.
```

---

## 5. Empty States

All empty states must:

- State facts
- No persuasive language
- Optional action

### No Proof Links

```
No proof links added yet.
```

**Optional action button:** `Add proof link`

Not:
- ~~"Showcase your work by adding proof links!"~~

---

### No Time Slots

```
No time slots available.
```

**Optional action button:** `Add time slot`

Not:
- ~~"Start accepting bookings by adding availability!"~~

---

### No Resume

```
No resume uploaded.
```

**Optional action button:** `Upload resume`

Not:
- ~~"Upload your resume to get noticed!"~~

---

### No Questions Yet (Recruiter View)

```
No questions yet.
```

Not:
- ~~"Be the first to ask a question!"~~

---

## 6. Loading States

**Button loading text:**

```
[Spinner] Submitting...
```

```
[Spinner] Saving...
```

```
[Spinner] Uploading...
```

Not:
- ~~"Hang tight..."~~
- ~~"Working on it..."~~

**Loading spinner label (for screen readers):**

```
Loading
```

```
Submitting question
```

```
Saving changes
```

---

## 7. Success Messages

**Profile saved:**

```
Changes saved.
```

**Resume uploaded:**

```
Resume uploaded.
```

**Proof link added:**

```
Proof link added.
```

**Booking confirmed:**

```
Booking confirmed. A confirmation email has been sent.
```

**Question submitted:**

```
Question submitted.
```

Not:
- ~~"Success!"~~
- ~~"Great! Your question is on the way."~~
- ~~"All set!"~~

---

## 8. Confirmation Dialogs

### Remove Resume

**Heading:**

```
Remove resume?
```

**Body:**

```
This will remove your resume from your profile.
```

**Buttons:**

```
Remove
```

```
Cancel
```

Not:
- ~~"Are you sure you want to delete this?"~~
- ~~"This action cannot be undone!"~~

---

### Remove Proof Link

**Heading:**

```
Remove this proof link?
```

**Buttons:**

```
Remove
```

```
Cancel
```

---

### Remove Time Slot

**Heading:**

```
Remove this time slot?
```

**Buttons:**

```
Remove
```

```
Cancel
```

---

## 9. Email Copy

### Booking Confirmation Email

**Subject:**

```
Booking confirmed with [Candidate Name]
```

**Preheader:**

```
[Date] at [Time]
```

**Body:**

```
Your booking is confirmed.

Candidate: [Name]
Date: [Full Date]
Time: [Start Time] – [End Time] [Timezone]

[Optional candidate message]

If you need to cancel, reply to this email.
```

Not:
- ~~"You're all set!"~~
- ~~"Looking forward to meeting you!"~~

---

### Booking Cancellation Email (Future)

**Subject:**

```
Booking cancelled
```

**Body:**

```
Your booking with [Candidate Name] has been cancelled.

Date: [Full Date]
Time: [Start Time] – [End Time]
```

Not:
- ~~"Unfortunately, your booking has been cancelled."~~

---

## 10. Copy Checklist

Before shipping any copy, verify:

- [ ] No urgency language
- [ ] No persuasive framing
- [ ] No exclamation marks
- [ ] No apologies
- [ ] No "likely" or speculative language
- [ ] No forbidden words (win, crush, dominate, transform, magic, AI)
- [ ] Declarative statements only
- [ ] Minimal, bounded
- [ ] Respectful and calm

---

## Definition of Done

- [x] All button labels specified
- [x] All error messages specified
- [x] All empty states specified
- [x] Auth email copy specified
- [x] Booking confirmation copy specified
- [x] Zero forbidden language used
- [x] All copy is calm, declarative, bounded
- [x] Copy checklist included

---

**Status:** Phase 1 Complete — Ready for Implementation
