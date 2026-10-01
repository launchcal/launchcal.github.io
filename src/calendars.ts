import type { Launch } from './launch.ts';

/** One subscribable calendar; `id` is its file name and must never change once published. */
export interface CalendarDef {
  id: string;
  name: string;
  includes: (launch: Launch) => boolean;
}

export const CALENDAR_DESCRIPTION =
  'Unofficial, auto-updating calendar from https://launchcal.github.io. Not affiliated with SpaceX. Launch data: The Space Devs.';

export const CALENDARS: CalendarDef[] = [
  { id: 'all', name: 'SpaceX launches', includes: () => true },
  {
    id: 'crewed',
    name: 'SpaceX crewed launches',
    includes: (launch) => launch.crew.length > 0 || (launch.spacecraft?.startsWith('Crew Dragon') ?? false),
  },
  { id: 'starship', name: 'Starship launches', includes: (launch) => launch.rocket === 'Starship' },
  {
    id: 'no-starlink',
    name: 'SpaceX launches without Starlink',
    includes: (launch) => launch.rocket === 'Starship' || !launch.name.startsWith('Starlink'),
  },
];
