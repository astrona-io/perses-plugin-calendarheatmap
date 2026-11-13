import type { FormatOptions } from "@perses-dev/components";
import type { OptionsEditorProps, PanelProps } from "@perses-dev/plugin-system";
import type { TimeSeriesData } from "@perses-dev/spec";

export type QueryData = TimeSeriesData;

export type CalendarHeatmapChartProps = PanelProps<
  CalendarHeatmapChartOptions,
  QueryData
>;

export type CalendarHeatmapChartEditorProps =
  OptionsEditorProps<CalendarHeatmapChartOptions>;

/** `availability`: a 0..1 (or 0..100) ratio per sample. `count`: any number, reduced per day. */
export type CalendarMode = "availability" | "count";

/** How availability-mode values are read: as availability, or as an error ratio (1 − availability). */
export type ValueType = "availability" | "errorRatio";

export type CalendarLayout = "months" | "year";

export type WeekStart = "monday" | "sunday";

/** How count-mode samples are reduced per day and per month. */
export type Reduce = "sum" | "max" | "mean";

/** Theme palette the five count-mode steps are drawn from. */
export type ColorScale = "success" | "info" | "primary" | "warning" | "error";

export interface IncidentOptions {
  /**
   * Label of the second query's series that names the incident (for example `incident_id`).
   * Without it the series name is used.
   */
  label?: string;
  /**
   * Link template for an incident. `${incident}`, `${day}`, `${from}` and `${to}` are replaced;
   * dashboard variables are replaced by Perses. Without a second query it is shown on breach days.
   */
  link?: string;
}

export interface CalendarHeatmapChartOptions {
  mode?: CalendarMode;
  valueType?: ValueType;
  /** Availability target in percent, for example 99.9. */
  target?: number;
  /** Days at or above the target but below this (percent) are "close". */
  warnBelow?: number;
  layout?: CalendarLayout;
  weekStart?: WeekStart;
  /** IANA time zone, `UTC` or `local`. Unset: the dashboard's time zone. */
  timezone?: string;
  /**
   * Opened when a day is clicked, instead of zooming the dashboard to that day.
   * `${day}`, `${from}` and `${to}` are replaced.
   */
  dayLink?: string;
  /** Count mode: theme palette of the sequential scale. */
  colorScale?: ColorScale;
  /** Count mode: how samples are reduced per day and per month. */
  reduce?: Reduce;
  /** Count mode: unit and decimals of values. */
  format?: FormatOptions;
  incidents?: IncidentOptions;
}

export const DEFAULT_MODE: CalendarMode = "availability";
export const DEFAULT_VALUE_TYPE: ValueType = "availability";
export const DEFAULT_TARGET = 99.9;
export const DEFAULT_WARN_BELOW = 99.95;
export const DEFAULT_LAYOUT: CalendarLayout = "months";
export const DEFAULT_WEEK_START: WeekStart = "monday";
export const DEFAULT_COLOR_SCALE: ColorScale = "success";
export const DEFAULT_REDUCE: Reduce = "sum";
export const MAX_MONTHS = 12;

/** The step the panel asks its queries for: one sample per hour keeps a year under 11k points. */
export const QUERY_STEP_MS = 60 * 60 * 1000;

export const COLOR_SCALES: ColorScale[] = [
  "success",
  "info",
  "primary",
  "warning",
  "error",
];
