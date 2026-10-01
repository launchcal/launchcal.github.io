import { mkdir, rename, writeFile } from 'node:fs/promises';
import type { Launch } from './launch.ts';
import { fetchRecent, fetchUpcoming, toLaunch } from './ll2.ts';

const SNAPSHOT_PATH = 'data/snapshot.json';

const recent = await fetchRecent(new Date());
const upcoming = await fetchUpcoming();

const byId = new Map<string, Launch>();
for (const raw of [...recent, ...upcoming]) byId.set(raw.id, toLaunch(raw));
const launches = [...byId.values()].sort((a, b) =>
  a.net === b.net ? (a.id < b.id ? -1 : 1) : a.net < b.net ? -1 : 1,
);

await mkdir('data', { recursive: true });
await writeFile(`${SNAPSHOT_PATH}.tmp`, JSON.stringify(launches, null, 2) + '\n');
await rename(`${SNAPSHOT_PATH}.tmp`, SNAPSHOT_PATH);
console.log(`Wrote ${launches.length} launches (${recent.length} recent, ${upcoming.length} upcoming) to ${SNAPSHOT_PATH}`);
