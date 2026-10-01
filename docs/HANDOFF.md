# Handoff

## Current state

Steps 1 and 2 done (step 2 on branch `feat/ics`): snapshot of upcoming + last 30 days, 4 ICS feeds in `site/cal/`. Repo at https://github.com/launchcal/launchcal.github.io.

## Architecture

1. GitHub Actions cron (every 2h) fetches upcoming SpaceX launches from Launch Library 2.
2. Diff against the previous `snapshot.json` (committed in the repo), keyed by LL2 launch id.
3. Write changes to 4 public Google Calendars via Calendar API (service account) and regenerate 4 `.ics` mirrors.
4. Static landing page on GitHub Pages at `launchcal.github.io` (GitHub org `launchcal`, no bought domain).

Stack: Node 24 + TypeScript run directly (no build step), `googleapis`, plain static HTML for the site.

## Decisions (2026-10-01)

- Native public Google Calendars (Calendar API, service account) plus an ICS mirror of the same data.
- Four calendars: All, Crewed, Starship, Everything except Starlink.
- Public name: launchcal. Public GitHub repo `launchcal/launchcal.github.io` (org `launchcal`; repo name gives Pages at the root `launchcal.github.io`).
- Landing page: SpaceX-inspired visual language (black, full-bleed photo, D-DIN uppercase, outline buttons). No SpaceX logo, assets or CSS. Photos from NASA (public domain); verify licence of any SpaceX Flickr image before use.

## Repo setup (2026-10-01)

- Ruleset "Protect main": no deletion/force push, PR required, 1 code-owner approval (CODEOWNERS `* @roma321m`), threads resolved, squash only. Bypass: repo admin and org admin, PR merges only.
- Squash merge only, auto-delete branches. Secret scanning + push protection, Dependabot alerts + security updates (version updates off), private vulnerability reporting.
- Actions: default token read-only, cannot approve PRs; fork PR runs need approval. Never use `pull_request_target`.
- Org `launchcal`: base permission none, 2FA required.

## Roadmap (one branch + PR per step)

1. Fetch and normalise: LL2 client, internal launch model, `snapshot.json`, tests on recorded responses. Done: sane local JSON.
2. Classify and generate ICS: 4 categories, date precision rules, event text, 4 `.ics`. Done: validator passes, imports into a throwaway Google calendar.
3. Scheduled pipeline + Pages: Action every 2h, commit only on change. Done: Roman subscribes by ICS URL and sees launches.
4. Google Calendar sync: diff by launch id (event extended property), create/update/delete, dry-run. Done: test calendar first, then a real time change propagates. Prereq (Roman): GCP project, Calendar API, service account key in GitHub secret, 4 public calendars shared with it.
5. Landing page: description, 4 subscribe buttons + ICS links, disclaimer, Buy Me a Coffee. Done: phone width OK, every button correct. Prereq (Roman): Buy Me a Coffee account.
6. Go-live: enable Pages at `launchcal.github.io`, README.

Event rules (step 2): SEC/MIN/HR precision → 1 hour timed event at T-0, window in the description; DAY → all-day; month or coarser → no event. Status other than Go/In Flight/Success → title suffix and TENTATIVE. Crewed = crew listed or Crew Dragon. No-Starlink keeps Starship flights carrying Starlink.

Next step: 3.

## How to run

`npm ci`, then `npm run fetch` (writes `data/snapshot.json`), `npm run build` (writes `site/cal/*.ics`), `npm test`, `npm run typecheck`.

## Traps

- LL2 vague dates are the norm: on 2026-10-01, 40 of 100 launches were year-only, 27 month-only, 5 day-or-better. Vague `net` is a placeholder like `2026-12-31T00:00:00Z`.
- LL2 lists only about 1 Starlink launch ahead (they are announced late), so the "no Starlink" calendar differs little from "All" until close to launch.
- "Crewed" cannot rely on the crew list alone: Axiom 5 and Crew-15 have no crew assigned yet. Haven-1 and the Starship HLS demo are `Human Exploration` but uncrewed.
- LL2 placeholders (`Unknown F9` serial, `N/A` landing, `N/A` orbit, unknown landing attempt) are mapped to null in `toLaunch`.
- `crewed`/`starship` feeds can legitimately have zero events (e.g. no crewed flight within 30 days with a day-precise date). `build` only refuses when `all` is empty. Check in step 3 that Google accepts an empty subscribed feed.
- The recent/upcoming merge in `src/fetch.ts` (upcoming wins by id) and its abort path are untested top-level script code; covering them needs a small extraction (ask Roman first).
- ICS `DTSTAMP` is a fixed constant so feeds only change on real changes. Verify in step 3 that a real subscription picks up an edited event.
- 2026-10-01: `all.ics` imported into Roman's throwaway Google calendar "launchcal test" and checked via the Calendar connector: all 14 events, times, all-day and tentative handling correct. Delete that calendar when done with it.
- Launch times change hours before liftoff (scrubs). A once-a-day poll is too slow.
- LL2 free tier is rate limited; one scheduled fetch, never per visitor.
- A failed or suspiciously empty fetch must abort without writing, or one outage wipes every subscriber's calendar. Needs its own test.
