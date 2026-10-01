# Handoff

## Current state

Steps 1-3 are merged and live. No blockers. Every 2 hours GitHub Actions fetches SpaceX launches (upcoming + last 30 days) from Launch Library 2, builds 4 ICS feeds and deploys them to https://launchcal.github.io/cal/{all,crewed,starship,no-starlink}.ics. Verified 2026-10-01: feeds serve 200 `text/calendar` with CRLF; Roman's Google account is subscribed to `all.ics` ("SpaceX launches" calendar) and all 14 events matched the feed. Not yet verified: that Google picks up a *changed* event on its next refresh (see Next steps 1). The site root is a placeholder page until step 5.

## Next steps

1. **Check the subscription update** (any time from 2026-10-02): read Roman's "SpaceX launches" calendar via the Google Calendar connector and compare with the live `all.ics`. Expect Crew-13 and Transporter 18 to show "Status: Success" and Starlink 15-23 (2026-09-02) to be gone. If they match, the fixed-DTSTAMP question is settled; record it here.
2. **Step 4, Google Calendar sync**: 4 native public Google Calendars updated via the Calendar API (service account), diff by launch id stored in an event extended property, create/update/delete, dry-run mode, reuse `src/event.ts` unchanged. Prereq (Roman, Claude writes the click path first): GCP project, Calendar API enabled, service account, JSON key as GitHub Actions secret, 4 public calendars shared with the service account. Verify on a test calendar first, then a real time change propagating within one run.
3. **Step 5, landing page**: SpaceX-inspired design (black, full-bleed NASA photo, D-DIN uppercase, outline buttons, no SpaceX assets), 4 "Add to Google Calendar" buttons + ICS links, disclaimer, Buy Me a Coffee. Prereq (Roman): Buy Me a Coffee account.
4. **Step 6, go-live**: README update (subscribe links), announce.

Roman picks the order of 1 and 2; 1 is a 2-minute check.

## Decisions (2026-10-01)

- Native public Google Calendars (fast updates) plus ICS mirror of the same data. 4 calendars: all, crewed, starship, no-starlink (ids are public URLs, never rename).
- Event rules: SEC/MIN/HR precision → 1 hour event at T-0, window in description; DAY → all-day; month or coarser → no event. Not-yet-go status → "(TBD)" suffix + TENTATIVE; flown (Success/Failure) → confirmed, "(Failure)" suffix kept. Crewed = crew listed or Crew Dragon. No-Starlink keeps Starship flights carrying Starlink. Events are TRANSP:TRANSPARENT (free).
- Generated data is never committed: `main` only accepts PRs, and a failed run leaves the last deploy live.
- Name launchcal; GitHub org `launchcal`, repo `launchcal/launchcal.github.io`, no bought domain. MIT for code; data credited to The Space Devs.

## Repo setup

- Ruleset "Protect main": PR required, code-owner (`@roma321m`) review, threads resolved, squash only, required check `test` (ci.yml), no force push/deletion. Roman merges via admin bypass checkbox; wait for CI green first, the bypass also skips CI.
- Secret scanning + push protection, Dependabot alerts + security PRs (version PRs off), private vulnerability reporting. Actions token read-only by default; fork PR runs need approval; never use `pull_request_target`. Actions pinned by commit SHA.
- Pages source: GitHub Actions (`build_type: workflow`); `github-pages` environment deploys from `main` only.
- Org: base permission none, 2FA required.

## How to run

- Local: `npm ci`, `npm run fetch` (live API, writes git-ignored `data/snapshot.json`), `npm run build` (writes git-ignored `site/cal/*.ics`), `npm test` (40 tests), `npm run typecheck`.
- Deploy: merge to `main`, or Actions → publish → Run workflow. Check: `gh run list --repo launchcal/launchcal.github.io --limit 3`.
- Every change goes branch → PR → CI green → Roman merges. Docs changes too.

## Traps

- LL2 dates are mostly vague (2026-10-01: of 133 upcoming, 49 year-only, 30 month-only, 14 decade, ~6 day-or-better). Vague `net` is a placeholder like `2026-12-31T00:00:00Z`; that is why coarse launches get no event.
- LL2 lists only ~1 Starlink launch ahead, so no-starlink differs little from all until close to launch.
- "Crewed" cannot use the crew list alone (Crew-15, Axiom 5 unassigned); `Human Exploration` includes uncrewed flights (Haven-1, HLS demo).
- LL2 placeholders (`Unknown F9`, `N/A` landing/orbit, `Heliocentric N/A`, null landing attempt) are normalised in `toLaunch`; null attempt means "landing TBD", not expended.
- `crewed`/`starship` feeds can legitimately be empty; `build` only refuses when `all` is empty. Unverified whether Google accepts an empty subscribed feed.
- Scheduled workflows in public repos stop after 60 days without repo activity. `publish.yml` re-enables itself each scheduled run; UNVERIFIED that this resets the timer. Check after 2026-12-01.
- LL2 rate limits per IP and runners share IPs: publish retries the fetch once after 90s. Watch the failure rate in the Actions tab.
- ICS feeds must keep CRLF. They are built on Linux in CI now; if feeds are ever committed again, Windows `autocrlf` will rewrite them (needs `*.ics -text`).
- Google refreshes subscribed ICS feeds only every ~12-24h; Pages caches 10 min. Step 4 exists because of this.
- The recent/upcoming merge in `src/fetch.ts` (upcoming wins by id) is untested script code; testing it needs a small extraction (ask Roman).
- Bash tool on this PC: backslashes in heredoc-fed Python and sed get mangled; use the Edit tool for code containing `\n` or regex escapes.

## Withdrawn claims

- FALSE (2026-10-01): "the Action commits snapshot and ICS to the repo and diffs against the previous snapshot". `main` only accepts PRs; nothing generated is committed, and Google sync will diff against Google itself. Do not resurrect.
- FALSE (2026-10-01): "buy a domain". GitHub org `launchcal` gives `launchcal.github.io` for free. Do not resurrect.
- FALSE (2026-10-01): "`actions/configure-pages` is needed". It 403s with a read-only token and a plain static site does not need it.
