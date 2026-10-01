# Progress log

## 2026-10-01 (step 2)

- Snapshot now also holds SpaceX launches of the last 30 days (Roman's request), so flown launches stay in calendars.
- 4 calendars, event rules, hand-rolled ICS writer, `npm run build`. 40 tests; independent review found untested rules (HR precision, In Flight, CRLF escape, null window), fixed and mutation-checked. Build refuses to publish when `all` has no events; failed launches count as flown. Live: 141 launches → 14/1/1/10 events; parsed by Python icalendar; rebuild byte-identical.
- Google import check found and fixed: unknown landing shown as "expended", raw orbit codes (`PO`, `N/A`).

## 2026-10-01 (repo hardening)

- MIT license, README, CONTRIBUTING, SECURITY, Code of Conduct, CODEOWNERS, issue/PR templates. Repo, security, Actions settings and the "Protect main" ruleset applied via API; Roman set org base permission none and 2FA, and removed his conflicting older ruleset.

## 2026-10-01 (step 1)

- Fetch and normalise: LL2 client with paging and abort-on-failure guards, `Launch` model, `data/snapshot.json` (133 launches), atomic write, duplicate-id and timeout guards. 11 tests, all mutation-checked; independent review findings fixed (sort, atomic write, dedupe, null fallbacks). Live fetch run twice: identical snapshot.

## 2026-10-01 (later)

- Org `launchcal` created; repo transferred and renamed to `launchcal/launchcal.github.io` so Pages serves at `launchcal.github.io`.

- Decided: native Google calendars + ICS mirror, 4 calendars, name launchcal, public repo, GitHub org instead of a bought domain, SpaceX-inspired (not cloned) design.
- Public repo created: https://github.com/roma321m/launchcal. Roadmap of 6 steps written to HANDOFF.

## 2026-10-01

- Project folder created, git initialised. Planning phase started.
- Verified Launch Library 2 returns upcoming SpaceX launches (133 at the time) with status, NET precision, pad, mission type.
