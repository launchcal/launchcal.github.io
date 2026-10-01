import type { Launch } from './launch.ts';

/** Detailed mode is needed for boosters, crew and webcasts; pages are capped at 100 results. */
const QUERY = 'lsp__name=SpaceX&limit=100&mode=detailed';

export const UPCOMING_URL = `https://ll.thespacedevs.com/2.3.0/launches/upcoming/?${QUERY}`;

/** How far back launched flights stay in the calendars. */
const RECENT_DAYS = 30;

/** Previous launches since midnight UTC `RECENT_DAYS` ago, so the query only moves once a day. */
export function recentUrl(now: Date): string {
  const since = new Date(now.getTime() - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
  return `https://ll.thespacedevs.com/2.3.0/launches/previous/?${QUERY}&net__gte=${since}T00:00:00Z`;
}

const USER_AGENT = 'launchcal (+https://github.com/launchcal/launchcal.github.io)';

/** The subset of a Launch Library 2 detailed launch record that launchcal reads. */
export interface RawLaunch {
  id: string;
  name: string;
  net: string;
  net_precision: { abbrev: string } | null;
  window_start: string | null;
  window_end: string | null;
  status: { abbrev: string };
  pad: { name: string; location: { name: string } };
  mission: {
    name: string;
    type: string | null;
    description: string | null;
    orbit: { abbrev: string; name: string } | null;
  } | null;
  rocket: {
    configuration: { name: string };
    launcher_stage: {
      launcher: { serial_number: string | null } | null;
      landing: { attempt: boolean | null; landing_location: { abbrev: string } | null } | null;
    }[];
    spacecraft_stage: {
      spacecraft: { name: string } | null;
      launch_crew: { astronaut: { name: string } }[];
    }[];
  };
  vid_urls: { title: string; url: string }[];
}

interface Page {
  count: number;
  next: string | null;
  results: RawLaunch[];
}

/** Fetches every upcoming SpaceX launch; throws rather than return an empty list. */
export async function fetchUpcoming(fetchFn: typeof fetch = fetch): Promise<RawLaunch[]> {
  const launches = await fetchAllPages(UPCOMING_URL, fetchFn);
  if (launches.length === 0) throw new Error('Launch Library 2 returned no upcoming launches');
  return launches;
}

/** Fetches SpaceX launches of the last `RECENT_DAYS` days; empty is valid, e.g. during a stand-down. */
export async function fetchRecent(now: Date, fetchFn: typeof fetch = fetch): Promise<RawLaunch[]> {
  return fetchAllPages(recentUrl(now), fetchFn);
}

/** Follows `next` links across all pages; throws rather than return a partial list. */
async function fetchAllPages(firstUrl: string, fetchFn: typeof fetch): Promise<RawLaunch[]> {
  const launches: RawLaunch[] = [];
  let url: string | null = firstUrl;
  let expected = 0;
  while (url) {
    const res = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Launch Library 2 returned HTTP ${res.status} for ${url}`);
    const page = (await res.json()) as Page;
    expected = page.count;
    launches.push(...page.results);
    url = page.next;
  }
  if (launches.length !== expected) {
    throw new Error(`Launch Library 2 paging returned ${launches.length} launches, expected ${expected}`);
  }
  if (new Set(launches.map((raw) => raw.id)).size !== launches.length) {
    throw new Error('Launch Library 2 paging returned a launch twice');
  }
  return launches;
}

export function toLaunch(raw: RawLaunch): Launch {
  const stages = raw.rocket.spacecraft_stage;
  return {
    id: raw.id,
    name: raw.mission?.name ?? raw.name,
    rocket: raw.rocket.configuration.name,
    net: raw.net,
    netPrecision: raw.net_precision?.abbrev ?? 'Y',
    windowStart: raw.window_start,
    windowEnd: raw.window_end,
    status: raw.status.abbrev,
    pad: raw.pad.name,
    location: raw.pad.location.name,
    missionType: raw.mission?.type ?? null,
    orbit: raw.mission?.orbit && raw.mission.orbit.abbrev !== 'N/A' ? raw.mission.orbit.name.replace(/ N\/A$/, '') : null,
    description: raw.mission?.description ?? null,
    boosters: raw.rocket.launcher_stage.map((stage) => {
      const serial = stage.launcher?.serial_number ?? null;
      const landingLocation = stage.landing?.landing_location?.abbrev ?? null;
      return {
        serial: serial === null || serial.startsWith('Unknown') ? null : serial,
        landingAttempt: stage.landing?.attempt ?? null,
        landingLocation: landingLocation === 'N/A' ? null : landingLocation,
      };
    }),
    spacecraft: stages.find((stage) => stage.spacecraft)?.spacecraft?.name ?? null,
    crew: stages.flatMap((stage) => stage.launch_crew.map((member) => member.astronaut.name)),
    webcasts: raw.vid_urls.map((vid) => ({ title: vid.title, url: vid.url })),
  };
}
