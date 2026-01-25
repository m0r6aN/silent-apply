/**
 * SilentApply Observability (Canon-Compliant)
 *
 * ALLOWED EVENTS ONLY (per CANON.md):
 * - profile.viewed
 * - resume.downloaded
 * - qa.question_submitted
 * - booking.hold_created
 * - booking.confirmed
 *
 * FORBIDDEN:
 * - Session replay
 * - Cross-profile recruiter tracking
 * - Conversion metrics
 * - Recruiter scoring
 * - Behavioral analysis
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createCorrelationLogger } from './correlation';

// Allowed event types (SEALED)
export const ALLOWED_EVENTS = [
  'profile.viewed',
  'resume.downloaded',
  'qa.question_submitted',
  'booking.hold_created',
  'booking.confirmed',
] as const;

export type AllowedEventType = typeof ALLOWED_EVENTS[number];

export function isAllowedEvent(eventType: string): eventType is AllowedEventType {
  return ALLOWED_EVENTS.includes(eventType as AllowedEventType);
}

interface EventMetadata {
  correlationId: string;
  [key: string]: unknown;
}

/**
 * Log an allowed analytics event
 *
 * Only events in ALLOWED_EVENTS are logged.
 * All others are silently ignored (no errors, no traces).
 */
export async function logEvent(
  eventType: string,
  profileId: string | null,
  metadata: EventMetadata
): Promise<void> {
  // Silently ignore non-allowed events
  if (!isAllowedEvent(eventType)) {
    return;
  }

  const log = createCorrelationLogger(metadata.correlationId);

  try {
    await prisma.analyticsEvent.create({
      data: {
        profileId,
        eventType,
        metadataJson: metadata as Prisma.InputJsonValue,
      },
    });

    log.info(`event.${eventType}`, {
      profileId,
      ...metadata,
    });
  } catch (err) {
    // Log error but don't throw - observability should not break flows
    log.error(`event.${eventType}_failed`, err, { profileId });
  }
}

/**
 * Log profile viewed event
 */
export async function logProfileViewed(
  profileId: string,
  correlationId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logEvent('profile.viewed', profileId, {
    correlationId,
    ...metadata,
  });
}

/**
 * Log resume downloaded event
 */
export async function logResumeDownloaded(
  profileId: string,
  correlationId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logEvent('resume.downloaded', profileId, {
    correlationId,
    ...metadata,
  });
}

/**
 * Log Q&A question submitted event
 */
export async function logQAQuestionSubmitted(
  profileId: string,
  correlationId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logEvent('qa.question_submitted', profileId, {
    correlationId,
    ...metadata,
  });
}

/**
 * Log booking hold created event
 */
export async function logBookingHoldCreated(
  profileId: string,
  correlationId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logEvent('booking.hold_created', profileId, {
    correlationId,
    ...metadata,
  });
}

/**
 * Log booking confirmed event
 */
export async function logBookingConfirmed(
  profileId: string,
  correlationId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logEvent('booking.confirmed', profileId, {
    correlationId,
    ...metadata,
  });
}
