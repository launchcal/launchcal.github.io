import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CALENDAR_DESCRIPTION, CALENDARS } from './calendars.ts';
import { toEvent, type CalendarEvent } from './event.ts';
import { toIcs } from './ics.ts';
import type { Launch } from './launch.ts';
import { nextLaunches, renderPage } from './page.ts';

/** How many upcoming launches `next.json` carries, so the page can move on when one ends before the next build. */
const NEXT_COUNT = 5;

const launches = JSON.parse(await readFile('data/snapshot.json', 'utf8')) as Launch[];

const feeds = CALENDARS.map((calendar) => ({
  calendar,
  events: launches
    .filter(calendar.includes)
    .map(toEvent)
    .filter((event): event is CalendarEvent => event !== null),
}));
const all = feeds.find((feed) => feed.calendar.id === 'all')!.events;
if (all.length === 0) {
  throw new Error('No launch has a usable date; refusing to publish empty calendars');
}

await mkdir('site/cal', { recursive: true });
for (const { calendar, events } of feeds) {
  await writeFile(`site/cal/${calendar.id}.ics`, toIcs(calendar.name, CALENDAR_DESCRIPTION, events));
  console.log(`site/cal/${calendar.id}.ics: ${events.length} events`);
}

const flown = new Set(['Success', 'Failure', 'Partial Failure']);
const upcoming = launches
  .filter((launch) => !flown.has(launch.status) && Date.parse(launch.net) + 3_600_000 > Date.now())
  .sort((a, b) => Date.parse(a.net) - Date.parse(b.net) || a.name.localeCompare(b.name));
const next = nextLaunches(all, new Date(), NEXT_COUNT);
await writeFile('site/index.html', renderPage(await readFile('src/page.html', 'utf8'), CALENDARS, next[0], upcoming));
await writeFile('site/next.json', JSON.stringify(next) + '\n');
console.log(`site/index.html, site/next.json: ${next.length} upcoming`);
