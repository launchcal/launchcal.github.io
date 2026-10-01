# Handoff

## Current state

Planning. Folder, git, docs and public GitHub repo. No code yet.

## Architecture

1. GitHub Actions cron (every 2h) fetches upcoming SpaceX launches from Launch Library 2.
2. Diff against the previous `snapshot.json` (committed in the repo), keyed by LL2 launch id.
3. Write changes to 4 public Google Calendars via Calendar API (service account) and regenerate 4 `.ics` mirrors.
4. Static landing page on GitHub Pages at `launchcal.github.io` (GitHub org `launchcal`, no bought domain).

Stack: Node 24 + TypeScript run directly (no build step), `googleapis`, plain static HTML for the site.

## Decisions (2026-10-01)

- Native public Google Calendars (Calendar API, service account) plus an ICS mirror of the same data.
- Four calendars: All, Crewed, Starship, Everything except Starlink.
- Public name: launchcal. Public GitHub repo, moving from `roma321m/launchcal` to org `launchcal` (Roman creating the org).
- Landing page: SpaceX-inspired visual language (black, full-bleed photo, D-DIN uppercase, outline buttons). No SpaceX logo, assets or CSS. Photos from NASA (public domain); verify licence of any SpaceX Flickr image before use.

## Roadmap (one branch + PR per step)

1. Fetch and normalise: LL2 client, internal launch model, `snapshot.json`, tests on recorded responses. Done: sane local JSON.
2. Classify and generate ICS: 4 categories, date precision rules, event text, 4 `.ics`. Done: validator passes, imports into a throwaway Google calendar.
3. Scheduled pipeline + Pages: Action every 2h, commit only on change. Done: Roman subscribes by ICS URL and sees launches.
4. Google Calendar sync: diff by launch id (event extended property), create/update/delete, dry-run. Done: test calendar first, then a real time change propagates. Prereq (Roman): GCP project, Calendar API, service account key in GitHub secret, 4 public calendars shared with it.
5. Landing page: description, 4 subscribe buttons + ICS links, disclaimer, Buy Me a Coffee. Done: phone width OK, every button correct. Prereq (Roman): Buy Me a Coffee account.
6. Go-live: transfer repo to `launchcal` org, Pages at `launchcal.github.io`, README.

Next step: 1.

## How to run

Nothing to run yet.

## Traps

- Launch times change hours before liftoff (scrubs). A once-a-day poll is too slow.
- LL2 free tier is rate limited; one scheduled fetch, never per visitor.
- A failed or suspiciously empty fetch must abort without writing, or one outage wipes every subscriber's calendar. Needs its own test.
