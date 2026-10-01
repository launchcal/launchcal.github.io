# launchcal

An unofficial, self-updating calendar of upcoming SpaceX launches. Subscribe once and every
reschedule, scrub and new launch shows up in your calendar automatically.

**Not affiliated with, endorsed by, or connected to SpaceX.**

> Work in progress. The subscribe links and website at https://launchcal.github.io are not live yet.

## How it works

A scheduled GitHub Actions job fetches upcoming launches, compares them with the last snapshot
and updates public Google Calendars plus `.ics` feeds for Apple Calendar and Outlook.

## Development

Requires Node 24 or newer.

```bash
npm ci
npm test
npm run typecheck
npm run fetch   # calls the live API, writes data/snapshot.json
```

## Data

Launch data comes from [Launch Library 2](https://thespacedevs.com/llapi) by The Space Devs.
The data is theirs and is subject to their terms; the MIT license below covers launchcal's code only.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues privately, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
