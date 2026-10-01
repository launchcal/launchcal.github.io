import { createSign } from 'node:crypto';
import type { ExistingEvent, GoogleEvent } from './gcal.ts';

/** The fields launchcal reads from a service account JSON key. */
export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const API = 'https://www.googleapis.com/calendar/v3';

/** Signs the RS256 assertion a service account exchanges for an access token (valid one hour). */
export function signJwt(key: ServiceAccountKey, now: Date): string {
  const iat = Math.floor(now.getTime() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 })).toString(
    'base64url',
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key.private_key, 'base64url');
  return `${header}.${claims}.${signature}`;
}

export async function accessToken(key: ServiceAccountKey): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(key, new Date()) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Google token exchange returned HTTP ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Lists every event launchcal wrote to the calendar, across all pages. */
export async function listEvents(token: string, calendarId: string): Promise<ExistingEvent[]> {
  const events: ExistingEvent[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ privateExtendedProperty: 'launchcal=1', maxResults: '2500' });
    if (pageToken) params.set('pageToken', pageToken);
    const page = (await call(token, 'GET', `${eventsPath(calendarId)}?${params}`)) as {
      items: (GoogleEvent & { id: string; start: { dateTime?: string; date?: string } })[];
      nextPageToken?: string;
    };
    for (const item of page.items) {
      const { launchId, hash } = item.extendedProperties.private;
      events.push({ id: item.id, launchId, hash, start: item.start.dateTime ?? item.start.date! });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}

export async function insertEvent(token: string, calendarId: string, event: GoogleEvent): Promise<void> {
  await call(token, 'POST', eventsPath(calendarId), event);
}

export async function updateEvent(token: string, calendarId: string, id: string, event: GoogleEvent): Promise<void> {
  await call(token, 'PUT', `${eventsPath(calendarId)}/${encodeURIComponent(id)}`, event);
}

export async function deleteEvent(token: string, calendarId: string, id: string): Promise<void> {
  await call(token, 'DELETE', `${eventsPath(calendarId)}/${encodeURIComponent(id)}`);
}

function eventsPath(calendarId: string): string {
  return `${API}/calendars/${encodeURIComponent(calendarId)}/events`;
}

/** Throws with Google's error text on any non-2xx, so a sync run stops at the first failure. */
async function call(token: string, method: string, url: string, body?: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Google Calendar ${method} ${url} returned HTTP ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
