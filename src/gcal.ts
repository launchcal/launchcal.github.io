import { createHash } from 'node:crypto';
import type { CalendarEvent } from './event.ts';

/** A Calendar API v3 event resource, limited to the fields launchcal writes. */
export interface GoogleEvent {
  summary: string;
  description: string;
  location: string;
  start: { dateTime: string; timeZone: 'UTC' } | { date: string };
  end: { dateTime: string; timeZone: 'UTC' } | { date: string };
  status: 'confirmed' | 'tentative';
  transparency: 'transparent';
  source?: { title: string; url: string };
  extendedProperties: { private: { launchcal: '1'; launchId: string; hash: string } };
}

/** An event launchcal wrote earlier, as listed back from Google. */
export interface ExistingEvent {
  /** Google's event id. */
  id: string;
  launchId: string;
  hash: string;
  /** `start.dateTime` or `start.date`. */
  start: string;
}

export interface SyncPlan {
  insert: GoogleEvent[];
  update: { id: string; event: GoogleEvent }[];
  delete: ExistingEvent[];
}

/** Maps an event to Google's format; `hash` covers every written field, so any change triggers an update. */
export function toGoogleEvent(event: CalendarEvent): GoogleEvent {
  const body = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.timed ? { dateTime: event.start, timeZone: 'UTC' as const } : { date: event.start },
    end: event.timed ? { dateTime: event.end, timeZone: 'UTC' as const } : { date: event.end },
    status: event.confirmed ? ('confirmed' as const) : ('tentative' as const),
    transparency: 'transparent' as const,
    ...(event.url ? { source: { title: 'Webcast', url: event.url } } : {}),
  };
  const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16);
  return { ...body, extendedProperties: { private: { launchcal: '1', launchId: event.id, hash } } };
}

/**
 * Diffs the wanted events against Google by launch id. Events starting before `windowStart` are outside
 * the snapshot and stay as history; duplicates of one launch are deleted.
 */
export function planSync(wanted: GoogleEvent[], existing: ExistingEvent[], windowStart: string): SyncPlan {
  const plan: SyncPlan = { insert: [], update: [], delete: [] };
  const byLaunch = new Map<string, ExistingEvent>();
  for (const event of existing) {
    if (byLaunch.has(event.launchId)) plan.delete.push(event);
    else byLaunch.set(event.launchId, event);
  }
  for (const event of wanted) {
    const { launchId, hash } = event.extendedProperties.private;
    const current = byLaunch.get(launchId);
    byLaunch.delete(launchId);
    if (!current) plan.insert.push(event);
    else if (current.hash !== hash) plan.update.push({ id: current.id, event });
  }
  const since = Date.parse(windowStart);
  for (const event of byLaunch.values()) {
    if (Date.parse(event.start) >= since) plan.delete.push(event);
  }
  return plan;
}
