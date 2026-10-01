import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, it, mock } from 'node:test';
import { listEvents, signJwt } from '../src/google.ts';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = {
  client_email: 'launchcal-sync@launchcal.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};

describe('signJwt', () => {
  const jwt = signJwt(key, new Date('2026-10-01T12:00:00Z'));
  const [header, claims, signature] = jwt.split('.');

  it('builds an RS256 header and the service account claims', () => {
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'RS256', typ: 'JWT' });
    assert.deepEqual(JSON.parse(Buffer.from(claims, 'base64url').toString()), {
      iss: 'launchcal-sync@launchcal.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1790856000,
      exp: 1790859600,
    });
  });

  it('signs header and claims with the private key', () => {
    const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`);

    assert.equal(verifier.verify(publicKey, signature, 'base64url'), true);
  });

  it('uses base64url without padding', () => {
    assert.match(jwt, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });
});

describe('listEvents', () => {
  function item(id: string, launchId: string, start: { dateTime?: string; date?: string }) {
    return { id, start, extendedProperties: { private: { launchcal: '1', launchId, hash: `hash-${launchId}` } } };
  }

  it('follows page tokens, filters to launchcal events and reads timed and all-day starts', async () => {
    const urls: string[] = [];
    const pages = [
      { items: [item('g-1', 'launch-a', { dateTime: '2026-10-05T11:16:00+03:00' })], nextPageToken: 'page-2' },
      { items: [item('g-2', 'launch-b', { date: '2028-07-05' })] },
    ];
    const fetchMock = mock.method(globalThis, 'fetch', async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify(pages[urls.length - 1]));
    });

    try {
      const events = await listEvents('token', 'cal@group.calendar.google.com');

      assert.deepEqual(events, [
        { id: 'g-1', launchId: 'launch-a', hash: 'hash-launch-a', start: '2026-10-05T11:16:00+03:00' },
        { id: 'g-2', launchId: 'launch-b', hash: 'hash-launch-b', start: '2028-07-05' },
      ]);
      assert.deepEqual(urls, [
        'https://www.googleapis.com/calendar/v3/calendars/cal%40group.calendar.google.com/events?privateExtendedProperty=launchcal%3D1&maxResults=2500',
        'https://www.googleapis.com/calendar/v3/calendars/cal%40group.calendar.google.com/events?privateExtendedProperty=launchcal%3D1&maxResults=2500&pageToken=page-2',
      ]);
    } finally {
      fetchMock.mock.restore();
    }
  });

  it('throws with the Google error text on a non-2xx response', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('{"error":"forbidden"}', { status: 403 }));

    try {
      await assert.rejects(listEvents('token', 'cal'), /HTTP 403: \{"error":"forbidden"\}/);
    } finally {
      fetchMock.mock.restore();
    }
  });
});
