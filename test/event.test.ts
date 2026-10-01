import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { toEvent } from '../src/event.ts';
import { toLaunch, type RawLaunch } from '../src/ll2.ts';

const upcoming = (JSON.parse(readFileSync('test/fixtures/ll2-upcoming.json', 'utf8')) as { results: RawLaunch[] }).results;
const previous = (JSON.parse(readFileSync('test/fixtures/ll2-previous.json', 'utf8')) as { results: RawLaunch[] }).results;
const launch = (name: string) => toLaunch([...upcoming, ...previous].find((raw) => raw.name === name)!);

const FOOTER = 'Unofficial, not affiliated with SpaceX. Data: The Space Devs. https://launchcal.github.io';

describe('toEvent', () => {
  it('makes a one hour timed event from a launch known to the second', () => {
    const event = toEvent(launch('Falcon 9 Block 5 | Crew-13'))!;

    assert.equal(event.id, '18441371-8b2e-457c-afb5-1ec1b11ab630');
    assert.equal(event.title, '🚀 Falcon 9 · Crew-13');
    assert.equal(event.timed, true);
    assert.equal(event.start, '2026-10-01T15:10:06Z');
    assert.equal(event.end, '2026-10-01T16:10:06Z');
    assert.equal(event.confirmed, true);
    assert.equal(event.location, 'Space Launch Complex 40, Cape Canaveral SFS, FL, USA');
    assert.equal(event.url, 'https://www.youtube.com/watch?v=7ZiUbT1-djA');
    assert.ok(
      event.description.startsWith(
        [
          'Status: Go',
          'Booster: B1101, landing LZ-40',
          'Spacecraft: Crew Dragon Grace',
          'Crew: Jessica Watkins, Joshua Kutryk, Luke Delaney, Sergey Teteryatnikov',
          'Orbit: Low Earth Orbit',
          'Mission type: Human Exploration',
          'Webcast: https://www.youtube.com/watch?v=7ZiUbT1-djA',
          '',
          'SpaceX Crew-13 is the thirteenth crewed operational flight',
        ].join('\n'),
      ),
    );
    assert.ok(event.description.endsWith(`\n\n${FOOTER}`));
  });

  it('puts a multi-hour launch window in the description, not in the event length', () => {
    const event = toEvent(launch('Falcon 9 Block 5 | Starlink Group 15-25'))!;

    assert.equal(event.start, '2026-10-10T23:00:00Z');
    assert.equal(event.end, '2026-10-11T00:00:00Z');
    assert.ok(
      event.description.startsWith(
        'Status: Go\nWindow: 2026-10-10 23:00 to 2026-10-11 03:00 UTC\nBooster: B1088, landing OCISLY\nOrbit: Low Earth Orbit\n',
      ),
    );
  });

  it('keeps a launched flight confirmed without a status suffix', () => {
    const event = toEvent(launch('Starship | Starlink Group 31-1 (Starship Flight 14)'))!;

    assert.equal(event.title, '🚀 Starship · Starlink Group 31-1 (Starship Flight 14)');
    assert.equal(event.confirmed, true);
    assert.equal(event.start, '2026-09-28T12:48:59Z');
    assert.ok(event.description.startsWith('Status: Success\nWindow: 2026-09-28 12:15 to 2026-09-28 13:30 UTC\n'));
  });

  it('makes an all-day tentative event when only the day is known', () => {
    const dayOnly = { ...launch('Falcon 9 Block 5 | Crew-13'), netPrecision: 'DAY', net: '2026-10-14T00:00:00Z', status: 'TBD' };

    const event = toEvent(dayOnly)!;

    assert.equal(event.timed, false);
    assert.equal(event.start, '2026-10-14');
    assert.equal(event.end, '2026-10-15');
    assert.equal(event.title, '🚀 Falcon 9 · Crew-13 (TBD)');
    assert.equal(event.confirmed, false);
  });

  it('omits an unknown pad and lists unassigned boosters as TBD', () => {
    const griffin = { ...launch('Falcon Heavy | Griffin Mission One'), netPrecision: 'DAY' };
    const cygnus = { ...launch('Falcon 9 Block 5 | Cygnus CRS-2 NG-22'), netPrecision: 'DAY' };

    assert.ok(
      toEvent(griffin)!.description.includes(
        '\nBoosters: TBD, landing TBD; TBD, landing TBD; TBD, landing TBD\n',
      ),
    );
    assert.equal(toEvent(cygnus)!.location, 'Cape Canaveral SFS, FL, USA');
  });

  it('describes a booster that will not be recovered as expended', () => {
    const base = launch('Falcon 9 Block 5 | Starlink Group 15-25');
    const expended = { ...base, boosters: [{ serial: 'B1088', landingAttempt: false, landingLocation: null }] };

    assert.ok(toEvent(expended)!.description.includes('\nBooster: B1088, expended\n'));
  });

  it('describes a booster with an unknown landing plan as landing TBD, not expended', () => {
    const base = launch('Falcon 9 Block 5 | Starlink Group 15-25');
    const unknown = { ...base, boosters: [{ serial: null, landingAttempt: null, landingLocation: null }] };

    assert.ok(toEvent(unknown)!.description.includes('\nBooster: TBD, landing TBD\n'));
  });

  it('makes a timed event when the launch is known to the hour', () => {
    const hourOnly = { ...launch('Falcon 9 Block 5 | Crew-13'), netPrecision: 'HR', net: '2026-10-14T15:00:00Z' };

    const event = toEvent(hourOnly)!;

    assert.equal(event.timed, true);
    assert.equal(event.start, '2026-10-14T15:00:00Z');
  });

  it('keeps a launch in flight confirmed without a suffix', () => {
    const inFlight = { ...launch('Falcon 9 Block 5 | Crew-13'), status: 'In Flight' };

    const event = toEvent(inFlight)!;

    assert.equal(event.title, '🚀 Falcon 9 · Crew-13');
    assert.equal(event.confirmed, true);
  });

  it('marks a failed launch as flown but names the outcome in the title', () => {
    const failed = { ...launch('Falcon 9 Block 5 | Crew-13'), status: 'Failure' };

    const event = toEvent(failed)!;

    assert.equal(event.title, '🚀 Falcon 9 · Crew-13 (Failure)');
    assert.equal(event.confirmed, true);
  });

  it('leaves out the window line when the window end is unknown', () => {
    const noWindow = { ...launch('Falcon 9 Block 5 | Starlink Group 15-25'), windowEnd: null };

    assert.ok(toEvent(noWindow)!.description.startsWith('Status: Go\nBooster: B1088'));
  });

  it('skips launches known only to the month, quarter or year', () => {
    assert.equal(toEvent(launch('Falcon Heavy | Griffin Mission One')), null);
    assert.equal(toEvent(launch('Starship | Flight 15')), null);
    assert.equal(toEvent(launch('Falcon 9 Block 5 | Cygnus CRS-2 NG-22')), null);
  });
});
