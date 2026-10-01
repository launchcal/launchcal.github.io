import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { CALENDARS } from './calendars.ts';
import { toEvent, type CalendarEvent } from './event.ts';
import { planSync, toGoogleEvent } from './gcal.ts';
import { accessToken, deleteEvent, insertEvent, listEvents, updateEvent, type ServiceAccountKey } from './google.ts';
import type { Launch } from './launch.ts';
import { recentSince } from './ll2.ts';

// --calendar <id>=<googleCalendarId> syncs only that calendar, into the given Google calendar.
const { values: args } = parseArgs({ options: { 'dry-run': { type: 'boolean' }, calendar: { type: 'string' } } });
const separator = args.calendar?.indexOf('=') ?? -1;
const onlyId = args.calendar?.slice(0, separator);
const overrideGoogleId = args.calendar?.slice(separator + 1);
if (args.calendar && (separator <= 0 || !overrideGoogleId)) throw new Error('Use --calendar <id>=<googleCalendarId>');
if (onlyId && !CALENDARS.some((calendar) => calendar.id === onlyId)) throw new Error(`Unknown calendar ${onlyId}`);

const launches = JSON.parse(await readFile('data/snapshot.json', 'utf8')) as Launch[];
const feeds = CALENDARS.map((calendar) => ({
  calendar,
  events: launches
    .filter(calendar.includes)
    .map(toEvent)
    .filter((event): event is CalendarEvent => event !== null),
}));
if (feeds.find((feed) => feed.calendar.id === 'all')!.events.length === 0) {
  throw new Error('No launch has a usable date; refusing to empty the Google calendars');
}

const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  ?? (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE && (await readFile(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE, 'utf8')));
if (!keyJson) throw new Error('Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_FILE');
const token = await accessToken(JSON.parse(keyJson) as ServiceAccountKey);
const windowStart = recentSince(new Date());

for (const { calendar, events } of feeds) {
  if (onlyId && calendar.id !== onlyId) continue;
  const googleId = overrideGoogleId ?? calendar.googleId;
  if (!googleId) throw new Error(`Calendar ${calendar.id} has no Google calendar id`);

  const plan = planSync(events.map(toGoogleEvent), await listEvents(token, googleId), windowStart);
  console.log(`${calendar.id}: ${plan.insert.length} insert, ${plan.update.length} update, ${plan.delete.length} delete`);
  for (const event of plan.insert) console.log(`  + ${event.summary}`);
  for (const { event } of plan.update) console.log(`  ~ ${event.summary}`);
  for (const event of plan.delete) console.log(`  - ${event.launchId} (${event.start})`);
  if (args['dry-run']) continue;

  for (const event of plan.insert) await insertEvent(token, googleId, event);
  for (const { id, event } of plan.update) await updateEvent(token, googleId, id, event);
  for (const event of plan.delete) await deleteEvent(token, googleId, event.id);
}
