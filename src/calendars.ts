import type { Launch } from './launch.ts';

/** One subscribable calendar; `id` is its file name and must never change once published. */
export interface CalendarDef {
  id: string;
  name: string;
  /** Public Google Calendar id the sync writes to; public like `id`, never change it once published. */
  googleId: string;
  includes: (launch: Launch) => boolean;
}

export const CALENDAR_DESCRIPTION =
  'Unofficial, auto-updating calendar from https://launchcal.github.io. Not affiliated with SpaceX. Launch data: The Space Devs.';

export const CALENDARS: CalendarDef[] = [
  {
    id: 'all',
    name: 'SpaceX launches',
    googleId: '24f5ae18242c0bd83698f9ee64ec2cc2da185cc5357718efe3bb1d2d800c42bf@group.calendar.google.com',
    includes: () => true,
  },
  {
    id: 'crewed',
    name: 'SpaceX crewed launches',
    googleId: 'cbc8fd4367b790cf6e18fbf78abb919112e54936254d3b3b6bdfdda45ea3786d@group.calendar.google.com',
    includes: (launch) => launch.crew.length > 0 || (launch.spacecraft?.startsWith('Crew Dragon') ?? false),
  },
  {
    id: 'starship',
    name: 'Starship launches',
    googleId: 'a72ea698dbec5c3fc71148b928dd5b1c12fef27f98676bfe7b4fcc4ef444a2fa@group.calendar.google.com',
    includes: (launch) => launch.rocket === 'Starship',
  },
  {
    id: 'no-starlink',
    name: 'SpaceX launches without Starlink',
    googleId: 'c1884006e046fbd621afe8756f6b4ec003f2ac9e9590ca380f511ddeaab24470@group.calendar.google.com',
    includes: (launch) => launch.rocket === 'Starship' || !launch.name.startsWith('Starlink'),
  },
];
