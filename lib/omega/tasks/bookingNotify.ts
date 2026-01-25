/**
 * Booking Notify Task (OMEGA Agent)
 *
 * Sends booking confirmation emails to recruiters and optionally
 * notifies candidates when a booking is confirmed.
 *
 * CANON ENFORCEMENT (BOOKING_CANON_v1):
 * - Tone: Factual, minimal, calm
 * - No urgency language
 * - No marketing content
 * - Candidate notification only if opt-in enabled
 */

import { prisma } from '@/lib/prisma';
import { createCorrelationLogger } from '../correlation';
import {
  sendEmail,
  createRecruiterConfirmationEmail,
  createCandidateNotificationEmail,
} from '../tools/emailSender';

export interface BookingNotifyInput {
  correlationId: string;
  bookingId: string;
  profileId: string;
  recruiterEmail: string;
  recruiterName?: string;
  slotStart: string; // ISO 8601
  slotEnd: string; // ISO 8601
  notifyCandidate: boolean;
}

export interface BookingNotifyOutput {
  correlationId: string;
  bookingId: string;
  status: 'success' | 'partial' | 'failure';
  recruiterNotified: boolean;
  candidateNotified?: boolean;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

/**
 * Execute the booking notification task
 */
export async function executeBookingNotify(input: BookingNotifyInput): Promise<BookingNotifyOutput> {
  const {
    correlationId,
    bookingId,
    profileId,
    recruiterEmail,
    recruiterName,
    slotStart,
    slotEnd,
    notifyCandidate,
  } = input;

  const log = createCorrelationLogger(correlationId);

  log.info('task.booking_notify.started', {
    bookingId,
    profileId,
    notifyCandidate,
  });

  // Load profile for candidate info
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  if (!profile) {
    log.error('task.booking_notify.profile_not_found', null, { profileId });
    return {
      correlationId,
      bookingId,
      status: 'failure',
      recruiterNotified: false,
      error: {
        code: 'PROFILE_NOT_FOUND',
        message: 'Profile does not exist',
        retriable: false,
      },
    };
  }

  const slotStartDate = new Date(slotStart);
  const slotEndDate = new Date(slotEnd);

  // Step 1: Send recruiter confirmation email
  log.info('task.booking_notify.step', { step: 'send_recruiter_email' });

  const recruiterEmailContent = createRecruiterConfirmationEmail({
    candidateName: profile.headline || 'Candidate',
    slotStart: slotStartDate,
    slotEnd: slotEndDate,
    // TODO: Generate cancel URL
  });

  const recruiterResult = await sendEmail(
    {
      to: recruiterEmail,
      ...recruiterEmailContent,
    },
    correlationId
  );

  if (!recruiterResult.success) {
    log.error('task.booking_notify.recruiter_email_failed', recruiterResult.error, {
      bookingId,
    });
    return {
      correlationId,
      bookingId,
      status: 'failure',
      recruiterNotified: false,
      error: recruiterResult.error,
    };
  }

  log.info('task.booking_notify.recruiter_email_sent', {
    bookingId,
    messageId: recruiterResult.messageId,
  });

  // Step 2: Optionally send candidate notification
  let candidateNotified = false;

  if (notifyCandidate && profile.user?.email) {
    log.info('task.booking_notify.step', { step: 'send_candidate_email' });

    const candidateEmailContent = createCandidateNotificationEmail({
      recruiterName,
      slotStart: slotStartDate,
      slotEnd: slotEndDate,
    });

    const candidateResult = await sendEmail(
      {
        to: profile.user.email,
        ...candidateEmailContent,
      },
      correlationId
    );

    if (candidateResult.success) {
      candidateNotified = true;
      log.info('task.booking_notify.candidate_email_sent', {
        bookingId,
        messageId: candidateResult.messageId,
      });
    } else {
      // Partial success - recruiter notified but candidate notification failed
      log.warn('task.booking_notify.candidate_email_failed', {
        bookingId,
        error: candidateResult.error,
      });

      return {
        correlationId,
        bookingId,
        status: 'partial',
        recruiterNotified: true,
        candidateNotified: false,
      };
    }
  }

  // Complete
  log.info('task.booking_notify.completed', {
    bookingId,
    recruiterNotified: true,
    candidateNotified,
  });

  return {
    correlationId,
    bookingId,
    status: 'success',
    recruiterNotified: true,
    candidateNotified,
  };
}
