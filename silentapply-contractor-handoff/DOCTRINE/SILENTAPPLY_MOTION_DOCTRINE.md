# SilentApply Motion and Interaction Doctrine (v1)

Status: Canonical
Scope: All motion, animation, and interaction behavior

## Core Principle

Motion in SilentApply AI must communicate life without urgency.

Motion exists to confirm presence -- never to demand attention.

## Motion Hierarchy

1. Presence (Primary)
   - Represented by the Dot
   - Slow, calm, continuous
2. Activity (Secondary)
   - Signals, soft transitions
   - Must never dominate presence
3. Feedback (Tertiary)
   - Subtle state confirmation only

If motion draws attention to itself, it is incorrect.

## Pulse Timing (Dot)

Primary Pulse

- Interval: 3.6s
- Duration: 1.2s
- Opacity change: subtle (<= 8%)
- Scale change: none or <= 2%

Rule:
The pulse should feel like a heartbeat at rest -- not excitement, not progress.

- No rhythmic acceleration
- No sync with user actions

## Easing Curves (Global)

Allowed easing

- cubic-bezier(0.4, 0.0, 0.2, 1) (standard ease-in-out)
- Linear for fades

Forbidden

- Bounce
- Elastic
- Overshoot
- Sharp ease-in or snap effects

Motion must arrive -- not land.

## Waiting vs Loading Semantics (Critical)

### Waiting (Preferred)

Used when:

- The system is already working
- The user does not need to act

Visuals

- Dot pulse only
- No progress bars
- No percentages
- No spinners

Message implied:

"This is handled."

### Loading (Rare, Explicit)

Used only when:

- A resource must be fetched
- A dependency is unresolved

Visuals

- Static Dot (no pulse)
- Optional faint signal line
- No numeric progress

Message implied:

"One moment."

- Never imply effort
- Never imply delay anxiety

## Forbidden Motion Patterns

- Spinners
- Progress bars
- Step counters
- Success animations
- Checkmark bounces
- Fast hover effects
- Scroll-jacking
- Parallax exaggeration

If motion suggests urgency or reward, it violates doctrine.
