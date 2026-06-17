/**
 * Minimal RFC 5545 iCalendar (.ics) generation for booking confirmations.
 * Kept dependency-free and UTC-only to match the booking API.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  organizerEmail?: string;
  attendeeEmail?: string;
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SilentApply//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.start)}`,
    `DTEND:${toIcsDate(event.end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.organizerEmail) lines.push(`ORGANIZER:mailto:${event.organizerEmail}`);
  if (event.attendeeEmail) lines.push(`ATTENDEE:mailto:${event.attendeeEmail}`);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
