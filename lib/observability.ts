import { prisma } from '@/lib/prisma';
import { createCorrelationLogger } from '@/lib/correlation';

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

export async function logEvent(
  eventType: string,
  profileId: string | null,
  metadata: EventMetadata
): Promise<void> {
  if (!isAllowedEvent(eventType)) return;

  const log = createCorrelationLogger(metadata.correlationId);
  try {
    await prisma.analyticsEvent.create({
      data: {
        profileId,
        eventType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadataJson: JSON.parse(JSON.stringify(metadata)) as any,
      },
    });
    log.info(`event.${eventType}`, { profileId });
  } catch (err) {
    log.error(`event.${eventType}_failed`, err, { profileId });
  }
}

export async function logProfileViewed(profileId: string, correlationId: string): Promise<void> {
  await logEvent('profile.viewed', profileId, { correlationId });
}

export async function logResumeDownloaded(profileId: string, correlationId: string, meta?: Record<string, unknown>): Promise<void> {
  await logEvent('resume.downloaded', profileId, { correlationId, ...meta });
}

export async function logQAQuestionSubmitted(profileId: string, correlationId: string, meta?: Record<string, unknown>): Promise<void> {
  await logEvent('qa.question_submitted', profileId, { correlationId, ...meta });
}
