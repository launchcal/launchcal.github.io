import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CalendarEvent } from '../src/event.ts';
import { escapeText, fold, toIcs } from '../src/ics.ts';

describe('escapeText', () => {
  it('escapes backslashes, semicolons, commas and newlines', () => {
    assert.equal(escapeText('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne');
  });

  it('turns a CRLF from upstream text into a single escaped newline', () => {
    assert.equal(escapeText('one\r\ntwo'), 'one\\ntwo');
  });
});

describe('fold', () => {
  it('leaves a line of 75 octets alone', () => {
    assert.equal(fold('x'.repeat(75)), 'x'.repeat(75));
  });

  it('folds ASCII at 75 octets and continues with a space', () => {
    assert.equal(fold('x'.repeat(160)), `${'x'.repeat(75)}\r\n ${'x'.repeat(74)}\r\n ${'x'.repeat(11)}`);
  });

  it('never splits a multi-byte character', () => {
    const folded = fold(`X:${'🚀'.repeat(30)}`);

    assert.equal(folded, `X:${'🚀'.repeat(18)}\r\n ${'🚀'.repeat(12)}`);
  });
});

describe('toIcs', () => {
  const timed: CalendarEvent = {
    id: 'abc',
    title: '🚀 Falcon 9 · Crew-13',
    description: 'Status: Go\nOrbit: LEO',
    location: 'Space Launch Complex 40, Cape Canaveral SFS, FL, USA',
    url: 'https://www.youtube.com/watch?v=7ZiUbT1-djA',
    timed: true,
    start: '2026-10-01T15:10:06Z',
    end: '2026-10-01T16:10:06Z',
    confirmed: true,
  };
  const allDay: CalendarEvent = {
    id: 'def',
    title: '🚀 Falcon 9 · NG-22 (TBD)',
    description: 'Status: TBD',
    location: 'Cape Canaveral SFS, FL, USA',
    url: null,
    timed: false,
    start: '2026-10-14',
    end: '2026-10-15',
    confirmed: false,
  };

  it('renders a complete calendar with timed and all-day events', () => {
    const ics = toIcs('SpaceX launches', 'Unofficial, test.', [timed, allDay]);

    assert.equal(
      ics,
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//launchcal//launchcal.github.io//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:SpaceX launches',
        'X-WR-CALDESC:Unofficial\\, test.',
        'REFRESH-INTERVAL;VALUE=DURATION:PT2H',
        'X-PUBLISHED-TTL:PT2H',
        'BEGIN:VEVENT',
        'UID:abc@launchcal.github.io',
        'DTSTAMP:20261001T000000Z',
        'DTSTART:20261001T151006Z',
        'DTEND:20261001T161006Z',
        'SUMMARY:🚀 Falcon 9 · Crew-13',
        'LOCATION:Space Launch Complex 40\\, Cape Canaveral SFS\\, FL\\, USA',
        'DESCRIPTION:Status: Go\\nOrbit: LEO',
        'URL:https://www.youtube.com/watch?v=7ZiUbT1-djA',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:def@launchcal.github.io',
        'DTSTAMP:20261001T000000Z',
        'DTSTART;VALUE=DATE:20261014',
        'DTEND;VALUE=DATE:20261015',
        'SUMMARY:🚀 Falcon 9 · NG-22 (TBD)',
        'LOCATION:Cape Canaveral SFS\\, FL\\, USA',
        'DESCRIPTION:Status: TBD',
        'STATUS:TENTATIVE',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n'),
    );
  });

  it('folds long description lines', () => {
    const ics = toIcs('n', 'd', [{ ...timed, description: 'y'.repeat(200) }]);

    assert.ok(ics.includes(`\r\nDESCRIPTION:${'y'.repeat(63)}\r\n ${'y'.repeat(74)}\r\n ${'y'.repeat(63)}\r\n`));
  });
});
