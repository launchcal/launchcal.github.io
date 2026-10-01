import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CalendarEvent } from '../src/event.ts';
import { planSync, toGoogleEvent, type ExistingEvent } from '../src/gcal.ts';

const timed: CalendarEvent = {
  id: 'launch-a',
  title: '🚀 Falcon 9 · Crew-13',
  description: 'Status: Go',
  location: 'Space Launch Complex 40, Cape Canaveral SFS, FL, USA',
  url: 'https://www.youtube.com/watch?v=7ZiUbT1-djA',
  timed: true,
  start: '2026-10-01T15:10:06Z',
  end: '2026-10-01T16:10:06Z',
  confirmed: true,
};

const allDay: CalendarEvent = {
  ...timed,
  id: 'launch-b',
  title: '🚀 Falcon 9 · Crew-13 (TBD)',
  url: null,
  timed: false,
  start: '2026-10-14',
  end: '2026-10-15',
  confirmed: false,
};

const WINDOW_START = '2026-09-01T00:00:00Z';

function existing(launchId: string, hash: string, start: string, id = `g-${launchId}`): ExistingEvent {
  return { id, launchId, hash, start };
}

describe('toGoogleEvent', () => {
  it('writes a timed confirmed event in UTC with the webcast as source', () => {
    const event = toGoogleEvent(timed);

    assert.equal(event.summary, '🚀 Falcon 9 · Crew-13');
    assert.equal(event.description, 'Status: Go');
    assert.equal(event.location, 'Space Launch Complex 40, Cape Canaveral SFS, FL, USA');
    assert.deepEqual(event.start, { dateTime: '2026-10-01T15:10:06Z', timeZone: 'UTC' });
    assert.deepEqual(event.end, { dateTime: '2026-10-01T16:10:06Z', timeZone: 'UTC' });
    assert.equal(event.status, 'confirmed');
    assert.equal(event.transparency, 'transparent');
    assert.deepEqual(event.source, { title: 'Webcast', url: 'https://www.youtube.com/watch?v=7ZiUbT1-djA' });
    assert.equal(event.extendedProperties.private.launchcal, '1');
    assert.equal(event.extendedProperties.private.launchId, 'launch-a');
    assert.match(event.extendedProperties.private.hash, /^[0-9a-f]{16}$/);
  });

  it('writes an all-day tentative event without a source when there is no webcast', () => {
    const event = toGoogleEvent(allDay);

    assert.deepEqual(event.start, { date: '2026-10-14' });
    assert.deepEqual(event.end, { date: '2026-10-15' });
    assert.equal(event.status, 'tentative');
    assert.equal('source' in event, false);
  });

  it('gives the same event the same hash', () => {
    assert.equal(
      toGoogleEvent(timed).extendedProperties.private.hash,
      toGoogleEvent({ ...timed }).extendedProperties.private.hash,
    );
  });

  it('changes the hash when any written field changes', () => {
    const base = toGoogleEvent(timed).extendedProperties.private.hash;
    const changes: Partial<CalendarEvent>[] = [
      { title: '🚀 Falcon 9 · Crew-13 (Hold)' },
      { description: 'Status: Hold' },
      { location: 'Launch Complex 39A, Kennedy Space Center, FL, USA' },
      { url: null },
      { start: '2026-10-02T15:10:06Z' },
      { end: '2026-10-02T16:10:06Z' },
      { confirmed: false },
    ];

    for (const change of changes) {
      assert.notEqual(toGoogleEvent({ ...timed, ...change }).extendedProperties.private.hash, base, JSON.stringify(change));
    }
  });
});

describe('planSync', () => {
  const a = toGoogleEvent(timed);
  const b = toGoogleEvent(allDay);

  it('inserts launches Google does not have yet', () => {
    const plan = planSync([a, b], [], WINDOW_START);

    assert.deepEqual(plan.insert, [a, b]);
    assert.deepEqual(plan.update, []);
    assert.deepEqual(plan.delete, []);
  });

  it('leaves unchanged events alone', () => {
    const plan = planSync([a], [existing('launch-a', a.extendedProperties.private.hash, '2026-10-01T15:10:06Z')], WINDOW_START);

    assert.deepEqual(plan, { insert: [], update: [], delete: [] });
  });

  it('updates the same Google event when the hash differs', () => {
    const plan = planSync([a], [existing('launch-a', '0000000000000000', '2026-09-30T15:10:06Z')], WINDOW_START);

    assert.deepEqual(plan.insert, []);
    assert.deepEqual(plan.update, [{ id: 'g-launch-a', event: a }]);
    assert.deepEqual(plan.delete, []);
  });

  it('deletes events of launches gone from the snapshot window', () => {
    const gone = existing('launch-gone', '0000000000000000', '2026-12-31');

    const plan = planSync([a], [existing('launch-a', a.extendedProperties.private.hash, '2026-10-01T15:10:06Z'), gone], WINDOW_START);

    assert.deepEqual(plan.delete, [gone]);
  });

  it('deletes an event starting exactly at the window start', () => {
    const edge = existing('launch-edge', '0000000000000000', '2026-09-01');

    assert.deepEqual(planSync([], [edge], WINDOW_START).delete, [edge]);
  });

  it('keeps events older than the window as history', () => {
    const old = [existing('launch-old', '0000000000000000', '2026-08-31T23:59:59Z'), existing('launch-older', '0000000000000000', '2026-08-31')];

    assert.deepEqual(planSync([], old, WINDOW_START).delete, []);
  });

  it('deletes duplicate Google events of one launch and keeps the first', () => {
    const hash = a.extendedProperties.private.hash;
    const first = existing('launch-a', hash, '2026-10-01T15:10:06Z', 'g-1');
    const second = existing('launch-a', hash, '2026-10-01T15:10:06Z', 'g-2');

    const plan = planSync([a], [first, second], WINDOW_START);

    assert.deepEqual(plan.insert, []);
    assert.deepEqual(plan.update, []);
    assert.deepEqual(plan.delete, [second]);
  });

  it('deletes an old duplicate even though old events are otherwise kept', () => {
    const first = existing('launch-old', '0000000000000000', '2026-08-01', 'g-1');
    const second = existing('launch-old', '0000000000000000', '2026-08-01', 'g-2');

    assert.deepEqual(planSync([], [first, second], WINDOW_START).delete, [second]);
  });
});
