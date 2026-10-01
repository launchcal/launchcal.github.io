import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CALENDAR_DESCRIPTION, CALENDARS } from './calendars.ts';
import { toEvent, type CalendarEvent } from './event.ts';
import { toIcs } from './ics.ts';
import type { Launch } from './launch.ts';

const launches = JSON.parse(await readFile('data/snapshot.json', 'utf8')) as Launch[];

const feeds = CALENDARS.map((calendar) => ({
  calendar,
  events: launches
    .filter(calendar.includes)
    .map(toEvent)
    .filter((event): event is CalendarEvent => event !== null),
}));
if (feeds.find((feed) => feed.calendar.id === 'all')!.events.length === 0) {
  throw new Error('No launch has a usable date; refusing to publish empty calendars');
}

await mkdir('site/cal', { recursive: true });
for (const { calendar, events } of feeds) {
  await writeFile(`site/cal/${calendar.id}.ics`, toIcs(calendar.name, CALENDAR_DESCRIPTION, events));
  console.log(`site/cal/${calendar.id}.ics: ${events.length} events`);
}
