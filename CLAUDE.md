# launchcal (SpaceX flight calendar)

Unofficial, self-updating public calendar of SpaceX launches that anyone can subscribe to
(Google Calendar first, ICS for Apple/Outlook), plus a one-page landing site.

## Status

Planning phase. No stack chosen, no code yet. See `docs/HANDOFF.md` for the open decisions.

## Known facts

- Data source candidate: Launch Library 2 (`ll.thespacedevs.com/2.3.0/launches/upcoming/?lsp__name=SpaceX`).
  Verified 2026-10-01: returns `net`, `net_precision`, `status.abbrev`, `pad`, `mission.type`, `last_updated`.
  Free tier is rate limited; poll on a schedule, never per visitor.
- SpaceX publishes no official public API. The old r/SpaceX API (`api.spacexdata.com`) is unmaintained.

## Project rules

- Never imply the site is official SpaceX: "unofficial" in the title, no SpaceX logo.
- Event identity = upstream launch id, so updates edit the same event instead of duplicating it.
