import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fetchRecent, fetchUpcoming, recentUrl, toLaunch, UPCOMING_URL, type RawLaunch } from '../src/ll2.ts';

const fixture = JSON.parse(readFileSync('test/fixtures/ll2-upcoming.json', 'utf8')) as { results: RawLaunch[] };
const launch = (name: string) => toLaunch(fixture.results.find((raw) => raw.name === name)!);

function fakeFetch(pages: Record<string, Response>): typeof fetch {
  return async (input) => pages[String(input)] ?? new Response('unexpected url', { status: 404 });
}

const page = (count: number, next: string | null, results: RawLaunch[]) =>
  new Response(JSON.stringify({ count, next, results }));

describe('toLaunch', () => {
  it('maps a crewed launch with booster, landing, spacecraft and crew', () => {
    const crew13 = launch('Falcon 9 Block 5 | Crew-13');

    assert.equal(crew13.id, '18441371-8b2e-457c-afb5-1ec1b11ab630');
    assert.equal(crew13.name, 'Crew-13');
    assert.equal(crew13.rocket, 'Falcon 9');
    assert.equal(crew13.net, '2026-10-01T15:10:06Z');
    assert.equal(crew13.netPrecision, 'SEC');
    assert.equal(crew13.status, 'Go');
    assert.equal(crew13.pad, 'Space Launch Complex 40');
    assert.equal(crew13.location, 'Cape Canaveral SFS, FL, USA');
    assert.equal(crew13.missionType, 'Human Exploration');
    assert.equal(crew13.orbit, 'Low Earth Orbit');
    assert.match(crew13.description!, /^SpaceX Crew-13 is the thirteenth crewed operational flight/);
    assert.deepEqual(crew13.boosters, [{ serial: 'B1101', landingAttempt: true, landingLocation: 'LZ-40' }]);
    assert.equal(crew13.spacecraft, 'Crew Dragon Grace');
    assert.deepEqual(crew13.crew, ['Jessica Watkins', 'Joshua Kutryk', 'Luke Delaney', 'Sergey Teteryatnikov']);
    assert.equal(crew13.webcasts.length, 6);
    assert.deepEqual(crew13.webcasts[0], {
      title: "NASA's SpaceX Crew-13 Launch",
      url: 'https://www.youtube.com/watch?v=7ZiUbT1-djA',
    });
  });

  it('keeps the launch window when it spans several hours', () => {
    const starlink = launch('Falcon 9 Block 5 | Starlink Group 15-25');

    assert.equal(starlink.windowStart, '2026-10-10T23:00:00Z');
    assert.equal(starlink.windowEnd, '2026-10-11T03:00:00Z');
    assert.equal(starlink.netPrecision, 'MIN');
    assert.equal(starlink.location, 'Vandenberg SFB, CA, USA');
    assert.deepEqual(starlink.boosters, [{ serial: 'B1088', landingAttempt: true, landingLocation: 'OCISLY' }]);
    assert.equal(starlink.spacecraft, null);
    assert.deepEqual(starlink.crew, []);
  });

  it('nulls placeholder booster serials and landing zones so they never reach event text', () => {
    const griffin = launch('Falcon Heavy | Griffin Mission One');

    assert.equal(griffin.rocket, 'Falcon Heavy');
    assert.equal(griffin.netPrecision, 'M');
    assert.equal(griffin.status, 'TBD');
    assert.deepEqual(griffin.boosters, [
      { serial: null, landingAttempt: true, landingLocation: null },
      { serial: null, landingAttempt: true, landingLocation: null },
      { serial: null, landingAttempt: true, landingLocation: null },
    ]);
  });

  it('maps a launch with no stages and only quarter precision', () => {
    const starship = launch('Starship | Flight 15');

    assert.equal(starship.rocket, 'Starship');
    assert.equal(starship.name, 'Flight 15');
    assert.equal(starship.netPrecision, 'Q4');
    assert.equal(starship.missionType, 'Test Flight');
    assert.equal(starship.location, 'SpaceX Starbase, TX, USA');
    assert.deepEqual(starship.boosters, []);
    assert.deepEqual(starship.webcasts, []);
  });

  it('keeps year precision for a launch scheduled only to the year', () => {
    const cygnus = launch('Falcon 9 Block 5 | Cygnus CRS-2 NG-22');

    assert.equal(cygnus.netPrecision, 'Y');
    assert.equal(cygnus.net, '2026-12-31T00:00:00Z');
    assert.equal(cygnus.missionType, 'Resupply');
  });

  it('drops an unknown orbit instead of showing N/A', () => {
    const base = fixture.results.find((raw) => raw.name === 'Falcon 9 Block 5 | Crew-13')!;
    const unknownOrbit: RawLaunch = { ...base, mission: { ...base.mission!, orbit: { abbrev: 'N/A', name: 'Unknown' } } };

    assert.equal(toLaunch(unknownOrbit).orbit, null);
  });

  it('trims the N/A suffix from a partly known orbit', () => {
    const base = fixture.results.find((raw) => raw.name === 'Falcon 9 Block 5 | Crew-13')!;
    const helio: RawLaunch = { ...base, mission: { ...base.mission!, orbit: { abbrev: 'Helio-N/A', name: 'Heliocentric N/A' } } };

    assert.equal(toLaunch(helio).orbit, 'Heliocentric');
  });

  it('falls back when optional sections are missing', () => {
    const base = fixture.results.find((raw) => raw.name === 'Falcon 9 Block 5 | Crew-13')!;
    const sparse: RawLaunch = {
      ...base,
      net: '2026-10-01T15:10:06Z',
      window_start: '2026-10-01T15:00:00Z',
      net_precision: null,
      mission: null,
      rocket: {
        ...base.rocket,
        launcher_stage: [{ launcher: null, landing: null }],
        spacecraft_stage: [],
      },
    };

    const sparseLaunch = toLaunch(sparse);

    assert.equal(sparseLaunch.name, 'Falcon 9 Block 5 | Crew-13');
    assert.equal(sparseLaunch.net, '2026-10-01T15:10:06Z');
    assert.equal(sparseLaunch.windowStart, '2026-10-01T15:00:00Z');
    assert.equal(sparseLaunch.netPrecision, 'Y');
    assert.equal(sparseLaunch.missionType, null);
    assert.equal(sparseLaunch.orbit, null);
    assert.equal(sparseLaunch.description, null);
    assert.deepEqual(sparseLaunch.boosters, [{ serial: null, landingAttempt: null, landingLocation: null }]);
    assert.equal(sparseLaunch.spacecraft, null);
    assert.deepEqual(sparseLaunch.crew, []);
  });
});

describe('fetchUpcoming', () => {
  it('follows the next link until every page is collected', async () => {
    const next = 'https://example.test/page2';
    const [first, ...rest] = fixture.results;

    const launches = await fetchUpcoming(
      fakeFetch({ [UPCOMING_URL]: page(5, next, [first]), [next]: page(5, null, rest) }),
    );

    assert.deepEqual(
      launches.map((raw) => raw.id),
      [
        '18441371-8b2e-457c-afb5-1ec1b11ab630',
        '97c6f5e1-299e-4652-b72d-9618ac047076',
        'd3bd7fb2-fac6-49fc-ae52-cee07d2fde67',
        '0f867f0c-5422-4d44-93b8-d7faaae7019b',
        '4d3943e9-c894-46c4-a318-84d526d0ef40',
      ],
    );
  });

  it('throws on an HTTP error so no snapshot is written', async () => {
    const failing = fakeFetch({ [UPCOMING_URL]: new Response('busy', { status: 503 }) });

    await assert.rejects(fetchUpcoming(failing), /HTTP 503/);
  });

  it('throws on an empty result so an outage cannot wipe the calendar', async () => {
    const empty = fakeFetch({ [UPCOMING_URL]: page(0, null, []) });

    await assert.rejects(fetchUpcoming(empty), /no upcoming launches/);
  });

  it('throws when paging returns fewer launches than the reported count', async () => {
    const short = fakeFetch({ [UPCOMING_URL]: page(133, null, fixture.results) });

    await assert.rejects(fetchUpcoming(short), /returned 5 launches, expected 133/);
  });

  it('throws when paging returns the same launch twice', async () => {
    const next = 'https://example.test/page2';
    const [first, second] = fixture.results;

    const shifted = fakeFetch({ [UPCOMING_URL]: page(3, next, [first, second]), [next]: page(3, null, [second]) });

    await assert.rejects(fetchUpcoming(shifted), /returned a launch twice/);
  });
});

describe('fetchRecent', () => {
  const now = new Date('2026-10-01T15:00:00Z');

  it('asks for previous launches since midnight UTC 30 days ago', () => {
    assert.equal(
      recentUrl(now),
      'https://ll.thespacedevs.com/2.3.0/launches/previous/?lsp__name=SpaceX&limit=100&mode=detailed&net__gte=2026-09-01T00:00:00Z',
    );
  });

  it('accepts an empty result, since a month without launches is possible', async () => {
    const empty = fakeFetch({ [recentUrl(now)]: page(0, null, []) });

    assert.deepEqual(await fetchRecent(now, empty), []);
  });
});
