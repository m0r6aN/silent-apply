# UI Component Inventory — SilentApply MVP

**Team Alpha Phase 1 Deliverable**

This document inventories every UI component required for the SilentApply MVP. Components are specified with TypeScript interfaces and canon compliance notes.

---

## Core Principles

- Components render data, not persuasion
- No persuasive language or urgency patterns
- Accessibility first (WCAG 2.1 AA)
- Mobile-first responsive design
- Semantic HTML with proper ARIA attributes

---

## 1. Public Quiet Link Components

### 1.1 QuietLinkPage

**Purpose:** Root layout for public profile at /[handle]

**Props Interface:**
```typescript
interface QuietLinkPageProps {
  profile: {
    name: string;
    headline: string;
    roles: string[];
    location: string;
    workMode: string; // "remote" | "hybrid" | "onsite"
    published: boolean;
  };
  proof?: ProofSection[];
  resumeEnabled: boolean;
  qaEnabled: boolean;
  bookingEnabled: boolean;
}
```

**Canon Compliance:**
- Returns 404 if `published === false`
- Renders sections in sealed order (above/below fold)
- No monetization indicators
- Suppresses empty sections silently

---

### 1.2 ProfileHeader

**Purpose:** Above-the-fold identity block

**Props Interface:**
```typescript
interface ProfileHeaderProps {
  name: string;
  headline: string;
  roles: string[];
  location: string;
  workMode: string;
}
```

**Canon Compliance:**
- Name is plain text, no badges/icons/emojis
- Headline is declarative, single sentence
- Roles listed without hierarchy
- Location factual, no urgency

**Accessibility:**
- `<h1>` for name
- `aria-label` on work mode icons if used

---

### 1.3 PrimaryActions

**Purpose:** Optional action affordances (below header)

**Props Interface:**
```typescript
interface PrimaryActionsProps {
  actions: {
    askQuestion?: boolean;
    bookConversation?: boolean;
    downloadResume?: boolean;
  };
  onActionClick: (action: 'question' | 'book' | 'resume') => void;
}
```

**Canon Compliance:**
- Secondary visual weight (not CTAs)
- Only renders enabled actions
- No color dominance or urgency styling
- No "or" dividers between buttons

**Accessibility:**
- `<button>` elements with clear labels
- Keyboard navigable
- Focus indicators

---

### 1.4 ProofSection

**Purpose:** Below-fold proof/portfolio display

**Props Interface:**
```typescript
interface ProofSectionProps {
  items: Array<{
    id: string;
    label: string;
    url: string;
    type: 'portfolio' | 'case_study' | 'proof';
  }>;
}
```

**Canon Compliance:**
- Neutral labels, no superlatives
- No thumbnails screaming for clicks
- No engagement metrics
- Links are underlined, accessible

**Accessibility:**
- Semantic `<a>` tags with descriptive text
- External link indicators for screen readers

---

### 1.5 ResumeDownload

**Purpose:** Resume download affordance

**Props Interface:**
```typescript
interface ResumeDownloadProps {
  enabled: boolean;
  resumeUrl: string;
  fileName: string;
  onDownload: () => void;
}
```

**Canon Compliance:**
- Single button, no preview required for MVP
- No explanation text
- Suppressed entirely if `enabled === false`

**Accessibility:**
- Button labeled "Download resume"
- `aria-describedby` for file format/size if needed

---

### 1.6 RecruiterQASection

**Purpose:** Q&A input and display (recruiter-facing)

**Props Interface:**
```typescript
interface RecruiterQASectionProps {
  enabled: boolean;
  previousQuestions?: Array<{
    id: string;
    question: string;
    answer: string;
    timestamp: Date;
  }>;
  onSubmitQuestion: (question: string, email: string) => Promise<void>;
}
```

**Canon Compliance:**
- Each question stands alone, no threading UI
- No "assistant typing…" indicators
- Bounded refusal messages for out-of-scope questions
- No conversational framing

**Accessibility:**
- `<form>` with proper labels
- Error messages associated with inputs
- Submit button clearly labeled

---

### 1.7 RecruiterQAInput

**Purpose:** Question submission form

**Props Interface:**
```typescript
interface RecruiterQAInputProps {
  onSubmit: (question: string, email: string) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}
```

**Canon Compliance:**
- Requires email, no account creation
- Error messages are bounded (no apologies)
- No placeholder persuasion

**Copy:**
- Button: "Submit question"
- Email label: "Your email"
- Question label: "Question"

**Accessibility:**
- Required field indicators
- Error announcements via `aria-live`

---

### 1.8 BookingSlotList

**Purpose:** Display available booking slots (recruiter view)

**Props Interface:**
```typescript
interface BookingSlotListProps {
  slots: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    available: boolean;
    onHold: boolean;
  }>;
  onSelectSlot: (slotId: string) => void;
}
```

**Canon Compliance:**
- Calm list, no calendar dominance
- No heatmaps or "next available" emphasis
- No urgency language or countdown timers
- Time is offered, not sold

**Accessibility:**
- `<button>` for each slot
- `aria-label` includes full date/time
- Disabled state for unavailable slots

---

### 1.9 BookingConfirmation

**Purpose:** Slot hold and confirmation flow

**Props Interface:**
```typescript
interface BookingConfirmationProps {
  slot: {
    startTime: Date;
    endTime: Date;
  };
  holdExpiresAt: Date;
  onConfirm: (email: string, message?: string) => Promise<void>;
  onCancel: () => void;
}
```

**Canon Compliance:**
- No countdown visual emphasis (just text)
- Requires email for confirmation
- Optional message field
- Cancel is equally visible as confirm

**Copy:**
- Button: "Confirm booking"
- Cancel: "Cancel"
- Hold message: "This slot is held until [time]"

**Accessibility:**
- Form validation messages
- Clear focus management through flow

---

## 2. Auth Components

### 2.1 ContinuePage

**Purpose:** Email entry page at /continue

**Props Interface:**
```typescript
interface ContinuePageProps {
  onSubmitEmail: (email: string) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}
```

**Canon Compliance:**
- Passwordless only
- No marketing language
- No persuasive copy

**Copy:**
- Heading: "Continue to SilentApply"
- Email label: "Email address"
- Button: "Continue"

**Accessibility:**
- Email input with proper type and autocomplete
- Error messages linked to input

---

### 2.2 CheckEmailPage

**Purpose:** Confirmation page at /continue/check-email

**Props Interface:**
```typescript
interface CheckEmailPageProps {
  email: string;
}
```

**Canon Compliance:**
- No countdown or urgency
- States facts only

**Copy:**
- Heading: "Check your email"
- Body: "A sign-in link has been sent to [email]. It expires in 15 minutes."

**Accessibility:**
- `<main>` landmark
- Focus on heading on mount

---

## 3. Candidate Dashboard Components

### 3.1 DashboardLayout

**Purpose:** Root layout for authenticated candidate views

**Props Interface:**
```typescript
interface DashboardLayoutProps {
  user: {
    email: string;
    handle: string;
  };
  children: React.ReactNode;
}
```

**Canon Compliance:**
- No monetization in navigation
- No urgency prompts
- Minimal nav structure

**Accessibility:**
- Skip to content link
- Semantic navigation landmarks

---

### 3.2 ProfileEditor

**Purpose:** Edit profile fields

**Props Interface:**
```typescript
interface ProfileEditorProps {
  profile: {
    name: string;
    headline: string;
    roles: string[];
    location: string;
    workMode: string;
    published: boolean;
  };
  onSave: (updates: Partial<ProfileEditorProps['profile']>) => Promise<void>;
  isSaving: boolean;
}
```

**Canon Compliance:**
- All fields optional
- Published toggle clear and bounded
- No "optimize your profile" prompts

**Copy:**
- Button: "Save changes"
- Published toggle: "Profile visible to recruiters"

**Accessibility:**
- Form labels and fieldsets
- Save confirmation announcement

---

### 3.3 ResumeUpload

**Purpose:** Upload and manage resume

**Props Interface:**
```typescript
interface ResumeUploadProps {
  currentResume?: {
    fileName: string;
    uploadedAt: Date;
    downloadEnabled: boolean;
  };
  onUpload: (file: File) => Promise<void>;
  onToggleDownload: (enabled: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  isUploading: boolean;
}
```

**Canon Compliance:**
- Download disabled by default
- Delete requires confirmation
- No preview required for MVP

**Copy:**
- Upload button: "Upload resume"
- Toggle: "Allow resume download"
- Delete: "Remove resume"

**Accessibility:**
- File input with accept attribute
- Status announcements for upload progress
- Delete confirmation dialog

---

### 3.4 ProofManager

**Purpose:** Add/edit/remove proof links

**Props Interface:**
```typescript
interface ProofManagerProps {
  items: Array<{
    id: string;
    label: string;
    url: string;
    type: string;
  }>;
  onAdd: (item: Omit<ProofManagerProps['items'][0], 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<ProofManagerProps['items'][0]>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}
```

**Canon Compliance:**
- Simple list, no ordering emphasis
- No portfolio theater

**Copy:**
- Add button: "Add proof link"
- Fields: "Label", "URL", "Type"

**Accessibility:**
- Form validation
- Delete confirmation

---

### 3.5 AvailabilityEditor

**Purpose:** Manage booking slots

**Props Interface:**
```typescript
interface AvailabilityEditorProps {
  slots: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    available: boolean;
  }>;
  onAddSlot: (start: Date, end: Date) => Promise<void>;
  onRemoveSlot: (id: string) => Promise<void>;
  bookingEnabled: boolean;
  onToggleBooking: (enabled: boolean) => Promise<void>;
}
```

**Canon Compliance:**
- No calendar heatmaps for MVP
- Simple list view
- Toggle clear and bounded

**Copy:**
- Add button: "Add time slot"
- Toggle: "Enable booking"

**Accessibility:**
- Date/time inputs with proper formats
- Slot list with remove buttons

---

## 4. Shared / Utility Components

### 4.1 Button

**Purpose:** Reusable button component

**Props Interface:**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}
```

**Canon Compliance:**
- No conversion colors (green/orange/red)
- Secondary visual weight for most actions
- Loading state shows spinner, no persuasive text

**Accessibility:**
- Disabled state clear to screen readers
- Loading state announced

---

### 4.2 Input

**Purpose:** Text input wrapper

**Props Interface:**
```typescript
interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url';
  required?: boolean;
  error?: string;
  helpText?: string;
  autoComplete?: string;
}
```

**Canon Compliance:**
- No placeholder persuasion
- Error messages bounded and factual

**Accessibility:**
- Label associated with input
- Error linked via aria-describedby
- Required indicator

---

### 4.3 Textarea

**Purpose:** Multi-line text input

**Props Interface:**
```typescript
interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  helpText?: string;
  rows?: number;
}
```

**Canon Compliance:**
- Same as Input
- No character count urgency

**Accessibility:**
- Same as Input

---

### 4.4 Toggle

**Purpose:** Boolean switch

**Props Interface:**
```typescript
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  helpText?: string;
}
```

**Canon Compliance:**
- Clear on/off states
- No persuasive labels

**Accessibility:**
- ARIA switch role
- Keyboard toggle (Space)
- State announced to screen readers

---

### 4.5 ErrorMessage

**Purpose:** Bounded error display

**Props Interface:**
```typescript
interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}
```

**Canon Compliance:**
- No apologies
- No exclamation marks
- Factual statements only

**Copy Examples:**
- "Email address is required."
- "That slot is no longer available."
- "The link has expired."

**Accessibility:**
- `role="alert"` for immediate announcements
- Dismissible with keyboard

---

### 4.6 LoadingSpinner

**Purpose:** Visual loading indicator

**Props Interface:**
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
}
```

**Canon Compliance:**
- Minimal, calm animation
- No persuasive copy

**Accessibility:**
- `aria-label` describes what is loading
- `role="status"`

---

### 4.7 EmptyState

**Purpose:** No-content display

**Props Interface:**
```typescript
interface EmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Canon Compliance:**
- Factual message only
- Optional action, no urgency

**Copy Examples:**
- "No proof links added yet."
- "No time slots available."

**Accessibility:**
- Clear hierarchy
- Action button keyboard accessible

---

## 5. Layout Components

### 5.1 PageLayout

**Purpose:** Consistent page wrapper

**Props Interface:**
```typescript
interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'narrow' | 'standard' | 'wide';
  footer?: boolean;
}
```

**Canon Compliance:**
- Vertical single-column flow
- Calm spacing
- Footer minimal (Privacy, Terms only)

**Accessibility:**
- Semantic landmarks
- Skip to content link

---

### 5.2 Section

**Purpose:** Content section wrapper

**Props Interface:**
```typescript
interface SectionProps {
  title?: string;
  children: React.ReactNode;
  spacing?: 'tight' | 'standard' | 'relaxed';
}
```

**Canon Compliance:**
- White space intentional
- No competing visual weight

**Accessibility:**
- `<section>` with optional `aria-labelledby`

---

## 6. Component Summary

**Total Components:** 23

**Breakdown:**
- Public Quiet Link: 9 components
- Auth: 2 components
- Candidate Dashboard: 5 components
- Shared/Utility: 7 components

**Not Included (Future Scope):**
- Resume preview/variants
- Advanced calendar UI
- Candidate analytics
- Payment/monetization UI

---

## Definition of Done

- [x] All MVP components listed
- [x] TypeScript interfaces specified
- [x] Canon compliance notes for each
- [x] Copy examples where relevant
- [x] Accessibility notes included
- [x] No business logic in specs
- [x] No forbidden language used

---

**Status:** Phase 1 Complete — Ready for Implementation
