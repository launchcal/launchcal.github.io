# Handoff

## Current state

Steps 1-4 are merged. Blocker for CI only: the first publish run after merging PR #6 (2026-10-01 15:11 UTC) failed in `build` because Launch Library 2 was not responding (fetch timed out twice; curl from Roman's PC also hung). Last good Pages deploy stays live. The 4 native Google Calendars were filled by a local `npm run sync` instead (14/1/1/10 events, re-run 0 changes) and are public: Google's anonymous `public/basic.ics` returns 200 with full details for all four. CI sync is UNVERIFIED until a publish run reaches the `sync` job.

## Next steps

1. **Confirm the first CI sync**: `gh run list --repo launchcal/launchcal.github.io --workflow publish.yml --limit 3`; once a run passes `build`, its `sync` log should show only real changes (mostly 0). If LL2 is still down for many hours, nothing breaks, the calendars just go stale.
2. **Delete the local key and the test calendar** once (1) is green: `%USERPROFILE%\.launchcal\sa.json`, the copy in Downloads (`launchcal-510314-*.json`), and the `launchcal test` calendar. Keep a key only if local syncs are still wanted.
3. **Check the ICS subscription update** (from 2026-10-02): compare Roman's subscribed "SpaceX launches" (ICS) calendar with live `all.ics`; expect Crew-13 and Transporter 18 "Status: Success" and Starlink 15-23 gone.
4. **Step 5, landing page**: SpaceX-inspired design (black, full-bleed NASA photo, D-DIN uppercase, outline buttons, no SpaceX assets), 4 "Add to Google Calendar" buttons (`https://calendar.google.com/calendar/u/0/r?cid=<googleId>` from `src/calendars.ts`) + ICS links, disclaimer, Buy Me a Coffee. Prereq (Roman): Buy Me a Coffee account.
5. **Step 6, go-live**: README update (subscribe links), announce.

Roman picks the order; 1-3 are short checks.

## Decisions (2026-10-01)

- Native public Google Calendars (fast updates) plus ICS mirror of the same data. 4 calendars: all, crewed, starship, no-starlink (ids are public URLs, never rename).
- Event rules: SEC/MIN/HR precision → 1 hour event at T-0, window in description; DAY → all-day; month or coarser → no event. Not-yet-go status → "(TBD)" suffix + TENTATIVE; flown (Success/Failure) → confirmed, "(Failure)" suffix kept. Crewed = crew listed or Crew Dragon. No-Starlink keeps Starship flights carrying Starlink. Events are TRANSP:TRANSPARENT (free).
- Generated data is never committed: `main` only accepts PRs, and a failed run leaves the last deploy live.
- Google sync (2026-10-01): service account `launchcal-sync@launchcal-510314.iam.gserviceaccount.com` in GCP project `launchcal-510314` (no billing account), shared on each calendar as "Make changes and see all event details". Events older than the snapshot window are kept in Google as history; ICS drops them. Google calendar ids live in `src/calendars.ts` and are public; never change them.
- Name launchcal; GitHub org `launchcal`, repo `launchcal/launchcal.github.io`, no bought domain. MIT for code; data credited to The Space Devs.

## Repo setup

- Ruleset "Protect main": PR required, code-owner (`@roma321m`) review, threads resolved, squash only, required check `test` (ci.yml), no force push/deletion. Roman merges via admin bypass checkbox; wait for CI green first, the bypass also skips CI.
- Secret scanning + push protection, Dependabot alerts + security PRs (version PRs off), private vulnerability reporting. Actions token read-only by default; fork PR runs need approval; never use `pull_request_target`. Actions pinned by commit SHA.
- Pages source: GitHub Actions (`build_type: workflow`); `github-pages` environment deploys from `main` only.
- Environment `google-calendar`: deployment branches `main` only, secret `GOOGLE_SERVICE_ACCOUNT_KEY` (service account JSON). Only the `sync` job uses it.
- Org: base permission none, 2FA required.

## How to run

- Local: `npm ci`, `npm run fetch` (live API, writes git-ignored `data/snapshot.json`), `npm run build` (writes git-ignored `site/cal/*.ics`), `npm test` (57 tests), `npm run typecheck`.
- Google sync: `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=$USERPROFILE/.launchcal/sa.json npm run sync -- --dry-run` (reads only). Test a single calendar elsewhere with `-- --calendar all=<googleCalendarId>`. Without a key file, local sync is impossible; CI has the key.
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
- Google sync deletes by the event's *stored* start: a flown launch whose net is later moved to before the 30-day window gets deleted instead of kept as history. Rare; accepted.
- Google sync has no retry: a rate limit or 5xx aborts the run mid-way (later calendars skipped). The next run converges because the diff is against Google itself.
- Google lists event starts in the calendar's timezone (`+03:00`), not UTC; comparisons use `Date.parse`, never string compare.
- Only events with private property `launchcal=1` are touched; anything added by hand to the public calendars stays forever.
- LL2 can be fully down (2026-10-01 ~15:10 UTC: no response at all). Then `build` fails, nothing deploys or syncs, last state stays live.
- The recent/upcoming merge in `src/fetch.ts` (upcoming wins by id) is untested script code; testing it needs a small extraction (ask Roman).
- Bash tool on this PC: backslashes in heredoc-fed Python and sed get mangled; use the Edit tool for code containing `\n` or regex escapes.

## Withdrawn claims

- FALSE (2026-10-01): "the Action commits snapshot and ICS to the repo and diffs against the previous snapshot". `main` only accepts PRs; nothing generated is committed, and Google sync will diff against Google itself. Do not resurrect.
- FALSE (2026-10-01): "buy a domain". GitHub org `launchcal` gives `launchcal.github.io` for free. Do not resurrect.
- FALSE (2026-10-01): "`actions/configure-pages` is needed". It 403s with a read-only token and a plain static site does not need it.
