import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CALENDARS } from '../src/calendars.ts';
import { toLaunch, type RawLaunch } from '../src/ll2.ts';

const upcoming = (JSON.parse(readFileSync('test/fixtures/ll2-upcoming.json', 'utf8')) as { results: RawLaunch[] }).results;
const previous = (JSON.parse(readFileSync('test/fixtures/ll2-previous.json', 'utf8')) as { results: RawLaunch[] }).results;
const launches = [...upcoming, ...previous].map(toLaunch);
const calendar = (id: string) => CALENDARS.find((def) => def.id === id)!;
const members = (id: string) => launches.filter(calendar(id).includes).map((launch) => launch.name);

describe('CALENDARS', () => {
  it('publishes the four calendars under fixed ids', () => {
    assert.deepEqual(
      CALENDARS.map((def) => def.id),
      ['all', 'crewed', 'starship', 'no-starlink'],
    );
  });

  it('all includes every launch', () => {
    assert.equal(members('all').length, 6);
  });

  it('crewed includes Crew Dragon flights before the crew is named, and any flight with a crew', () => {
    const crew13 = launches.find((launch) => launch.name === 'Crew-13')!;
    const unnamedCrew = { ...crew13, crew: [], spacecraft: 'Crew Dragon' };
    const uncrewedHumanExploration = { ...crew13, crew: [], spacecraft: null, missionType: 'Human Exploration' };
    const crewedStarship = { ...crew13, rocket: 'Starship', spacecraft: null };

    assert.deepEqual(members('crewed'), ['Crew-13']);
    assert.equal(calendar('crewed').includes(unnamedCrew), true);
    assert.equal(calendar('crewed').includes(uncrewedHumanExploration), false);
    assert.equal(calendar('crewed').includes(crewedStarship), true);
  });

  it('starship includes only Starship flights', () => {
    assert.deepEqual(members('starship'), ['Flight 15', 'Starlink Group 31-1 (Starship Flight 14)']);
  });

  it('no-starlink drops Falcon Starlink flights but keeps Starship flights carrying Starlink', () => {
    assert.deepEqual(members('no-starlink'), [
      'Crew-13',
      'Griffin Mission One',
      'Flight 15',
      'Cygnus CRS-2 NG-22',
      'Starlink Group 31-1 (Starship Flight 14)',
    ]);
  });

  it('no-starlink keeps a mission that only mentions Starlink later in its name', () => {
    const crew13 = launches.find((launch) => launch.name === 'Crew-13')!;

    assert.equal(calendar('no-starlink').includes({ ...crew13, name: 'Bandwagon-5 with Starlink rideshare' }), true);
  });
});
