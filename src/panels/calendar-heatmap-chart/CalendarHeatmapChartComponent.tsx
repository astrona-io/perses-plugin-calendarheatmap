import { ReactElement, useCallback, useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { formatValue, useTimeZone } from "@perses-dev/components";
import { useAllVariableValues, useTimeRange } from "@perses-dev/plugin-system";
import { resolveTimeZone } from "./calendar";
import {
  CalendarHeatmapChartProps,
  DEFAULT_COLOR_SCALE,
  DEFAULT_LAYOUT,
  DEFAULT_REDUCE,
  DEFAULT_WEEK_START,
} from "./calendar-heatmap-chart-types";
import { resolveColours } from "./colours";
import { buildCalendarModel } from "./data";
import { DayContext } from "./DayCell";
import { formatPercent, percentDecimals } from "./format";
import { monthsLayout, yearLayout } from "./layout";
import { MonthCalendar } from "./MonthCalendar";
import { weekColumns, YearStrip } from "./YearStrip";

export function CalendarHeatmapChartComponent(
  props: CalendarHeatmapChartProps,
): ReactElement {
  const { queryResults, spec, contentDimensions } = props;
  const theme = useTheme();
  const { timeZone: dashboardTimeZone } = useTimeZone();
  const { absoluteTimeRange, setTimeRange } = useTimeRange();
  const variables = useAllVariableValues();

  const timeZone = resolveTimeZone(spec.timezone, dashboardTimeZone);
  const from = absoluteTimeRange.start.getTime();
  const to = absoluteTimeRange.end.getTime();
  const layout = spec.layout ?? DEFAULT_LAYOUT;
  const weekStart = spec.weekStart ?? DEFAULT_WEEK_START;
  const reduce = spec.reduce ?? DEFAULT_REDUCE;
  const colorScale = spec.colorScale ?? DEFAULT_COLOR_SCALE;

  const queryData = useMemo(
    () => queryResults.map((r) => r.data),
    [queryResults],
  );
  const model = useMemo(
    () =>
      buildCalendarModel(queryData, {
        mode: spec.mode,
        valueType: spec.valueType,
        target: spec.target,
        warnBelow: spec.warnBelow,
        reduce,
        timeZone,
        from,
        to,
        incidentLabel: spec.incidents?.label,
      }),
    [
      queryData,
      spec.mode,
      spec.valueType,
      spec.target,
      spec.warnBelow,
      spec.incidents?.label,
      reduce,
      timeZone,
      from,
      to,
    ],
  );

  const colours = useMemo(
    () => resolveColours(theme, colorScale),
    [theme, colorScale],
  );
  const onZoom = useCallback(
    (start: number, end: number) =>
      setTimeRange({ start: new Date(start), end: new Date(end) }),
    [setTimeRange],
  );
  const decimals = percentDecimals(model.target, model.warnBelow);
  const ctx: DayContext = useMemo(
    () => ({
      mode: model.mode,
      decimals,
      target: model.target,
      warnBelow: model.warnBelow,
      format: spec.format,
      dayLink: spec.dayLink,
      incidents: spec.incidents,
      hasIncidentQuery: queryResults.length > 1,
      colours,
      variables,
      onZoom,
    }),
    [
      model.mode,
      model.target,
      model.warnBelow,
      decimals,
      spec.format,
      spec.dayLink,
      spec.incidents,
      queryResults.length,
      colours,
      variables,
      onZoom,
    ],
  );

  const width = contentDimensions?.width ?? 800;
  const height = contentDimensions?.height ?? 300;
  const cells = useMemo(
    () =>
      layout === "year"
        ? yearLayout(width, height, weekColumns(model.months, weekStart))
        : monthsLayout(width, height, model.months.length),
    [layout, width, height, model.months, weekStart],
  );

  if (model.status !== "ok") {
    return (
      <Box
        sx={{
          height,
          width,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          p: 2,
          gap: 0.5,
        }}
      >
        {model.status === "bad-timezone" ? (
          <Typography variant="body2" color="error" role="alert">
            Unknown time zone “{timeZone}”. Use an IANA name such as
            Europe/Berlin, UTC or local.
          </Typography>
        ) : (
          <>
            <Typography variant="body2">No data</Typography>
            <Typography variant="caption" color="text.secondary">
              The query returned no samples in this time range.
            </Typography>
          </>
        )}
      </Box>
    );
  }

  const fontSize = Math.max(9, Math.round(cells.cellSize * 0.55));

  return (
    <Box
      sx={{
        height,
        width,
        display: "flex",
        flexDirection: "column",
        color: "text.primary",
        fontSize: "0.8125rem",
        "& .ch-body": {
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        },
        "& .ch-months": {
          display: "grid",
          gridTemplateColumns: `repeat(${cells.columns}, max-content)`,
          columnGap: "24px",
          rowGap: "12px",
        },
        "& .ch-month-head": {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontWeight: 600,
          lineHeight: "22px",
          gap: 1,
          whiteSpace: "nowrap",
        },
        "& .ch-month-total": { fontVariantNumeric: "tabular-nums" },
        "& .ch-grid": {
          display: "grid",
          alignItems: "center",
          justifyContent: "start",
        },
        "& .ch-weekday": {
          color: "text.secondary",
          fontSize: "0.6875rem",
          textAlign: "center",
          textDecoration: "none",
          lineHeight: "16px",
          whiteSpace: "nowrap",
        },
        "& .ch-year-month": { textAlign: "left" },
        "& .ch-day": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: cells.cellSize,
          height: cells.cellSize,
          boxSizing: "border-box",
          border: 0,
          p: 0,
          m: 0,
          borderRadius: `${Math.max(1, Math.round(cells.cellSize * 0.2))}px`,
          fontFamily: "inherit",
          fontSize,
          fontWeight: 800,
          lineHeight: 1,
          textDecoration: "none",
          cursor: "pointer",
        },
        "& span.ch-day": { cursor: "default" },
        "& .ch-day.ch-outside": {
          outline: `1px dashed ${theme.palette.divider}`,
          outlineOffset: -1,
        },
        "& button.ch-day:hover, & a.ch-day:hover": {
          outline: `1px solid ${theme.palette.text.primary}`,
        },
        "& .ch-day:focus-visible": {
          outline: `2px solid ${colours.focus}`,
          outlineOffset: 1,
        },
        "& .ch-verdict": { lineHeight: "22px", mt: 0.5, whiteSpace: "nowrap" },
        "& .ch-year-totals": {
          display: "flex",
          flexWrap: "wrap",
          columnGap: 2,
          rowGap: 0.25,
          listStyle: "none",
          m: 0,
          mt: 1,
          p: 0,
          fontSize: "0.75rem",
        },
        "& .ch-legend": {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 1.5,
          rowGap: 0.25,
          listStyle: "none",
          m: 0,
          p: 0,
          pt: 0.75,
          color: "text.secondary",
          fontSize: "0.75rem",
        },
        "& .ch-legend li": {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
        },
        "& .ch-swatch": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 12,
          height: 12,
          borderRadius: "3px",
          fontSize: 9,
          fontWeight: 800,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          columnGap: 2,
          pb: 0.75,
          color: "text.secondary",
          fontSize: "0.75rem",
        }}
      >
        <span>
          {model.hiddenMonths > 0
            ? `Last ${model.months.length} of ${model.months.length + model.hiddenMonths} months`
            : `${model.months.length} month${model.months.length === 1 ? "" : "s"}`}{" "}
          · {model.timeZone}
        </span>
        {model.mode === "availability" && (
          <span>target {model.target}% per month</span>
        )}
      </Box>
      <div className="ch-body">
        {layout === "year" ? (
          <YearStrip
            months={model.months}
            ctx={ctx}
            weekStart={weekStart}
            reduce={reduce}
            cellSize={cells.cellSize}
            gap={cells.gap}
          />
        ) : (
          <div className="ch-months">
            {model.months.map((month) => (
              <MonthCalendar
                key={month.key}
                month={month}
                ctx={ctx}
                weekStart={weekStart}
                reduce={reduce}
                cellSize={cells.cellSize}
                gap={cells.gap}
              />
            ))}
          </div>
        )}
      </div>
      <Legend ctx={ctx} maxDayValue={model.maxDayValue} decimals={decimals} />
    </Box>
  );
}

function Legend({
  ctx,
  maxDayValue,
  decimals,
}: {
  ctx: DayContext;
  maxDayValue: number;
  decimals: number;
}): ReactElement {
  const { colours } = ctx;
  if (ctx.mode === "count") {
    return (
      <ul className="ch-legend" aria-label="Legend">
        <li>
          <span>0</span>
          {colours.scale.map((colour, i) => (
            <span
              key={i}
              className="ch-swatch"
              style={{ backgroundColor: colour }}
              aria-hidden="true"
            />
          ))}
          <span>{formatValue(maxDayValue, ctx.format)}</span>
        </li>
        <li>
          <span
            className="ch-swatch"
            style={{ backgroundColor: colours.fill["no-data"] }}
            aria-hidden="true"
          />
          no data
        </li>
      </ul>
    );
  }
  const target = formatPercent(ctx.target / 100, decimals);
  const warn = formatPercent(ctx.warnBelow / 100, decimals);
  const items = [
    { status: "ok" as const, label: `≥ ${warn}`, marker: "" },
    ...(ctx.warnBelow > ctx.target
      ? [{ status: "close" as const, label: `${target} – ${warn}`, marker: "" }]
      : []),
    { status: "breach" as const, label: `< ${target} breach (!)`, marker: "!" },
    { status: "no-data" as const, label: "no data", marker: "" },
  ];
  return (
    <ul className="ch-legend" aria-label="Legend">
      {items.map((item) => (
        <li key={item.status}>
          <span
            className="ch-swatch"
            style={{
              backgroundColor: colours.fill[item.status],
              color: colours.onFill[item.status],
            }}
            aria-hidden="true"
          >
            {item.marker}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
