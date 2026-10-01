# Contributing

Thanks for helping. launchcal is maintained by one person, so small focused changes are reviewed fastest.

## Before you start

- **Wrong launch data** (time, pad, booster): launchcal mirrors Launch Library 2. Report it to
  [The Space Devs](https://thespacedevs.com/) so every consumer gets the fix.
- **Bugs and ideas:** open an issue first, so we agree on the approach before you write code.
- **Security issues:** never in a public issue, see [SECURITY.md](SECURITY.md).

## Pull requests

1. Fork the repo and branch off `main`.
2. Keep it to one logical change and **one commit** (amend and force-push your branch for follow-ups).
3. Add or update tests. `npm test` and `npm run typecheck` must pass.
4. Do not commit credentials, `.env` files or service-account keys.
5. Do not add dependencies or change the Node version without discussing it in an issue first.

Every pull request needs the maintainer's review. PRs are squash-merged.
Workflows on PRs from first-time contributors run only after maintainer approval.

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE)
and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
