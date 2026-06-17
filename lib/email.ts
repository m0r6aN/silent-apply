/**
 * Email delivery via Azure Communication Services (resource: ecs-silentapply).
 *
 * Used for two flows:
 *  - NextAuth magic-link sign-in (app/api/auth/[...nextauth]/route.ts)
 *  - Booking confirmation notifications (app/api/booking/route.ts)
 *
 * Configuration (set in the deployment environment):
 *  - ACS_EMAIL_CONNECTION_STRING  Connection string for the ecs-silentapply resource
 *  - EMAIL_FROM                   Verified sender address (e.g. DoNotReply@<domain>)
 *
 * Fails quietly: if email is not configured or a send fails, the caller is told
 * (returns false) but no exception is thrown — auth and booking must stay calm.
 */

import { EmailClient } from "@azure/communication-email";

export interface EmailAttachment {
  name: string;
  contentType: string;
  /** Raw bytes; encoded to base64 before sending. */
  content: Buffer | string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

let client: EmailClient | null = null;

function getClient(): EmailClient | null {
  if (client) return client;
  const connectionString = process.env.ACS_EMAIL_CONNECTION_STRING;
  if (!connectionString) return null;
  client = new EmailClient(connectionString);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.ACS_EMAIL_CONNECTION_STRING && process.env.EMAIL_FROM);
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const acs = getClient();
  const from = process.env.EMAIL_FROM;

  if (!acs || !from) {
    console.error("[email] not configured (ACS_EMAIL_CONNECTION_STRING / EMAIL_FROM missing) — skipping send", {
      to: input.to,
      subject: input.subject,
    });
    return false;
  }

  try {
    const poller = await acs.beginSend({
      senderAddress: from,
      content: {
        subject: input.subject,
        plainText: input.text,
        ...(input.html ? { html: input.html } : {}),
      },
      recipients: { to: [{ address: input.to }] },
      ...(input.attachments && input.attachments.length > 0
        ? {
            attachments: input.attachments.map((a) => ({
              name: a.name,
              contentType: a.contentType,
              contentInBase64: Buffer.isBuffer(a.content)
                ? a.content.toString("base64")
                : Buffer.from(a.content).toString("base64"),
            })),
          }
        : {}),
    });

    const result = await poller.pollUntilDone();
    return result.status === "Succeeded";
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}
