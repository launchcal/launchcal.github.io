import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CalendarDef } from '../src/calendars.ts';
import type { CalendarEvent } from '../src/event.ts';
import { googleAddUrl, nextLaunches, renderPage } from '../src/page.ts';

const calendar: CalendarDef = {
  id: 'crewed',
  name: 'SpaceX crewed launches',
  blurb: 'Flights with people aboard.',
  googleId: 'cbc8fd4367b790cf6e18fbf78abb919112e54936254d3b3b6bdfdda45ea3786d@group.calendar.google.com',
  includes: () => true,
};

function event(title: string, start: string, end: string): CalendarEvent {
  return { id: title, title, description: 'd', location: 'Pad', url: null, timed: true, start, end, confirmed: true };
}

describe('googleAddUrl', () => {
  it('base64-encodes the calendar id without padding', () => {
    assert.equal(
      googleAddUrl('cbc8fd4367b790cf6e18fbf78abb919112e54936254d3b3b6bdfdda45ea3786d@group.calendar.google.com'),
      'https://calendar.google.com/calendar/u/0?cid=Y2JjOGZkNDM2N2I3OTBjZjZlMThmYmY3OGFiYjkxOTExMmU1NDkzNjI1NGQzYjNiNmJkZmRkYTQ1ZWEzNzg2ZEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t',
    );
  });

  it('strips the padding a shorter id would get', () => {
    assert.equal(googleAddUrl('ab'), 'https://calendar.google.com/calendar/u/0?cid=YWI');
  });
});

describe('renderPage', () => {
  const template = '<main>\n<!-- calendars -->\n</main>';

  it('renders a card with Google, webcal and copyable ICS links in place of the marker', () => {
    const html = renderPage(template, [calendar]);

    assert.ok(!html.includes('<!-- calendars -->'));
    assert.ok(html.startsWith('<main>\n<article class="card">'));
    assert.ok(html.includes('<h3>SpaceX crewed launches</h3>'));
    assert.ok(html.includes('<p>Flights with people aboard.</p>'));
    assert.ok(html.includes('href="https://calendar.google.com/calendar/u/0?cid=Y2JjOGZkNDM2N2I3OTBjZjZlMThmYmY3OGFiYjkxOTExMmU1NDkzNjI1NGQzYjNiNmJkZmRkYTQ1ZWEzNzg2ZEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t"'));
    assert.ok(html.includes('href="webcal://launchcal.github.io/cal/crewed.ics"'));
    assert.ok(html.includes('href="https://launchcal.github.io/cal/crewed.ics" data-copy'));
  });

  it('renders one card per calendar in order', () => {
    const html = renderPage(template, [calendar, { ...calendar, id: 'all', name: 'SpaceX launches' }]);

    assert.equal(html.match(/<article class="card">/g)!.length, 2);
    assert.ok(html.indexOf('SpaceX crewed launches') < html.indexOf('<h3>SpaceX launches</h3>'));
  });

  it('opens Google in a new tab and names each link after its calendar', () => {
    const html = renderPage(template, [calendar]);

    assert.ok(html.includes('target="_blank" rel="noopener" aria-label="Add SpaceX crewed launches to Google Calendar"'));
    assert.ok(html.includes('aria-label="Subscribe to SpaceX crewed launches in Apple Calendar or Outlook"'));
    assert.ok(html.includes('aria-label="Copy the SpaceX crewed launches ICS link"'));
  });

  it('puts a decorative icon before each button label, with the label in its own span for the copy feedback', () => {
    const html = renderPage(template, [calendar]);

    assert.equal(html.match(/<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/g)!.length, 3);
    assert.ok(html.includes('</svg><span>Add to Google Calendar</span></a>'));
    assert.ok(html.includes('</svg><span>Apple / Outlook</span></a>'));
    assert.ok(html.includes('</svg><span>Copy ICS link</span></a>'));
  });

  it('escapes calendar text', () => {
    const html = renderPage(template, [{ ...calendar, name: 'Crew <b>& "friends"</b>', blurb: 'Dragon <i>& co</i>' }]);

    assert.ok(html.includes('<h3>Crew &lt;b&gt;&amp; &quot;friends&quot;&lt;/b&gt;</h3>'));
    assert.ok(html.includes('aria-label="Add Crew &lt;b&gt;&amp; &quot;friends&quot;&lt;/b&gt; to Google Calendar"'));
    assert.ok(html.includes('<p>Dragon &lt;i&gt;&amp; co&lt;/i&gt;</p>'));
  });

  it('inserts text containing replacement patterns literally', () => {
    const html = renderPage(template, [{ ...calendar, blurb: "Costs $& and $' nothing" }]);

    assert.ok(html.includes("<p>Costs $&amp; and $' nothing</p>"));
  });

  it('refuses a template without the marker', () => {
    assert.throws(() => renderPage('<main></main>', [calendar]), /no <!-- calendars --> marker/);
  });
});

describe('nextLaunches', () => {
  const now = new Date('2026-10-01T16:00:00Z');
  const ended = event('ended', '2026-10-01T14:00:00Z', '2026-10-01T15:00:00Z');
  const endsNow = event('ends now', '2026-10-01T15:00:00Z', '2026-10-01T16:00:00Z');
  const inProgress = event('in progress', '2026-10-01T15:30:00Z', '2026-10-01T16:30:00Z');
  const later = event('later', '2026-10-03T10:00:00Z', '2026-10-03T11:00:00Z');
  const allDay = { ...event('all day', '2026-10-02', '2026-10-03'), timed: false };

  it('keeps launches that have not ended, earliest first', () => {
    const next = nextLaunches([later, ended, allDay, inProgress, endsNow], now, 5);

    assert.deepEqual(next.map((launch) => launch.title), ['in progress', 'all day', 'later']);
  });

  it('orders by start even when a later-starting launch ends first', () => {
    const long = event('long', '2026-10-02T00:00:00Z', '2026-10-05T00:00:00Z');
    const short = event('short', '2026-10-03T00:00:00Z', '2026-10-03T01:00:00Z');

    assert.deepEqual(nextLaunches([short, long], now, 5).map((launch) => launch.title), ['long', 'short']);
  });

  it('drops webcast links that are not https', () => {
    const next = nextLaunches([{ ...later, url: 'javascript:alert(1)' }, { ...allDay, url: 'http://example.com/live' }], now, 5);

    assert.deepEqual(next.map((launch) => launch.url), [null, null]);
  });

  it('limits the count', () => {
    assert.deepEqual(nextLaunches([later, allDay, inProgress], now, 2).map((launch) => launch.title), ['in progress', 'all day']);
  });

  it('carries only the fields the page shows', () => {
    assert.deepEqual(nextLaunches([{ ...later, url: 'https://example.com/live' }], now, 1), [
      {
        title: 'later',
        start: '2026-10-03T10:00:00Z',
        end: '2026-10-03T11:00:00Z',
        timed: true,
        confirmed: true,
        location: 'Pad',
        url: 'https://example.com/live',
      },
    ]);
  });

  it('returns nothing when every launch has ended', () => {
    assert.deepEqual(nextLaunches([ended, endsNow], now, 5), []);
  });
});
