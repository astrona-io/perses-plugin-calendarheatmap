# Decisions

Choices made where the spec (`docs/PROMPT.md`) left room, and why.

## Versions

- Perses 0.55.1 (`@perses-dev/*` 0.55.1, `percli` v0.55.1), the same pin as the newest sibling
  plugins and the latest stable release at the time of writing.
- No Grafana migration (`migrate/`): Part 1 names no Grafana equivalent, and Grafana has no core
  calendar heatmap panel to migrate from.
- No upstream overlap: `perses/plugins` has no calendar or SLA calendar panel, and no open issue or
  pull request for one.

## How the numbers are computed

- **Month totals are pooled from the raw samples**: sum of every sample in the month divided by the
  number of samples. They are never the mean of the daily percentages, so a day with fewer samples
  (a gap, a 23-hour DST day, a partly covered day) weighs less. Several series in the first query
  are pooled the same way.
- **Day and month boundaries** come from `date-fns-tz` in the resolved time zone: the panel's
  `timezone`, else the dashboard's, else the browser's. `UTC` and `local` are accepted. A zone that
  is not a valid IANA name shows an error state instead of guessing. DST days are 23 or 25 hours
  long and their downtime is computed over those minutes.
- **Hourly step**: the panel sets `queryOptions.suggestedStepMs` to one hour. Day boundaries then
  fall on sample windows in every whole-hour zone, the downtime resolution is fine enough for a
  99.9 % target, and a full year (8,760 points) stays under Prometheus' 11,000 points per series.
  Users write the query over `[1h]`; Prometheus 3 range selectors are left-open, so
  `sum_over_time(x[1h])` with a 1 h step counts each raw sample once.
- **Midpoint assignment**: a range-query sample at `t` summarises `(t − step, t]`, so it is put on
  the day of `t − step / 2`. The 00:00 sample covers the last hour of the day before and lands there.
  The step is inferred per series from the smallest gap between samples.
- **Downtime** = (1 − availability) × minutes, where minutes are the minutes of the day or month
  that the time range covers (clipped to the range). A month the range covers in full counts all its
  minutes; the current month and a month cut by the range start count only the covered part. That is
  why the current month can read "Breached · 26 min down" with a total below target: it is judged on
  the minutes so far, as an SLA report generated today would be.
- **Percent input**: an availability series with any value above 1 is read as percent (0..100).
  `valueType: errorRatio` reads the value as 1 − availability (Pyrra and Sloth error ratios).
- **Thresholds**: a day is `breach` below `target`, `close` at or above `target` but below
  `warnBelow`, `ok` otherwise, with a 1e-9 tolerance for float noise. A `warnBelow` under the target
  would make "close" unreachable, so it is clamped up to the target.
- **Count mode** reduces per day and per month with `reduce` (`sum`, `max`, `mean`); the month
  total uses the same reducer over the month's raw samples. The five colour steps are: zero (a faint
  tint, so it never looks like no data), then quarters of the highest day in view.

## What the panel shows

- **12-month cap**: up to 12 months are drawn. A longer range shows the last 12 and says
  "Last 12 of N months". A one-year range usually touches 13 calendar months, so a 1 y range shows
  this note too.
- **Outside days**: days of a shown month that the range does not reach keep their grid place, with
  a dashed outline and no fill, so a month always reads as a calendar. They are not focusable.
- **No-data days** inside the range are grey, never green; in count mode they are grey too, distinct
  from zero.
- **Colours** are theme palette keys only: `success`, `warning`, `error` for availability, and
  `colorScale` (a palette key: `success`, `info`, `primary`, `warning`, `error`) for count mode, with
  alpha steps of the palette's main colour. Light and dark follow the Perses theme.
- **Accessibility**: breach days carry "!"; each day is a `<button>` (or an `<a>` with `dayLink`)
  with an accessible name that states the date, value, status and downtime; outside days are
  `role="img"`. The legend names every colour. The tooltip is opaque and uses the paper colour, so
  it stays readable over the cells.
- **Click**: zooms the dashboard to the day with `setTimeRange`, unless `dayLink` is set; then the
  day is a link. Links are interpolated (`${day}`, `${from}`, `${to}`, `${incident}`, URL-encoded),
  then dashboard variables are replaced by Perses. Only `http(s)` and relative links are rendered.

## Extras beyond the spec

- `valueType` (availability or error ratio) with percent auto-detection.
- `reduce` for count mode.
- `incidents`: a second query marks incident days (any sample above 0); `incidents.label` names the
  incident from a series label, `incidents.link` is a link template. Without a second query the link
  template is shown on breach days.
- `format` (`common.#format`) for count-mode values.

## Dev stack

- The history is backfilled with `promtool tsdb create-blocks-from openmetrics` on the first start
  (with `--max-block-duration=720h`, so a year is a handful of blocks), from a seeded `awk`
  generator. The panel needs months of data, which a live fake exporter cannot provide; the seed
  keeps the screenshots reproducible. Retention is 450 days.
- Compose project `perses-plugin-calendarheatmap`; Perses on `127.0.0.1:18085` by default
  (`PERSES_PORT`); Prometheus is not published.
