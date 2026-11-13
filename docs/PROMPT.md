You are a senior TypeScript/React (and, where needed, Go/CUE) engineer and Perses contributor. Build the Perses plugin described below in this repository (`perses-plugin-calendarheatmap`). Work autonomously: plan, build, test, document. Open a PR when it's done.

---

# Part 1: What to build. Calendar heatmap (SLA view)

**Repo:** `astrona-io/perses-plugin-calendarheatmap`
**Plugin kind(s):** Panel: `CalendarHeatmapChart`
**Focus area:** SLA
**Concept page:** https://claude.ai/artifact/KcToRbDWESkuMgDtPBrBvE#calendarheatmap (a private page; the owner can share it with you. Everything you need from it is in this prompt and in `docs/mockup.png`.)

## What it should look like
See `docs/mockup.png` in the repo. If it isn't there, ask for it. It's a concept sketch: match the idea and information density, not the exact pixels.

## Why
SLAs are agreed per calendar month, but Perses time ranges are rolling. A calendar grid matches how customers and managers read an SLA report: each month is a calendar, each day a square coloured by availability, and the month's total sits next to the target. The same panel also covers "deploys per day" or "incidents per day" in the GitHub-contributions style.

## Data it reads
- **Availability mode:** a 0..1 (or 0..100) availability series, e.g. `avg_over_time(probe_success{instance="api"}[1d])`, or an SLO error ratio from Pyrra/Sloth recording rules (availability = 1 − error ratio).
- **Count mode:** any query reduced per day (sum / max / mean), e.g. `increase(deploys_total[1d])`.
- Optional: a second query or link template for incidents, used on breach days. An SLO datasource and incident datasource will come later; keep this generic.

## Spec (options → CUE schema)
- `mode`: `availability` | `count`
- `target`: e.g. 99.9 (availability mode)
- `warnBelow`: e.g. 99.95 (days between target and this are "close")
- `layout`: `months` (side by side, default) | `year` (one long strip)
- `weekStart`: `monday` (default) | `sunday`
- `timezone`: dashboard default or explicit
- `dayLink`: link template; default action sets the dashboard time range to that day
- `colorScale` for count mode (sequential, theme-aware, 5 steps)

## Behaviour
- Each month shows its total availability next to the target, coloured met/breached, plus "SLA met" or "Breached · N min down".
- Days: green meets target, amber close, red breach. **Breach days also get a "!" marker** so it works without colour. Days with no data are grey, never green.
- Hover a day: availability, downtime minutes, and incident link if configured.
- Click a day: zoom the dashboard to that day (so the statetimeline panel shows what happened), or open `dayLink`.

## Acceptance criteria
- **Month totals are computed from the raw data for the month, not by averaging daily percentages.** Unit-test with days of different sample counts.
- Correct across DST changes, month boundaries and year boundaries, in the configured timezone.
- Downtime minutes = (1 − availability) × minutes in the period, and it's tested.
- Up to 12 months render cleanly. Demo dashboards in `dev/` for availability mode and count mode.

## The plugin family this belongs to
This repo is part of the `astrona-io` Perses plugin set. Already built (read them before you start, and match their structure, tooling, CI and README style):
`perses-plugin-oat-results`, `perses-plugin-sankey`, `perses-plugin-statetimeline`, `perses-plugin-honeycomb`, `perses-plugin-geomap`, `perses-plugin-servicegraph`, all under https://github.com/astrona-io.
Use the same Perses version pin as those repos unless there's a newer stable release, then note it in `docs/DECISIONS.md`.

---

# Part 2: How to build it (Perses plugin guide)

You are building a **Perses plugin** in this repository. Perses is the CNCF
dashboard project (https://github.com/perses/perses). Its core plugins live in
https://github.com/perses/plugins.


## Ground rules

1. **Copy upstream conventions; don't invent your own.** Before writing code, clone
   `perses/plugins` next to this repo and read 2–3 plugins close to this one.
   Panels: `timeserieschart`, `statushistorychart`, `heatmapchart`, `table`.
   Datasources: `prometheus`, `tempo`, `victorialogs`.
   Match their folder layout, `package.json` (including the `perses` section),
   the CUE schema layout, and the rsbuild / module-federation config.
2. **Scaffold with percli. Never hand-build the directory structure.** Install
   `percli` from the Perses GitHub releases (or `brew install perses/tap/percli`).
   Then check the real flags with `percli plugin --help` and
   `percli plugin generate --help`. Flags change between releases, so don't
   trust memory or this file over `--help`.
   - `percli plugin generate …` scaffolds the module or plugin
   - `percli plugin start` runs it against a local Perses dev server
   - `percli plugin test-schemas` validates the CUE schemas and JSON examples
   - `percli plugin build` produces the distributable archive
3. **Use the latest stable Perses release.** Pin `@perses-dev/*` package versions
   to the release you develop against. Write that release in the README.
4. **Use the shared building blocks:**
   - `@perses-dev/plugin-system` for plugin types and hooks (`useDataQueries`,
     time range, variables)
   - `@perses-dev/components` for UI pieces, legends, tooltips and the ECharts wrapper
   - `@perses-dev/core` for value formatting, units and thresholds
   - Reuse the shared CUE types (`common.#format`, `common.#thresholds`, …) in schemas
5. **Theme-aware only.** No hard-coded colours. Use the MUI theme and the Perses
   chart theme so light and dark mode both work.
6. **Accessibility.** Status must never be shown by colour alone. Use icon,
   label or pattern too. Everything clickable must be reachable by keyboard.
7. **Performance.** Stay smooth at the "large" size named in Part 1.
   Memoise transforms. Don't re-render on hover.
8. **Licence.** Apache-2.0, same as Perses. Only add dependencies with
   compatible licences. Prefer libraries already used upstream (ECharts, MUI).
9. **Stay upstreamable.** Write it so it could be offered to `perses/plugins`
   later: same code style, lint config, tests and docs format. Before you start,
   search `perses/plugins` issues and PRs for this plugin. If someone is already
   building it, stop and report that.

## Local dev environment

Add a `dev/` folder with a `docker-compose.yaml` that starts:
- Perses (official image)
- the data backend this plugin needs (usually Prometheus)
- a **fake-data generator** that emits the metrics, logs or API responses in
  Part 1, with realistic labels and some failure cases

Also provision a demo dashboard that uses the plugin (`dev/dashboards/*.json`),
so `docker compose up` followed by `percli plugin start` shows it working.

## Definition of done

- [ ] Scaffolded with `percli`. Layout matches upstream plugins.
- [ ] CUE schema plus at least one JSON example. `percli plugin test-schemas` passes.
- [ ] Grafana migration (`migrate/` CUE) if Part 1 names a Grafana equivalent.
- [ ] Panel options editor for every option in the spec, with sensible defaults.
- [ ] Unit tests (Jest + React Testing Library) for data transforms and rendering.
      Cover the empty state, error state and large-data cases.
- [ ] Works in light and dark theme. Includes screenshots of both in `docs/`.
- [ ] `percli plugin build` produces an archive. CI builds it on every PR.
- [ ] A GitHub Actions release workflow attaches the archive to a GitHub release on `v*` tags.
- [ ] README covers what it does, install, the data it expects, the options, a screenshot,
      and the Perses version it was tested with.
- [ ] Every acceptance criterion in Part 1 is checked off in the PR description.

## Working style

- Plan first. Write `docs/PLAN.md` covering the data model, component tree,
  schema and open questions before writing code.
- Use small commits with conventional messages (`feat:`, `fix:`, `docs:`, `test:`).
- If something in Part 1 is unclear or seems wrong, record your decision in
  `docs/DECISIONS.md` and keep going. Don't stop for the sake of it.
