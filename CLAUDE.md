# launchcal (SpaceX flight calendar)

Unofficial, self-updating public calendar of SpaceX launches that anyone can subscribe to
(Google Calendar first, ICS for Apple/Outlook), plus a one-page landing site.

## Stack and commands

Node 24 runs the TypeScript in `src/` directly (type stripping, no build). Imports use `.ts` extensions.
`tsc` is for type checking only. Tests use the built-in `node:test`.

- `npm run fetch`: fetch upcoming launches from Launch Library 2, write `data/snapshot.json`.
- `npm test`, `npm run typecheck`.

## Layout

- `src/launch.ts`: launchcal's own `Launch` model. `src/ll2.ts`: LL2 client and normaliser. `src/fetch.ts`: entry point.
- `test/fixtures/ll2-upcoming.json`: 5 real, unedited LL2 detailed records (recorded 2026-10-01).
- `data/snapshot.json`: committed state; sorted, no volatile fields, so it only changes on real changes.

## Known facts

- Data source: Launch Library 2 (`ll.thespacedevs.com/2.3.0/launches/upcoming/?lsp__name=SpaceX`).
  `mode=detailed` (about 4 MB per 100 launches) is needed for boosters, crew and webcasts.
  Free tier is rate limited; poll on a schedule, never per visitor.
- SpaceX publishes no official public API. The old r/SpaceX API (`api.spacexdata.com`) is unmaintained.

## Project rules

- Never imply the site is official SpaceX: "unofficial" in the footer, no SpaceX logo, assets or CSS.
- Landing page uses a SpaceX-inspired visual language only (black, D-DIN uppercase, outline buttons, NASA photos).
- Event identity = upstream launch id, so updates edit the same event instead of duplicating it.
