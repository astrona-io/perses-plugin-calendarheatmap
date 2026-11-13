# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-13

### Added

- `CalendarHeatmapChart` panel: a time range as calendar months, one square per day.
- Availability mode: days coloured against `target` and `warnBelow`, breach days marked "!", no-data
  days grey; month totals pooled from the raw samples, with "SLA met" or "Breached · N min down".
  `valueType` reads error ratios; percent input is detected.
- Count mode: a five-step theme scale (`colorScale`), reduced per day and month with `reduce`.
- `months` and `year` layouts, `weekStart`, `timezone` (DST-correct day and month boundaries), up
  to 12 months.
- Click a day to zoom the dashboard to it, or open `dayLink`; tooltips with downtime and incidents
  from a second query (`incidents.label`, `incidents.link`).
- A `dev/` stack with a backfilled year of SLA history and two demo dashboards, and screenshots in
  the README taken from it.
