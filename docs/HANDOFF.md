# Handoff

## Current state

Planning. Folder, git, docs and public GitHub repo. No code yet.

## Proposed architecture (not yet agreed)

1. Scheduled job (GitHub Actions cron, every 1-2h) fetches upcoming SpaceX launches from Launch Library 2.
2. Diff against the previous snapshot, keyed by LL2 launch id.
3. Write changes to public Google Calendar(s) via Calendar API (service account), and regenerate `.ics` feeds.
4. Static landing page (GitHub Pages): description, "Add to Google Calendar" button, ICS/webcal link, Buy Me a Coffee link.

## Decisions (2026-10-01)

- Native public Google Calendars (Calendar API, service account) plus an ICS mirror of the same data.
- Four calendars: All, Crewed, Starship, Everything except Starlink.
- Public name: launchcal. Public GitHub repo `roma321m/launchcal`.

## How to run

Nothing to run yet.

## Traps

- Launch times change hours before liftoff (scrubs). A once-a-day poll is too slow.
- LL2 free tier is rate limited; one scheduled fetch, never per visitor.
