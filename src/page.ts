import type { CalendarDef } from './calendars.ts';
import { TIMED_PRECISIONS, type CalendarEvent } from './event.ts';
import type { Launch } from './launch.ts';

export const SITE_URL = 'https://launchcal.github.io';

/** The fields of an event the landing page shows in its "next launch" panel. */
export type NextLaunch = Pick<CalendarEvent, 'title' | 'start' | 'end' | 'timed' | 'confirmed' | 'location' | 'url'>;

/** Neutral outline icons for the card buttons; brand logos are deliberately not used. */
const ICON_CALENDAR_ADD = icon('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4M12 13v6M9 16h6"/>');
const ICON_SUBSCRIBE = icon('<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5"/>');
const ICON_LINK = icon('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>');

function icon(paths: string): string {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

/** Google's own share link: opens "Add this calendar?" for a signed-in user. */
export function googleAddUrl(googleId: string): string {
  return `https://calendar.google.com/calendar/u/0?cid=${Buffer.from(googleId).toString('base64').replace(/=+$/, '')}`;
}

/**
 * Fills the template's markers: `<!-- calendars -->` with one card per calendar, `<!-- next -->` with the next launch
 * panel (app.js keeps it current), `<!-- schedule -->` with the upcoming launches and `<!-- structured-data -->` with
 * their JSON-LD. `upcoming` must be sorted by `net`.
 */
export function renderPage(template: string, calendars: CalendarDef[], next: NextLaunch | undefined, upcoming: Launch[]): string {
  const cards = calendars.map((calendar) => {
    const ics = `${SITE_URL}/cal/${calendar.id}.ics`;
    const name = escapeHtml(calendar.name);
    return `<article class="card">
  <h3>${name}</h3>
  <p>${escapeHtml(calendar.blurb)}</p>
  <div class="actions">
    <a class="btn btn-primary" href="${escapeHtml(googleAddUrl(calendar.googleId))}" target="_blank" rel="noopener" aria-label="Add to Google Calendar: ${name}">${ICON_CALENDAR_ADD}<span>Add to Google Calendar</span></a>
    <a class="btn" href="${escapeHtml(ics.replace('https://', 'webcal://'))}" aria-label="Apple / Outlook: subscribe to ${name}">${ICON_SUBSCRIBE}<span>Apple / Outlook</span></a>
    <a class="btn btn-quiet" href="${escapeHtml(ics)}" data-copy aria-label="Copy ICS link of ${name}">${ICON_LINK}<span>Copy ICS link</span></a>
  </div>
</article>`;
  });
  let html = fill(template, '<!-- calendars -->', cards.join('\n'));
  html = fill(html, '<!-- next -->', renderNext(next));
  html = fill(html, '<!-- schedule -->', renderSchedule(upcoming));
  return fill(html, '<!-- structured-data -->', structuredData(upcoming));
}

function fill(template: string, marker: string, html: string): string {
  if (!template.includes(marker)) throw new Error(`Page template has no ${marker} marker`);
  return template.replace(marker, () => html);
}

/** The panel as app.js would show it, in UTC, so it is in the HTML from the start and does not shift the page. */
function renderNext(next: NextLaunch | undefined): string {
  if (!next) {
    return `<section class="next" id="next" hidden>
  <h2 id="next-heading">Next launch</h2>
  <p class="next-title" id="next-title"></p>
  <p class="next-when" id="next-when"></p>
  <p class="next-clock" id="next-clock"></p>
  <p class="next-meta" id="next-meta"></p>
</section>`;
  }
  const start = new Date(next.start);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(start);
  const when = next.timed
    ? `${day}, ${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(start)} UTC`
    : `${day}, time not set yet`;
  const title = escapeHtml(next.title.replace(/^🚀\s*/, '').replace(/\s\((TBD|TBC|Hold)\)$/, ''));
  const webcast = next.url ? ` · <a href="${escapeHtml(next.url)}" rel="noopener">Webcast</a>` : '';
  return `<section class="next" id="next">
  <h2 id="next-heading">Next launch</h2>
  <p class="next-title" id="next-title">${title}${next.confirmed ? '' : '<span class="tag">Not confirmed</span>'}</p>
  <p class="next-when" id="next-when">${when}</p>
  <p class="next-clock" id="next-clock">${next.timed ? '&nbsp;' : ''}</p>
  <p class="next-meta" id="next-meta">${escapeHtml(next.location)}${webcast}</p>
</section>`;
}

/** How many launches the schedule shows before the rest fold into "Show all". */
const SCHEDULE_VISIBLE = 10;

function renderSchedule(upcoming: Launch[]): string {
  const items = upcoming.map((launch) => `<li>${launchDate(launch)}<span class="launch-name">${escapeHtml(`${launch.rocket} · ${launch.name}`)}</span><span class="launch-site">${escapeHtml(place(launch))}</span></li>`);
  const visible = `<ol class="schedule">\n${items.slice(0, SCHEDULE_VISIBLE).join('\n')}\n</ol>`;
  if (items.length <= SCHEDULE_VISIBLE) return visible;
  return `${visible}
<details class="schedule-more">
<summary>Show all ${items.length} upcoming launches</summary>
<ol class="schedule" start="${SCHEDULE_VISIBLE + 1}">\n${items.slice(SCHEDULE_VISIBLE).join('\n')}\n</ol>
</details>`;
}

/** The launch date only as precise as Launch Library 2 knows it; timed launches carry `data-local` so the page can show local time. */
function launchDate(launch: Launch): string {
  const net = new Date(launch.net);
  const year = net.getUTCFullYear();
  const precision = launch.netPrecision;
  const utc = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(net);
  if (TIMED_PRECISIONS.has(precision)) {
    const text = `${utc({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, ${utc({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} UTC`;
    return `<time datetime="${net.toISOString().replace('.000Z', 'Z')}" data-local>${text}</time>`;
  }
  if (precision === 'DAY') return `<time datetime="${launch.net.slice(0, 10)}">${utc({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</time>`;
  if (precision === 'M') return `<time datetime="${launch.net.slice(0, 7)}">${utc({ month: 'long', year: 'numeric' })}</time>`;
  if (/^[QH][1-4]$/.test(precision)) return `<time datetime="${year}">${precision} ${year}</time>`;
  if (precision === 'DEC') return `<time datetime="${year}">${Math.floor(year / 10) * 10}s</time>`;
  return `<time datetime="${year}">${year}</time>`;
}

function place(launch: Launch): string {
  return launch.pad.startsWith('Unknown') ? launch.location : `${launch.pad}, ${launch.location}`;
}

/** schema.org WebSite plus an Event for each launch with a known day (ending at its window end, or on its day when only the day is known); vaguer launches are not events yet. */
function structuredData(upcoming: Launch[]): string {
  const events = upcoming
    .filter((launch) => TIMED_PRECISIONS.has(launch.netPrecision) || launch.netPrecision === 'DAY')
    .map((launch) => {
      const webcast = launch.webcasts.find((cast) => cast.url.startsWith('https://'))?.url;
      const site = { '@type': 'Place', name: launch.pad.startsWith('Unknown') ? launch.location : launch.pad, address: launch.location };
      const day = launch.netPrecision === 'DAY';
      const endDate = day ? launch.net.slice(0, 10) : launch.windowEnd && launch.windowEnd >= launch.net ? launch.windowEnd : undefined;
      return {
        '@type': 'Event',
        name: `${launch.rocket} launch: ${launch.name}`,
        startDate: day ? launch.net.slice(0, 10) : launch.net,
        endDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: webcast ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
        location: webcast ? [site, { '@type': 'VirtualLocation', url: webcast }] : site,
        organizer: { '@type': 'Organization', name: 'SpaceX', url: 'https://www.spacex.com' },
        description: launch.description ?? `${launch.rocket} launch from ${place(launch)}.`,
        image: `${SITE_URL}/img/og.jpg`,
      };
    });
  const graph = [{ '@type': 'WebSite', name: 'launchcal', alternateName: 'SpaceX launch calendar', url: `${SITE_URL}/` }, ...events];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/** The next `count` events that have not ended at `now`, earliest start first; webcast links other than https are dropped. */
export function nextLaunches(events: CalendarEvent[], now: Date, count: number): NextLaunch[] {
  return events
    .filter((event) => Date.parse(event.end) > now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, count)
    .map(({ title, start, end, timed, confirmed, location, url }) => ({
      title,
      start,
      end,
      timed,
      confirmed,
      location,
      url: url?.startsWith('https://') ? url : null,
    }));
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
