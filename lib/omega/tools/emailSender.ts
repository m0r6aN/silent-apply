/**
 * Email Sender Tool (OMEGA)
 *
 * Sends transactional emails via ACS SMTP.
 * Canon: factual, minimal, calm tone.
 */

import nodemailer from 'nodemailer';
import { createCorrelationLogger } from '../correlation';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Send an email with correlation tracking
 */
export async function sendEmail(
  options: EmailOptions,
  correlationId: string
): Promise<EmailResult> {
  const log = createCorrelationLogger(correlationId);

  log.info('email.send_started', {
    to: options.to,
    subject: options.subject,
  });

  try {
    const transport = getTransporter();
    const result = await transport.sendMail({
      from: process.env.EMAIL_FROM,
      ...options,
    });

    log.info('email.send_completed', {
      messageId: result.messageId,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (err) {
    log.error('email.send_failed', err);

    const isNetworkError = err instanceof Error &&
      (err.message.includes('ECONNREFUSED') ||
       err.message.includes('ETIMEDOUT') ||
       err.message.includes('ENOTFOUND'));

    return {
      success: false,
      error: {
        code: 'EMAIL_SEND_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        retriable: isNetworkError,
      },
    };
  }
}

/**
 * Booking confirmation email templates (Canon-compliant)
 */
export function createRecruiterConfirmationEmail(params: {
  candidateName: string;
  slotStart: Date;
  slotEnd: Date;
  cancelUrl?: string;
}): { subject: string; text: string; html: string } {
  const { candidateName, slotStart, slotEnd, cancelUrl } = params;

  const dateStr = slotStart.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = `${slotStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${slotEnd.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  const subject = `Booking confirmed with ${candidateName}`;

  const text = `A conversation has been scheduled.

Candidate: ${candidateName}
Date: ${dateStr}
Time: ${timeStr}

${cancelUrl ? `To cancel or reschedule: ${cancelUrl}` : ''}

-- SilentApply`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #0b0b0c; color: #f4f4f5; padding: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 16px;">A conversation has been scheduled.</p>
      <div style="margin: 0 0 20px 0; padding: 16px; background: #1a1a1b; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #a1a1aa;">Candidate</p>
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">${candidateName}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #a1a1aa;">Date</p>
        <p style="margin: 0 0 16px 0; font-size: 16px;">${dateStr}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #a1a1aa;">Time</p>
        <p style="margin: 0; font-size: 16px;">${timeStr}</p>
      </div>
      ${cancelUrl ? `
        <p style="margin: 0 0 24px 0;">
          <a href="${cancelUrl}" style="color: #7dd3fc; text-decoration: none; font-size: 14px;">
            Cancel or reschedule
          </a>
        </p>
      ` : ''}
      <p style="margin: 0; font-size: 14px; color: #71717a;">-- SilentApply</p>
    </div>
  `;

  return { subject, text, html };
}

export function createCandidateNotificationEmail(params: {
  recruiterName?: string;
  slotStart: Date;
  slotEnd: Date;
}): { subject: string; text: string; html: string } {
  const { recruiterName, slotStart, slotEnd } = params;

  const dateStr = slotStart.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = `${slotStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${slotEnd.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  const subject = 'A conversation has been scheduled';

  const recruiterLine = recruiterName ? `With: ${recruiterName}` : '';

  const text = `A conversation has been scheduled.

${recruiterLine}
Date: ${dateStr}
Time: ${timeStr}

-- SilentApply`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #0b0b0c; color: #f4f4f5; padding: 24px;">
      <p style="margin: 0 0 16px 0; font-size: 16px;">A conversation has been scheduled.</p>
      <div style="margin: 0 0 20px 0; padding: 16px; background: #1a1a1b; border-radius: 8px;">
        ${recruiterName ? `
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #a1a1aa;">With</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">${recruiterName}</p>
        ` : ''}
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #a1a1aa;">Date</p>
        <p style="margin: 0 0 16px 0; font-size: 16px;">${dateStr}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #a1a1aa;">Time</p>
        <p style="margin: 0; font-size: 16px;">${timeStr}</p>
      </div>
      <p style="margin: 0; font-size: 14px; color: #71717a;">-- SilentApply</p>
    </div>
  `;

  return { subject, text, html };
}
