import { mkdir, rename, writeFile } from 'node:fs/promises';
import { fetchUpcoming, toLaunch } from './ll2.ts';

const SNAPSHOT_PATH = 'data/snapshot.json';

const launches = (await fetchUpcoming())
  .map(toLaunch)
  .sort((a, b) => (a.net === b.net ? (a.id < b.id ? -1 : 1) : a.net < b.net ? -1 : 1));

await mkdir('data', { recursive: true });
await writeFile(`${SNAPSHOT_PATH}.tmp`, JSON.stringify(launches, null, 2) + '\n');
await rename(`${SNAPSHOT_PATH}.tmp`, SNAPSHOT_PATH);
console.log(`Wrote ${launches.length} launches to ${SNAPSHOT_PATH}`);
