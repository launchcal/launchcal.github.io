import type { CalendarEvent } from './event.ts';

/** Fixed rather than the build time, so a feed only changes when a launch changes. */
const DTSTAMP = '20261001T000000Z';

/** Renders an RFC 5545 calendar: CRLF line endings, escaped text, lines folded at 75 octets. */
export function toIcs(name: string, description: string, events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//launchcal//launchcal.github.io//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-CALDESC:${escapeText(description)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT2H',
    'X-PUBLISHED-TTL:PT2H',
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@launchcal.github.io`,
      `DTSTAMP:${DTSTAMP}`,
      event.timed ? `DTSTART:${basicDateTime(event.start)}` : `DTSTART;VALUE=DATE:${basicDate(event.start)}`,
      event.timed ? `DTEND:${basicDateTime(event.end)}` : `DTEND;VALUE=DATE:${basicDate(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
    );
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push(`STATUS:${event.confirmed ? 'CONFIRMED' : 'TENTATIVE'}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Splits a content line into 75-octet chunks without breaking a UTF-8 character; continuations start with a space. */
export function fold(line: string): string {
  const chunks: string[] = [];
  let chunk = '';
  let octets = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    const limit = chunks.length === 0 ? 75 : 74;
    if (octets + size > limit) {
      chunks.push(chunk);
      chunk = '';
      octets = 0;
    }
    chunk += char;
    octets += size;
  }
  chunks.push(chunk);
  return chunks.join('\r\n ');
}

function basicDateTime(iso: string): string {
  return iso.replace(/[-:]/g, '');
}

function basicDate(date: string): string {
  return date.replace(/-/g, '');
}
