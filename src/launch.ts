/** A first stage flying on a launch; `serial` is null while the booster is unassigned. */
export interface Booster {
  serial: string | null;
  landingAttempt: boolean;
  /** Landing zone or droneship abbreviation, e.g. "LZ-40" or "ASOG". */
  landingLocation: string | null;
}

export interface Webcast {
  title: string;
  url: string;
}

/** One upcoming SpaceX launch in launchcal's own shape, independent of the upstream API. */
export interface Launch {
  /** Upstream Launch Library 2 id; stable across reschedules, so it identifies calendar events. */
  id: string;
  name: string;
  rocket: string;
  /** "No earlier than" T-0 in UTC; only as precise as `netPrecision` says. */
  net: string;
  /** Launch Library 2 precision code, e.g. SEC, MIN, DAY, M, Q4, H2, Y, FY, DEC (decade). */
  netPrecision: string;
  windowStart: string | null;
  windowEnd: string | null;
  /** Short status code: Go, TBD, TBC, Hold, ... */
  status: string;
  pad: string;
  location: string;
  missionType: string | null;
  orbit: string | null;
  description: string | null;
  boosters: Booster[];
  spacecraft: string | null;
  crew: string[];
  webcasts: Webcast[];
}
