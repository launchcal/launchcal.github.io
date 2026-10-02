import type { Booster, Launch } from './launch.ts';

/** A calendar entry independent of the output format, shared by the ICS feeds and the Google sync. */
export interface CalendarEvent {
  /** Launch Library 2 launch id. */
  id: string;
  title: string;
  description: string;
  location: string;
  url: string | null;
  /** True when the launch time is known; otherwise an all-day event. */
  timed: boolean;
  /** ISO date-time in UTC when timed, otherwise `YYYY-MM-DD`. */
  start: string;
  /** Exclusive end: ISO date-time when timed, otherwise the following `YYYY-MM-DD`. */
  end: string;
  /** False while the launch is not yet go (TBD, TBC, Hold); flown launches are confirmed whatever the outcome. */
  confirmed: boolean;
}

export const TIMED_PRECISIONS = new Set(['SEC', 'MIN', 'HR']);

const CONFIRMED_STATUSES = new Set(['Go', 'In Flight', 'Success', 'Failure', 'Partial Failure']);

/** Statuses that need no title suffix; every other status is shown, e.g. "(TBD)" or "(Failure)". */
const PLAIN_TITLE_STATUSES = new Set(['Go', 'In Flight', 'Success']);

const EVENT_MINUTES = 60;

/** Builds the event for a launch, or null when its date is known only to the month or coarser. */
export function toEvent(launch: Launch): CalendarEvent | null {
  const timed = TIMED_PRECISIONS.has(launch.netPrecision);
  if (!timed && launch.netPrecision !== 'DAY') return null;

  const net = new Date(launch.net);
  const confirmed = CONFIRMED_STATUSES.has(launch.status);
  const webcast = launch.webcasts[0]?.url ?? null;
  return {
    id: launch.id,
    title: `🚀 ${launch.rocket} · ${launch.name}${PLAIN_TITLE_STATUSES.has(launch.status) ? '' : ` (${launch.status})`}`,
    description: describe(launch, webcast),
    location: launch.pad.startsWith('Unknown') ? launch.location : `${launch.pad}, ${launch.location}`,
    url: webcast,
    timed,
    start: timed ? net.toISOString().replace('.000Z', 'Z') : launch.net.slice(0, 10),
    end: timed
      ? new Date(net.getTime() + EVENT_MINUTES * 60_000).toISOString().replace('.000Z', 'Z')
      : new Date(net.getTime() + 86_400_000).toISOString().slice(0, 10),
    confirmed,
  };
}

function describe(launch: Launch, webcast: string | null): string {
  const lines = [`Status: ${launch.status}`];
  if (launch.windowStart && launch.windowEnd && launch.windowStart !== launch.windowEnd) {
    lines.push(`Window: ${utc(launch.windowStart)} to ${utc(launch.windowEnd)} UTC`);
  }
  if (launch.boosters.length > 0) {
    lines.push(`${launch.boosters.length > 1 ? 'Boosters' : 'Booster'}: ${launch.boosters.map(booster).join('; ')}`);
  }
  if (launch.spacecraft) lines.push(`Spacecraft: ${launch.spacecraft}`);
  if (launch.crew.length > 0) lines.push(`Crew: ${launch.crew.join(', ')}`);
  if (launch.orbit) lines.push(`Orbit: ${launch.orbit}`);
  if (launch.missionType) lines.push(`Mission type: ${launch.missionType}`);
  if (webcast) lines.push(`Webcast: ${webcast}`);
  if (launch.description) lines.push('', launch.description);
  lines.push('', 'Unofficial, not affiliated with SpaceX. Data: The Space Devs. https://launchcal.github.io');
  return lines.join('\n');
}

function booster(stage: Booster): string {
  const landing = stage.landingAttempt === false ? 'expended' : `landing ${stage.landingLocation ?? 'TBD'}`;
  return `${stage.serial ?? 'TBD'}, ${landing}`;
}

function utc(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}
