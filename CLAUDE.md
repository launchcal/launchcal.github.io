# launchcal (SpaceX flight calendar)

Unofficial, self-updating public calendar of SpaceX launches that anyone can subscribe to
(Google Calendar first, ICS for Apple/Outlook), plus a one-page landing site.

## Stack and commands

Node 24 runs the TypeScript in `src/` directly (type stripping, no build). Imports use `.ts` extensions.
`tsc` is for type checking only. Tests use the built-in `node:test`.

- `npm run fetch`: fetch upcoming launches and those of the last 30 days from Launch Library 2, write `data/snapshot.json`.
- `npm run build`: render `data/snapshot.json` into `site/cal/{all,crewed,starship,no-starlink}.ics`, `site/index.html` (from `src/page.html`) and `site/next.json`.
- `npm run sync [-- --dry-run] [-- --calendar all=<googleCalendarId>]`: sync `data/snapshot.json` into the Google calendars. Key from env `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON) or `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` (locally `%USERPROFILE%\.launchcal\sa.json`, never in the repo).
- `npm test`, `npm run typecheck`.

## Layout

- `src/launch.ts`: launchcal's own `Launch` model. `src/ll2.ts`: LL2 client and normaliser. `src/fetch.ts`: fetch entry point.
- `src/calendars.ts`: the 4 calendars and their filters (ids are public URLs, never rename). `src/event.ts`: format-neutral event text and timing, shared by ICS and the Google sync. `src/ics.ts`: RFC 5545 writer. `src/build.ts`: build entry point.
- `src/gcal.ts`: Google event mapping and the insert/update/delete plan (launch id + hash in private extended properties; events older than the snapshot window are kept). `src/google.ts`: service account JWT and Calendar API calls. `src/sync.ts`: sync entry point.
- `src/page.ts` + `src/page.html`: landing page cards (Google add link, webcal, ICS) and `next.json`. Static, committed: `site/style.css`, `site/app.js` (countdown, copy), `site/fonts/` (D-DIN, OFL), `site/img/` (NASA public domain), `site/favicon.svg`. Preview: `launchcal-site` in the workspace-root `.claude/launch.json` (port 4173, serves `site/`).
- `test/fixtures/ll2-upcoming.json` (5) and `ll2-previous.json` (1): real, unedited LL2 detailed records (recorded 2026-10-01).
- `data/snapshot.json`, `site/cal/*.ics`, `site/index.html`, `site/next.json`: generated, git-ignored. `site/` is deployed to Pages by `.github/workflows/publish.yml` (every 2h, on push to main, manual); its `sync` job runs `npm run sync` in the `google-calendar` environment (secret `GOOGLE_SERVICE_ACCOUNT_KEY`).
- `.github/workflows/ci.yml`: typecheck + tests, required check on `main`. Actions are pinned by commit SHA.

## Known facts

- Data source: Launch Library 2 (`ll.thespacedevs.com/2.3.0/launches/upcoming/?lsp__name=SpaceX`).
  `mode=detailed` (about 4 MB per 100 launches) is needed for boosters, crew and webcasts.
  Free tier is rate limited; poll on a schedule, never per visitor.
- SpaceX publishes no official public API. The old r/SpaceX API (`api.spacexdata.com`) is unmaintained.

## Project rules

- `main` is protected by the "Protect main" ruleset: PR only, squash only, code-owner review; Roman merges via admin bypass. Direct pushes fail.
- MIT licensed. Launch data belongs to The Space Devs; credit them, never relicense it.
- Never imply the site is official SpaceX: "unofficial" in the footer, no SpaceX logo, assets or CSS.
- Landing page uses a SpaceX-inspired visual language only (black, D-DIN uppercase, outline buttons, NASA photos).
- Event identity = upstream launch id, so updates edit the same event instead of duplicating it.
