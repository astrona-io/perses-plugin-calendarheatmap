# Contributing

Thanks for helping. Bug reports, fixes and small focused features are welcome. For anything larger,
open an issue first so we can agree on the approach.

## Setup

- Node 24 or later, npm 11 or later
- [`percli`](https://github.com/perses/perses/releases/tag/v0.55.1) v0.55.1
- [`cue`](https://cuelang.org/docs/introduction/installation/) on `PATH` (v0.17.1 tested)

```bash
npm ci
```

## Build and check

```bash
npm run lint                 # ESLint
npm run type-check           # tsc
npm test                     # Jest
cue mod tidy --check         # cue.mod/module.cue lists only what the schema uses
percli plugin test-schemas   # schema, example and tests/valid, tests/invalid
npm run build                # module-federation bundle in dist/
percli plugin build          # writes CalendarHeatmap-<version>.tar.gz
```

CI runs all of them on every pull request. Please run them locally first.

`percli plugin build` uses `cue` to vendor `github.com/perses/shared/cue` into `cue.mod/pkg/`
(git-ignored) and into the archive. The dependency is declared in `cue.mod/module.cue`; keep its
version in step with the Perses version the plugin targets, and keep it used: an unused dependency
fails `cue mod tidy --check`.

## Tests

The calendar arithmetic (`calendar.ts`), the data model (`data.ts`), the formatters and link
templates have unit tests, and the panel and its settings editor have React Testing Library tests.
A change to how days, months, DST or downtime are computed needs a test that pins the new
behaviour; `src/test-utils/fixtures.ts` builds hourly range-query series.

## Try it in Perses

The quickest way is the `dev/` stack: see "Try it locally" in the README. It is also where the
README screenshots come from (`docs/screenshots/`, light and dark); retake them after a visible
change.

`npm run dev` serves the plugin for `percli plugin start` against a running Perses. To test the
packaged archive instead, put `CalendarHeatmap-<version>.tar.gz` in a directory listed in
`plugin.archive_paths` (see the README) and restart Perses.

## Releasing

1. Set the version in `package.json` and `package-lock.json` (`npm version <X.Y.Z> --no-git-tag-version`),
   and the `VERSION` default in `Containerfile`, move the `Unreleased` entries in `CHANGELOG.md`
   under it, and merge that to `main`.
2. Push a signed or annotated tag `v<X.Y.Z>` on that commit. A prerelease tag (`v<X.Y.Z>-rc.1`) works
   the same way and is published as a GitHub prerelease.
3. The `release` workflow checks that the tag matches `package.json`, builds
   `CalendarHeatmap-<version>.tar.gz` with `percli plugin build`, attaches it and its `.sha256` to the
   GitHub release, and pushes `ghcr.io/astrona-io/perses-plugin-calendarheatmap:<tag>` for
   linux/amd64 and linux/arm64, with build provenance attestations for both.
4. Write the release notes on the GitHub release: the workflow leaves them empty.

## Pull requests

- Keep each pull request to one change, and describe what you checked.
- Add a line to `CHANGELOG.md` under an `Unreleased` heading.
- Sign off your commits (`git commit -s`) to certify the
  [Developer Certificate of Origin](https://developercertificate.org/).

By contributing you agree that your contribution is licensed under Apache-2.0, as the project is.
