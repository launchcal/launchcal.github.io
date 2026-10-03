import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CalendarDef } from '../src/calendars.ts';
import type { CalendarEvent } from '../src/event.ts';
import type { Launch } from '../src/launch.ts';
import { googleAddUrl, nextLaunches, renderPage, type NextLaunch } from '../src/page.ts';

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
  const template = '<main>\n<!-- calendars -->\n</main>\n<!-- next -->\n<!-- schedule -->\n<!-- structured-data -->';

  it('renders a card with Google, webcal and copyable ICS links in place of the marker', () => {
    const html = renderPage(template, [calendar], undefined, []);

    assert.ok(!html.includes('<!-- calendars -->'));
    assert.ok(html.startsWith('<main>\n<article class="card">'));
    assert.ok(html.includes('<h3>SpaceX crewed launches</h3>'));
    assert.ok(html.includes('<p>Flights with people aboard.</p>'));
    assert.ok(html.includes('href="https://calendar.google.com/calendar/u/0?cid=Y2JjOGZkNDM2N2I3OTBjZjZlMThmYmY3OGFiYjkxOTExMmU1NDkzNjI1NGQzYjNiNmJkZmRkYTQ1ZWEzNzg2ZEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t"'));
    assert.ok(html.includes('href="webcal://launchcal.github.io/cal/crewed.ics"'));
    assert.ok(html.includes('href="https://launchcal.github.io/cal/crewed.ics" data-copy'));
  });

  it('renders one card per calendar in order', () => {
    const html = renderPage(template, [calendar, { ...calendar, id: 'all', name: 'SpaceX launches' }], undefined, []);

    assert.equal(html.match(/<article class="card">/g)!.length, 2);
    assert.ok(html.indexOf('SpaceX crewed launches') < html.indexOf('<h3>SpaceX launches</h3>'));
  });

  it('opens Google in a new tab and names each link after its calendar', () => {
    const html = renderPage(template, [calendar], undefined, []);

    assert.ok(html.includes('target="_blank" rel="noopener" aria-label="Add to Google Calendar: SpaceX crewed launches"'));
    assert.ok(html.includes('aria-label="Apple / Outlook: subscribe to SpaceX crewed launches"'));
    assert.ok(html.includes('aria-label="Copy ICS link of SpaceX crewed launches"'));
  });

  it('puts a decorative icon before each button label, with the label in its own span for the copy feedback', () => {
    const html = renderPage(template, [calendar], undefined, []);

    assert.equal(html.match(/<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/g)!.length, 3);
    assert.ok(html.includes('</svg><span>Add to Google Calendar</span></a>'));
    assert.ok(html.includes('</svg><span>Apple / Outlook</span></a>'));
    assert.ok(html.includes('</svg><span>Copy ICS link</span></a>'));
  });

  it('escapes calendar text', () => {
    const html = renderPage(template, [{ ...calendar, name: 'Crew <b>& "friends"</b>', blurb: 'Dragon <i>& co</i>' }], undefined, []);

    assert.ok(html.includes('<h3>Crew &lt;b&gt;&amp; &quot;friends&quot;&lt;/b&gt;</h3>'));
    assert.ok(html.includes('aria-label="Add to Google Calendar: Crew &lt;b&gt;&amp; &quot;friends&quot;&lt;/b&gt;"'));
    assert.ok(html.includes('<p>Dragon &lt;i&gt;&amp; co&lt;/i&gt;</p>'));
  });

  it('inserts text containing replacement patterns literally', () => {
    const html = renderPage(template, [{ ...calendar, blurb: "Costs $& and $' nothing" }], undefined, []);

    assert.ok(html.includes("<p>Costs $&amp; and $' nothing</p>"));
  });

  it('refuses a template missing any marker', () => {
    assert.throws(() => renderPage('<main></main>', [calendar], undefined, []), /no <!-- calendars --> marker/);
    assert.throws(() => renderPage('<!-- calendars --><!-- schedule --><!-- structured-data -->', [calendar], undefined, []), /no <!-- next --> marker/);
    assert.throws(() => renderPage('<!-- calendars --><!-- next --><!-- structured-data -->', [calendar], undefined, []), /no <!-- schedule --> marker/);
    assert.throws(() => renderPage('<!-- calendars --><!-- next --><!-- schedule -->', [calendar], undefined, []), /no <!-- structured-data --> marker/);
  });
});

describe('renderPage next launch', () => {
  const template = '<!-- calendars --><!-- next --><!-- schedule --><!-- structured-data -->';
  const next: NextLaunch = {
    title: '🚀 Falcon 9 · Crew <14> (TBD)',
    start: '2026-10-05T08:16:00Z',
    end: '2026-10-05T09:16:00Z',
    timed: true,
    confirmed: false,
    location: 'SLC-40, Cape Canaveral SFS, FL, USA',
    url: 'https://www.youtube.com/watch?v=x',
  };

  it('renders the panel in UTC with room reserved for the countdown', () => {
    assert.ok(renderPage(template, [], next, []).includes(`<section class="next" id="next">
  <h2 id="next-heading">Next launch</h2>
  <p class="next-title" id="next-title">Falcon 9 · Crew &lt;14&gt;<span class="tag">Not confirmed</span></p>
  <p class="next-when" id="next-when">Mon, 5 Oct 2026, 08:16 UTC</p>
  <p class="next-clock" id="next-clock">&nbsp;</p>
  <p class="next-meta" id="next-meta">SLC-40, Cape Canaveral SFS, FL, USA · <a href="https://www.youtube.com/watch?v=x" rel="noopener">Webcast</a></p>
</section>`));
  });

  it('shows a confirmed all-day launch without countdown, tag or webcast', () => {
    const html = renderPage(template, [], { ...next, title: '🚀 Falcon 9 · Crew-14', start: '2026-10-07', end: '2026-10-08', timed: false, confirmed: true, url: null }, []);

    assert.ok(html.includes('<p class="next-title" id="next-title">Falcon 9 · Crew-14</p>'));
    assert.ok(html.includes('<p class="next-when" id="next-when">Wed, 7 Oct 2026, time not set yet</p>'));
    assert.ok(html.includes('<p class="next-clock" id="next-clock"></p>'));
    assert.ok(html.includes('<p class="next-meta" id="next-meta">SLC-40, Cape Canaveral SFS, FL, USA</p>'));
  });

  it('keeps the empty panel hidden when nothing is coming up', () => {
    assert.ok(renderPage(template, [], undefined, []).includes('<section class="next" id="next" hidden>'));
  });
});

describe('renderPage schedule', () => {
  const template = '<!-- calendars --><!-- next --><!-- schedule --><!-- structured-data -->';

  it('dates each launch only as precisely as it is known', () => {
    const html = renderPage(template, [], undefined, [
      launch({ netPrecision: 'MIN', net: '2026-10-05T08:16:00Z' }),
      launch({ netPrecision: 'DAY', net: '2026-10-07T00:00:00Z' }),
      launch({ netPrecision: 'M', net: '2026-10-31T00:00:00Z' }),
      launch({ netPrecision: 'Q4', net: '2026-12-31T00:00:00Z' }),
      launch({ netPrecision: 'H2', net: '2026-12-31T00:00:00Z' }),
      launch({ netPrecision: 'Y', net: '2027-12-31T00:00:00Z' }),
      launch({ netPrecision: 'DEC', net: '2029-12-31T00:00:00Z' }),
    ]);

    assert.ok(html.includes('<time datetime="2026-10-05T08:16:00Z" data-local>Mon, 5 Oct 2026, 08:16 UTC</time>'));
    assert.ok(html.includes('<time datetime="2026-10-07">Wed, 7 Oct 2026</time>'));
    assert.ok(html.includes('<time datetime="2026-10">October 2026</time>'));
    assert.ok(html.includes('<time datetime="2026">Q4 2026</time>'));
    assert.ok(html.includes('<time datetime="2026">H2 2026</time>'));
    assert.ok(html.includes('<time datetime="2027">2027</time>'));
    assert.ok(html.includes('<time datetime="2029">2020s</time>'));
  });

  it('names the rocket, mission and pad, escaped', () => {
    const html = renderPage(template, [], undefined, [launch({ name: 'Crew <9>', pad: 'SLC-40', location: 'Cape Canaveral SFS, FL, USA' })]);

    assert.ok(html.includes('<span class="launch-name">Falcon 9 · Crew &lt;9&gt;</span><span class="launch-site">SLC-40, Cape Canaveral SFS, FL, USA</span></li>'));
  });

  it('shows the first 10 launches and folds the rest into "Show all", numbering on', () => {
    const upcoming = Array.from({ length: 12 }, (_, i) => launch({ name: `Mission ${i + 1}` }));
    const html = renderPage(template, [], undefined, upcoming);
    const [visible, folded] = html.split('<details class="schedule-more">');

    assert.equal(visible.match(/<li>/g)!.length, 10);
    assert.ok(visible.includes('Mission 10<') && !visible.includes('Mission 11<'));
    assert.ok(folded.includes('<summary>Show all 12 upcoming launches</summary>\n<ol class="schedule" start="11">'));
    assert.equal(folded.match(/<li>/g)!.length, 2);
  });

  it('has no "Show all" with 10 launches or fewer', () => {
    const html = renderPage(template, [], undefined, Array.from({ length: 10 }, () => launch({})));

    assert.ok(!html.includes('<details'));
  });
});

describe('renderPage structured data', () => {
  const template = '<!-- calendars --><!-- next --><!-- schedule --><!-- structured-data -->';

  function graph(upcoming: Launch[]): Record<string, unknown>[] {
    const html = renderPage(template, [], undefined, upcoming);
    const json = html.match(/<script type="application\/ld\+json">(.*)<\/script>/)![1];
    return JSON.parse(json)['@graph'];
  }

  it('describes the website', () => {
    assert.deepEqual(graph([])[0], { '@type': 'WebSite', name: 'launchcal', alternateName: 'SpaceX launch calendar', url: 'https://launchcal.github.io/' });
  });

  it('marks up launches with a known day as events, with the webcast as a virtual location', () => {
    const [, timed, day, ...rest] = graph([
      launch({ name: 'Crew-14', netPrecision: 'MIN', net: '2026-10-05T08:16:00Z', windowEnd: '2026-10-05T10:16:00Z', webcasts: [{ title: 'SpaceX', url: 'https://www.youtube.com/watch?v=x' }] }),
      launch({ name: 'Bandwagon 5', netPrecision: 'DAY', net: '2026-10-07T00:00:00Z', description: null }),
      launch({ name: 'Vague', netPrecision: 'M', net: '2026-10-31T00:00:00Z' }),
    ]);

    assert.deepEqual(rest, []);
    assert.deepEqual(timed, {
      '@type': 'Event',
      name: 'Falcon 9 launch: Crew-14',
      startDate: '2026-10-05T08:16:00Z',
      endDate: '2026-10-05T10:16:00Z',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
      location: [
        { '@type': 'Place', name: 'SLC-40', address: 'Cape Canaveral SFS, FL, USA' },
        { '@type': 'VirtualLocation', url: 'https://www.youtube.com/watch?v=x' },
      ],
      organizer: { '@type': 'Organization', name: 'SpaceX', url: 'https://www.spacex.com' },
      description: 'A mission.',
      image: 'https://launchcal.github.io/img/og.jpg',
    });
    assert.equal(day.startDate, '2026-10-07');
    assert.equal(day.endDate, '2026-10-07');
    assert.equal(day.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode');
    assert.deepEqual(day.location, { '@type': 'Place', name: 'SLC-40', address: 'Cape Canaveral SFS, FL, USA' });
    assert.equal(day.description, 'Falcon 9 launch from SLC-40, Cape Canaveral SFS, FL, USA.');
  });

  it('ends an instantaneous launch at its launch time', () => {
    const [, instant] = graph([launch({ net: '2026-10-05T08:16:00Z', windowEnd: '2026-10-05T08:16:00Z' })]);

    assert.equal(instant.endDate, '2026-10-05T08:16:00Z');
  });

  it('has no end date for a timed launch without a window end, or with one before the launch time', () => {
    const [, unknown, earlier] = graph([
      launch({ windowEnd: null }),
      launch({ net: '2026-10-05T08:16:00Z', windowEnd: '2026-10-05T08:00:00Z' }),
    ]);

    assert.ok(!('endDate' in unknown));
    assert.ok(!('endDate' in earlier));
  });

  it('cannot be closed early by text in the data', () => {
    const html = renderPage(template, [], undefined, [launch({ netPrecision: 'DAY', name: '</script><script>alert(1)</script>' })]);

    assert.equal(html.match(/<\/script>/g)!.length, 1);
    assert.ok(html.includes('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>'));
  });
});

function launch(fields: Partial<Launch>): Launch {
  return {
    id: 'id',
    name: 'Mission',
    rocket: 'Falcon 9',
    net: '2026-10-05T08:16:00Z',
    netPrecision: 'MIN',
    windowStart: null,
    windowEnd: null,
    status: 'Go',
    pad: 'SLC-40',
    location: 'Cape Canaveral SFS, FL, USA',
    missionType: null,
    orbit: null,
    description: 'A mission.',
    boosters: [],
    spacecraft: null,
    crew: [],
    webcasts: [],
    ...fields,
  };
}

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
