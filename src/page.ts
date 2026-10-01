import type { CalendarDef } from './calendars.ts';
import type { CalendarEvent } from './event.ts';

export const SITE_URL = 'https://launchcal.github.io';

/** The fields of an event the landing page shows in its "next launch" panel. */
export type NextLaunch = Pick<CalendarEvent, 'title' | 'start' | 'end' | 'timed' | 'confirmed' | 'location' | 'url'>;

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
    <a class="btn btn-primary" href="${escapeHtml(googleAddUrl(calendar.googleId))}" target="_blank" rel="noopener" aria-label="Add ${name} to Google Calendar">Add to Google Calendar</a>
    <a class="btn" href="${escapeHtml(ics.replace('https://', 'webcal://'))}" aria-label="Subscribe to ${name} in Apple Calendar or Outlook">Apple / Outlook</a>
    <a class="btn btn-quiet" href="${escapeHtml(ics)}" data-copy aria-label="Copy the ${name} ICS link">Copy ICS link</a>
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
