# Plan

## Data model

The panel reads `TimeSeriesData` from up to two queries, at a one-hour step.

1. **Value query** (first): availability (0..1 or 0..100, or an error ratio) or a count.
2. **Incident query** (optional, second): a series per incident; a sample above 0 marks that day.

`buildCalendarModel(queryData, options)` in `data.ts` turns them into a `CalendarModel`:

- `months[]` (at most 12, the last ones): label, `samples`, pooled `value`, `coveredMinutes`,
  `downtimeMinutes`, `met`, and `days[]`.
- Each `DayModel`: local date and weekday, `start`/`end` (epoch ms, from the zone), `minutes`
  (23, 24 or 25 hours), `coveredMinutes`, `samples`, `sum`, `max`, `value`, `status`
  (`ok` | `close` | `breach` | `no-data` | `outside` | `value`), `level` (count mode),
  `downtimeMinutes`, `incidents[]`.
- `status` of the model: `ok`, `no-data` or `bad-timezone`, plus `hiddenMonths`.

Calendar arithmetic lives in `calendar.ts` (zone resolution, local dates, start of a local day,
months in a range, weekday columns, bucket lookup); helpers in `format.ts` (percent, downtime) and
`links.ts` (template interpolation, safe hrefs); theme colours in `colours.ts`.

## Component tree

```
CalendarHeatmapChartComponent       time range, variables, zone; memoised model; states; legend
├── MonthCalendar (layout: months)  one grid per month, header with total and verdict
│   └── DayCell                     button / link / outside span, opaque tooltip
└── YearStrip (layout: year)        one grid of week columns, month labels, totals list
    └── DayCell
CalendarHeatmapChartSettingsEditor  every option, with defaults
```

The model is memoised on the query data, options, range and zone; hover is handled by MUI's
tooltip inside each memoised `DayCell`, so hovering does not re-render the panel.

## Schema

`schemas/panels/calendar-heatmap-chart/calendar-heatmap-chart.cue`: `mode` required, everything else
optional and closed (`valueType`, `target`, `warnBelow`, `layout`, `weekStart`, `timezone`,
`dayLink`, `colorScale`, `reduce`, `format: common.#format`, `incidents: {label?, link?}`). Valid and
invalid cases under `tests/`, checked by `percli plugin test-schemas`.

## Tests

- `calendar.test.ts`: zones, DST days in Europe/Berlin and America/New_York, month and year
  rollover, leap years, weekdays, months in a range across a year end and in Pacific/Auckland.
- `data.test.ts`: step inference, percent detection, downtime arithmetic, pooled month totals with
  uneven sample counts, statuses, range clipping, DST sample counts and downtime, year boundary,
  incidents, the 12-month cap, a full year, count reducers.
- `format.test.ts`, `links.test.ts`.
- Component tests: empty and bad-zone states, breach markers and accessible names, pooled totals,
  click-to-zoom, `dayLink`, year layout at 365 days, the month cap, count legend, incident tooltip;
  the settings editor.

## Open questions (resolved in DECISIONS.md)

- How partial months are judged (covered minutes).
- What a 1 y range shows (13 calendar months, capped at 12).
- Which time zone applies when none is set (the dashboard's).
