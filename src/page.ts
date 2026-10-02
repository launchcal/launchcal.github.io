import type { CalendarDef } from './calendars.ts';
import type { CalendarEvent } from './event.ts';

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

/** Replaces the `<!-- calendars -->` marker in the template with one card per calendar. */
export function renderPage(template: string, calendars: CalendarDef[]): string {
  if (!template.includes('<!-- calendars -->')) throw new Error('Page template has no <!-- calendars --> marker');
  const cards = calendars.map((calendar) => {
    const ics = `${SITE_URL}/cal/${calendar.id}.ics`;
    const name = escapeHtml(calendar.name);
    return `<article class="card">
  <h3>${name}</h3>
  <p>${escapeHtml(calendar.blurb)}</p>
  <div class="actions">
    <a class="btn btn-primary" href="${escapeHtml(googleAddUrl(calendar.googleId))}" target="_blank" rel="noopener" aria-label="Add ${name} to Google Calendar">${ICON_CALENDAR_ADD}<span>Add to Google Calendar</span></a>
    <a class="btn" href="${escapeHtml(ics.replace('https://', 'webcal://'))}" aria-label="Subscribe to ${name} in Apple Calendar or Outlook">${ICON_SUBSCRIBE}<span>Apple / Outlook</span></a>
    <a class="btn btn-quiet" href="${escapeHtml(ics)}" data-copy aria-label="Copy the ${name} ICS link">${ICON_LINK}<span>Copy ICS link</span></a>
  </div>
</article>`;
  });
  return template.replace('<!-- calendars -->', () => cards.join('\n'));
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
