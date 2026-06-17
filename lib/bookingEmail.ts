/**
 * Composes and sends booking confirmation emails to both parties.
 *
 * CANON: copy stays calm. No urgency, no "your opportunity awaits" language.
 * Sends are best-effort — a failure here never blocks a confirmed booking.
 */

import { sendEmail, type EmailAttachment } from "@/lib/email";
import { buildIcs } from "@/lib/ics";

export interface BookingConfirmationInput {
  bookingId: string;
  recruiterEmail: string;
  recruiterName: string | null;
  candidateEmail: string | null;
  candidateHandle: string;
  start: Date;
  end: Date;
}

function formatWhen(start: Date, end: Date): string {
  const date = start.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
  return `${date}, ${start.toLocaleTimeString("en-US", opts)}–${end.toLocaleTimeString("en-US", opts)} UTC`;
}

export async function sendBookingConfirmationEmails(input: BookingConfirmationInput): Promise<void> {
  const when = formatWhen(input.start, input.end);

  const ics = buildIcs({
    uid: `${input.bookingId}@silentapply`,
    start: input.start,
    end: input.end,
    summary: "SilentApply conversation",
    description: `Scheduled conversation with /${input.candidateHandle}.`,
    organizerEmail: input.candidateEmail ?? undefined,
    attendeeEmail: input.recruiterEmail,
  });

  const attachments: EmailAttachment[] = [
    { name: "invite.ics", contentType: "text/calendar; method=REQUEST", content: ics },
  ];

  // Recruiter confirmation.
  await sendEmail({
    to: input.recruiterEmail,
    subject: "Your conversation is scheduled",
    text: `Hi${input.recruiterName ? ` ${input.recruiterName}` : ""},

Your conversation is scheduled for ${when}.

A calendar invitation is attached.

-- SilentApply`,
    attachments,
  });

  // Candidate notification.
  if (input.candidateEmail) {
    await sendEmail({
      to: input.candidateEmail,
      subject: "A conversation was booked",
      text: `Hi,

A recruiter booked a conversation on your SilentApply link.

When: ${when}
Who: ${input.recruiterName ? `${input.recruiterName} ` : ""}<${input.recruiterEmail}>

A calendar invitation is attached.

-- SilentApply`,
      attachments,
    });
  }
}
