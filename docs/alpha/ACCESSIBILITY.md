# Accessibility Requirements — SilentApply MVP

**Team Alpha Phase 1 Deliverable**

WCAG 2.1 AA compliance requirements for all MVP components. Accessibility is dignity in code.

---

## Commitment

SilentApply must be fully usable by all humans, regardless of:

- Vision (low vision, blindness, color blindness)
- Motor ability (keyboard-only, assistive devices)
- Cognitive ability (clear language, predictable patterns)
- Technology (screen readers, assistive tech)

Accessibility is not optional. It is infrastructure.

---

## WCAG 2.1 AA Compliance Requirements

### 1. Perceivable

#### 1.1 Text Alternatives

**Requirements:**
- All images have `alt` text
- Decorative images use `alt=""`
- Icons paired with text or have `aria-label`
- Buttons with icons only have `aria-label`

**Implementation:**
```tsx
// Good
<button aria-label="Remove proof link">
  <TrashIcon />
</button>

// Bad
<button>
  <TrashIcon />
</button>
```

---

#### 1.2 Time-Based Media

**Requirements:**
- No auto-playing media for MVP
- If added in future: captions, transcripts required

---

#### 1.3 Adaptable

**Requirements:**
- Semantic HTML structure
- Proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`, no skips)
- Landmarks for page sections
- Forms use `<label>` elements
- Lists use `<ul>`, `<ol>`, `<li>`

**Component Hierarchy:**

```
QuietLinkPage
  <main role="main">
    <article>
      <header>
        <h1>Candidate Name</h1>
        <p>Headline</p>
        ...
      </header>

      <section aria-labelledby="proof-heading">
        <h2 id="proof-heading">Proof & Work</h2>
        ...
      </section>

      <section aria-labelledby="qa-heading">
        <h2 id="qa-heading">Questions</h2>
        ...
      </section>
    </article>
  </main>

  <footer>
    ...
  </footer>
```

---

#### 1.4 Distinguishable

**Color Contrast:**
- Text contrast ratio: 4.5:1 minimum for normal text
- Large text (18pt+): 3:1 minimum
- Interactive elements: 3:1 against background
- Focus indicators: 3:1 against background

**Color Independence:**
- Never use color alone to convey information
- Error states must have text + icon, not just red color
- Links underlined, not just different color

**Text Sizing:**
- Base font size: 16px minimum
- Scalable to 200% without loss of content or function
- Line height: 1.5 minimum for body text
- Paragraph spacing: 1.5x font size minimum

**Visual Presentation:**
- Max line length: 80 characters for body text
- Text not justified (left-aligned)
- No images of text (use real text)

---

### 2. Operable

#### 2.1 Keyboard Accessible

**Requirements:**
- All interactive elements keyboard accessible
- Logical tab order (follows visual order)
- No keyboard traps
- Skip to content link present
- Focus visible on all interactive elements

**Tab Order Example (Quiet Link):**

1. Skip to content
2. Primary actions (if enabled)
3. Proof links
4. Resume download (if enabled)
5. Q&A email input
6. Q&A question textarea
7. Q&A submit button
8. Booking slots (if enabled)
9. Footer links

**Keyboard Shortcuts:**
- `Tab`: Next focusable element
- `Shift+Tab`: Previous focusable element
- `Enter` or `Space`: Activate buttons/links
- `Esc`: Close modals

**Implementation:**
```tsx
// Good: Keyboard accessible
<button onClick={handleClick}>Submit</button>

// Bad: Not keyboard accessible
<div onClick={handleClick}>Submit</div>
```

---

#### 2.2 Enough Time

**Requirements:**
- Booking hold expiry: stated factually, no countdown emphasis
- Auth link expiry: clearly communicated (15 minutes)
- No time limits that cannot be extended/disabled
- No auto-refresh that disrupts user

**Booking Hold UX:**
- Hold time displayed as text: "This slot is held until 2:15 PM."
- No visual countdown timer
- User can extend hold by remaining on page (future)

---

#### 2.3 Seizures and Physical Reactions

**Requirements:**
- No flashing content
- No animations faster than 3 flashes per second
- Minimal, calm animations only

---

#### 2.4 Navigable

**Requirements:**
- `<title>` tag unique and descriptive for each page
- Landmark regions used correctly
- Focus order follows reading order
- Link text descriptive (no "click here")
- Multiple ways to find content (nav, search future)
- Headings describe topic

**Page Titles:**
```
[Candidate Name] — SilentApply
Profile — SilentApply
Resume — SilentApply
Continue to SilentApply
```

**Skip Links:**
```tsx
<a href="#main-content" className="skip-link">
  Skip to content
</a>

<main id="main-content">
  ...
</main>
```

**Landmarks:**
- `<header>` or `role="banner"`
- `<nav>` or `role="navigation"`
- `<main>` or `role="main"`
- `<footer>` or `role="contentinfo"`
- `<aside>` or `role="complementary"`
- `<section>` with `aria-labelledby`

---

### 3. Understandable

#### 3.1 Readable

**Requirements:**
- Language specified: `<html lang="en">`
- Clear, simple language (no jargon)
- No persuasive or confusing copy
- Abbreviations explained on first use (if any)

**Language Code:**
```html
<html lang="en">
```

---

#### 3.2 Predictable

**Requirements:**
- Consistent navigation across pages
- Consistent component behavior
- No automatic changes on focus
- Form submission requires explicit action
- Layout order never changes

**Consistency:**
- Buttons always labeled the same way ("Save changes", not "Save" / "Update")
- Navigation order stable across dashboard
- Section order fixed per canon

---

#### 3.3 Input Assistance

**Requirements:**
- Error messages specific and clear
- Labels and instructions provided
- Required fields indicated
- Error prevention (confirmation dialogs)
- Suggestions for fixing errors (if possible)

**Form Validation:**
```tsx
// Good
<div>
  <label htmlFor="email">
    Email address
    <span aria-label="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    required
    aria-invalid={error ? "true" : "false"}
    aria-describedby={error ? "email-error" : undefined}
  />
  {error && (
    <span id="email-error" role="alert">
      Email address is required.
    </span>
  )}
</div>

// Bad
<input placeholder="Email" />
```

**Error Announcements:**
```tsx
// Immediate announcement
<div role="alert">
  Email address is required.
</div>

// Polite announcement
<div role="status" aria-live="polite">
  Changes saved.
</div>
```

---

### 4. Robust

#### 4.1 Compatible

**Requirements:**
- Valid HTML5
- ARIA used correctly
- Compatibility with assistive tech
- Semantic HTML over ARIA (when possible)

**ARIA Principles:**
1. Use native HTML first
2. ARIA never changes behavior, only semantics
3. All interactive elements keyboard accessible
4. Do not override native semantics

**Examples:**
```tsx
// Good: Native HTML
<button onClick={handleClick}>Submit</button>

// Acceptable: ARIA when needed
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>
  Submit
</div>

// Bad: ARIA on native element incorrectly
<button role="link">Submit</button>
```

---

## Component-Specific Requirements

### Input Components

**Text Input:**
```tsx
<label htmlFor="name">
  Name
  {required && <span aria-label="required">*</span>}
</label>
<input
  id="name"
  type="text"
  required={required}
  aria-invalid={error ? "true" : "false"}
  aria-describedby={error ? "name-error" : helpText ? "name-help" : undefined}
  autoComplete="name"
/>
{helpText && <span id="name-help">{helpText}</span>}
{error && <span id="name-error" role="alert">{error}</span>}
```

**Textarea:**
```tsx
<label htmlFor="question">
  Question
  {required && <span aria-label="required">*</span>}
</label>
<textarea
  id="question"
  required={required}
  aria-invalid={error ? "true" : "false"}
  aria-describedby={error ? "question-error" : undefined}
  rows={4}
/>
{error && <span id="question-error" role="alert">{error}</span>}
```

---

### Button Components

**Primary Button:**
```tsx
<button
  type={type || "button"}
  disabled={disabled || loading}
  aria-label={ariaLabel}
  aria-busy={loading ? "true" : undefined}
>
  {loading && <span role="status" aria-live="polite">Loading</span>}
  {children}
</button>
```

**Icon-Only Button:**
```tsx
<button aria-label="Remove proof link" onClick={handleRemove}>
  <TrashIcon aria-hidden="true" />
</button>
```

---

### Toggle Components

**Checkbox Toggle:**
```tsx
<div>
  <input
    type="checkbox"
    id="enable-booking"
    checked={checked}
    onChange={handleChange}
    disabled={disabled}
  />
  <label htmlFor="enable-booking">
    Enable booking
  </label>
  {helpText && <span id="enable-booking-help">{helpText}</span>}
</div>
```

**Switch Toggle (Custom):**
```tsx
<button
  role="switch"
  aria-checked={checked}
  aria-label={label}
  aria-describedby={helpText ? "toggle-help" : undefined}
  onClick={handleToggle}
>
  <span aria-hidden="true">{checked ? "On" : "Off"}</span>
</button>
{helpText && <span id="toggle-help">{helpText}</span>}
```

---

### Modal Components

**Modal Dialog:**
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Booking</h2>
  <div id="modal-description">
    Monday, January 27, 2025
    2:00 PM – 3:00 PM EST
  </div>
  <button onClick={handleConfirm}>Confirm booking</button>
  <button onClick={handleCancel}>Cancel</button>
</div>
```

**Focus Management:**
- Focus moves to modal on open
- Focus trapped within modal
- Focus returns to trigger on close
- `Esc` key closes modal

---

### Loading States

**Spinner:**
```tsx
<div role="status" aria-live="polite" aria-label={label || "Loading"}>
  <SpinnerIcon aria-hidden="true" />
</div>
```

**Button Loading:**
```tsx
<button disabled aria-busy="true">
  <span role="status" aria-live="polite">Saving</span>
  <SpinnerIcon aria-hidden="true" />
</button>
```

---

### Link Components

**Internal Link:**
```tsx
<a href="/profile">Profile</a>
```

**External Link:**
```tsx
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Portfolio
  <span className="sr-only">(opens in new tab)</span>
</a>
```

---

## Screen Reader Testing

### Required Testing

Test with at least one screen reader:
- **Windows:** NVDA (free) or JAWS
- **macOS:** VoiceOver (built-in)
- **Linux:** Orca (free)
- **Mobile:** TalkBack (Android), VoiceOver (iOS)

### Key Flows to Test

1. **Public Quiet Link:**
   - Navigate through header
   - Read all sections
   - Submit question via Q&A
   - Book a slot

2. **Auth:**
   - Enter email at /continue
   - Navigate to check-email confirmation

3. **Candidate Dashboard:**
   - Navigate between tabs
   - Edit profile
   - Upload resume
   - Add proof link
   - Add time slot

---

## Keyboard Testing

### Required Keyboard Testing

1. **Tab through entire page**
   - All interactive elements focusable
   - Logical order
   - Focus visible

2. **Activate elements**
   - `Enter` and `Space` work on buttons
   - `Enter` submits forms

3. **Close modals**
   - `Esc` closes dialogs

4. **Navigate forms**
   - `Tab` moves between fields
   - No keyboard traps

---

## Color Contrast Testing

### Tools

- **Chrome DevTools:** Lighthouse audit
- **Online:** WebAIM Contrast Checker
- **Browser Extension:** WAVE

### Minimum Ratios (WCAG AA)

- Normal text (< 18pt): 4.5:1
- Large text (18pt+ or 14pt+ bold): 3:1
- UI components: 3:1
- Focus indicators: 3:1

**Color Palette Requirements:**
- Base text on white: 4.5:1 minimum
- Links on white: 4.5:1 minimum (and underlined)
- Buttons on background: 3:1 minimum
- Focus outline: 3:1 minimum against all backgrounds

---

## Focus Indicators

**Requirements:**
- Visible on all interactive elements
- 3:1 contrast against background
- Not removed via `outline: none` without replacement
- Consistent appearance across site

**Implementation:**
```css
/* Good: Visible focus indicator */
button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Bad: Focus removed */
button:focus {
  outline: none;
}
```

---

## Responsive Accessibility

### Mobile-Specific

- Touch targets: 44x44px minimum
- No hover-dependent content
- Same keyboard access via on-screen keyboards
- Pinch-to-zoom enabled
- No horizontal scrolling

**Touch Target Example:**
```css
button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;
}
```

---

## Testing Checklist

Before shipping any component:

- [ ] Keyboard accessible (all interactions)
- [ ] Focus visible on all interactive elements
- [ ] Semantic HTML used
- [ ] ARIA used correctly (if needed)
- [ ] Labels on all form inputs
- [ ] Error messages announced
- [ ] Color contrast meets WCAG AA
- [ ] Color not sole indicator
- [ ] Text scalable to 200%
- [ ] Screen reader tested (at least one)
- [ ] Touch targets 44x44px minimum (mobile)
- [ ] Valid HTML
- [ ] Lighthouse audit passes

---

## Automated Testing

### Tools to Use

1. **Lighthouse** (Chrome DevTools)
   - Accessibility score 90+ required

2. **axe DevTools** (Browser Extension)
   - Zero violations required

3. **WAVE** (Web Accessibility Evaluation Tool)
   - Zero errors required

4. **Jest with jest-axe** (Unit Tests)
   ```tsx
   import { axe } from 'jest-axe';

   test('Button has no accessibility violations', async () => {
     const { container } = render(<Button>Submit</Button>);
     const results = await axe(container);
     expect(results).toHaveNoViolations();
   });
   ```

---

## Manual Testing Protocol

### Every PR Should:

1. Run Lighthouse audit
2. Run axe DevTools scan
3. Tab through all new/changed UI
4. Test with screen reader (quick check)
5. Check color contrast for new colors
6. Verify focus indicators present

---

## Common Pitfalls to Avoid

### Don't Do This:

```tsx
// Using div as button
<div onClick={handleClick}>Click me</div>

// Placeholder as label
<input placeholder="Email" />

// Color-only error indicator
<input style={{ borderColor: error ? 'red' : 'gray' }} />

// Removing focus outline
button:focus { outline: none; }

// Images without alt
<img src="logo.png" />

// Icon-only button without label
<button><TrashIcon /></button>

// Breaking heading hierarchy
<h1>Page Title</h1>
<h3>Section Title</h3> {/* Skipped h2 */}
```

### Do This Instead:

```tsx
// Use semantic button
<button onClick={handleClick}>Click me</button>

// Label + input
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Error with text + color
<input aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Email is required.</span>

// Custom focus indicator
button:focus { outline: 2px solid #0066cc; }

// Image with alt
<img src="logo.png" alt="SilentApply" />

// Icon button with aria-label
<button aria-label="Remove item"><TrashIcon aria-hidden="true" /></button>

// Proper heading hierarchy
<h1>Page Title</h1>
<h2>Section Title</h2>
```

---

## Documentation Requirements

Every component must document:

1. **ARIA attributes used** (if any)
2. **Keyboard interactions** (if custom)
3. **Focus management** (if custom)
4. **Screen reader considerations**

**Example Component Doc:**

```tsx
/**
 * BookingSlotButton
 *
 * Accessibility:
 * - Uses native <button> element
 * - aria-label includes full date/time for screen readers
 * - Disabled state when slot unavailable
 * - Keyboard: Enter/Space to select
 * - Focus indicator visible
 */
```

---

## Definition of Done

- [x] WCAG 2.1 AA requirements documented
- [x] Keyboard navigation requirements specified
- [x] Screen reader considerations included
- [x] Color contrast requirements specified
- [x] Component-specific examples provided
- [x] Testing checklist included
- [x] Common pitfalls documented
- [x] All MVP components covered

---

**Status:** Phase 1 Complete — Ready for Implementation

**Next Step:** Use this document during component implementation to ensure accessibility is built in, not bolted on.
