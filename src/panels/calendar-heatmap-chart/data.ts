import type { TimeSeries, TimeSeriesData } from "@perses-dev/spec";
import {
  bucketIndex,
  dateKey,
  daysInMonth,
  isValidTimeZone,
  LocalDate,
  MINUTE_MS,
  monthKey,
  monthName,
  monthsInRange,
  nextDay,
  startOfLocalDay,
  weekdayOf,
} from "./calendar";
import {
  CalendarMode,
  DEFAULT_MODE,
  DEFAULT_REDUCE,
  DEFAULT_TARGET,
  DEFAULT_VALUE_TYPE,
  DEFAULT_WARN_BELOW,
  MAX_MONTHS,
  Reduce,
  ValueType,
} from "./calendar-heatmap-chart-types";

/**
 * - `ok`: meets the target and the warn level
 * - `close`: meets the target, below the warn level
 * - `breach`: below the target
 * - `no-data`: inside the time range, no samples
 * - `outside`: outside the time range (a month shown in full, the range covering part of it)
 * - `value`: count mode, has data (see `level`)
 */
export type DayStatus =
  "ok" | "close" | "breach" | "no-data" | "outside" | "value";

export interface DayModel extends LocalDate {
  key: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** First instant of the local day, ms. */
  start: number;
  /** First instant of the next local day, ms. */
  end: number;
  /** Length of the local day: 1440, or 1380 / 1500 on a DST change. */
  minutes: number;
  /** Minutes of the day inside the time range. */
  coveredMinutes: number;
  samples: number;
  sum: number;
  max: number;
  /** Availability (0..1) or the reduced count; undefined without samples. */
  value?: number;
  /** (1 − availability) × covered minutes; availability mode only. */
  downtimeMinutes?: number;
  status: DayStatus;
  /** Count mode: 0 (zero) to 4 (highest), on a five-step scale. */
  level?: number;
  incidents: string[];
}

export interface MonthModel {
  key: string;
  year: number;
  month: number;
  label: string;
  days: DayModel[];
  samples: number;
  /** Pooled over every raw sample of the month; undefined without samples. */
  value?: number;
  coveredMinutes: number;
  downtimeMinutes?: number;
  /** Availability mode: whether the month total meets the target. */
  met?: boolean;
}

export type ModelStatus = "ok" | "no-data" | "bad-timezone";

export interface CalendarModel {
  status: ModelStatus;
  mode: CalendarMode;
  timeZone: string;
  months: MonthModel[];
  /** Months in the range left out because only the last MAX_MONTHS are shown. */
  hiddenMonths: number;
  /** Count mode: the highest day value, which the scale steps are relative to. */
  maxDayValue: number;
  /** Availability mode: whether the samples looked like percentages (0..100). */
  percentInput: boolean;
  target: number;
  warnBelow: number;
}

export interface BuildOptions {
  mode?: CalendarMode;
  valueType?: ValueType;
  target?: number;
  warnBelow?: number;
  reduce?: Reduce;
  timeZone: string;
  /** Time range, ms. */
  from: number;
  to: number;
  incidentLabel?: string;
  maxMonths?: number;
}

/** Ratio thresholds: values within this of a threshold count as meeting it (float noise). */
const EPSILON = 1e-9;

/**
 * The interval between samples: the smallest gap between consecutive timestamps. A range-query
 * sample at `t` summarises (t − step, t], so it is placed at its middle, t − step / 2. That keeps a
 * sample at 00:00, which covers the hour before midnight, on the day it describes.
 */
export function inferStep(values: TimeSeries["values"]): number {
  let step = Infinity;
  for (let i = 1; i < values.length; i++) {
    const gap = values[i]![0] - values[i - 1]![0];
    if (gap > 0 && gap < step) step = gap;
  }
  return Number.isFinite(step) ? step : 0;
}

function finiteSamples(series: TimeSeries): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [t, v] of series.values) {
    if (v !== null && Number.isFinite(v)) out.push([t, v]);
  }
  return out;
}

/** True when an availability series is in percent: any value above 1. */
export function looksLikePercent(seriesList: TimeSeries[]): boolean {
  for (const series of seriesList) {
    for (const [, v] of series.values) {
      if (v !== null && Number.isFinite(v) && v > 1 + EPSILON) return true;
    }
  }
  return false;
}

/** Availability 0..1 from a raw sample. */
export function toAvailability(
  raw: number,
  valueType: ValueType,
  percent: boolean,
): number {
  const ratio = percent ? raw / 100 : raw;
  const availability = valueType === "errorRatio" ? 1 - ratio : ratio;
  return Math.min(1, Math.max(0, availability));
}

/** Downtime = (1 − availability) × minutes in the period. */
export function downtimeMinutes(availability: number, minutes: number): number {
  return Math.max(0, 1 - availability) * minutes;
}

export function availabilityStatus(
  availability: number,
  target: number,
  warnBelow: number,
): "ok" | "close" | "breach" {
  if (availability + EPSILON < target / 100) return "breach";
  if (availability + EPSILON < warnBelow / 100) return "close";
  return "ok";
}

/** The day's value from its accumulated samples. */
function reduceDay(
  mode: CalendarMode,
  reduce: Reduce,
  sum: number,
  max: number,
  samples: number,
): number | undefined {
  if (samples === 0) return undefined;
  if (mode === "availability") return sum / samples;
  if (reduce === "max") return max;
  if (reduce === "mean") return sum / samples;
  return sum;
}

/** Five steps: 0 for zero (or below), 1..4 for quarters of the highest value. */
export function countLevel(value: number, maxValue: number): number {
  if (!(value > 0) || !(maxValue > 0)) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / maxValue) * 4)));
}

function emptyModel(
  status: ModelStatus,
  options: BuildOptions,
  target: number,
  warnBelow: number,
): CalendarModel {
  return {
    status,
    mode: options.mode ?? DEFAULT_MODE,
    timeZone: options.timeZone,
    months: [],
    hiddenMonths: 0,
    maxDayValue: 0,
    percentInput: false,
    target,
    warnBelow,
  };
}

/**
 * Builds the calendar from the query results: the first query is the value, the optional second
 * one marks incidents. Every day and month boundary is computed in `timeZone`.
 *
 * Month totals are pooled from the raw samples (sum of all samples / number of samples), never
 * averaged from the daily figures, so a day with fewer samples weighs less.
 */
export function buildCalendarModel(
  queryData: Array<TimeSeriesData | undefined>,
  options: BuildOptions,
): CalendarModel {
  const mode = options.mode ?? DEFAULT_MODE;
  const valueType = options.valueType ?? DEFAULT_VALUE_TYPE;
  const reduce = options.reduce ?? DEFAULT_REDUCE;
  const target = options.target ?? DEFAULT_TARGET;
  // A warn level under the target would make "close" impossible to reach: treat it as the target.
  const warnBelow = Math.max(options.warnBelow ?? DEFAULT_WARN_BELOW, target);
  const { timeZone, from, to } = options;

  if (!isValidTimeZone(timeZone)) {
    return emptyModel("bad-timezone", options, target, warnBelow);
  }

  const valueSeries = queryData[0]?.series ?? [];
  const hasSamples = valueSeries.some((s) =>
    s.values.some(([, v]) => v !== null && Number.isFinite(v)),
  );
  if (!hasSamples) return emptyModel("no-data", options, target, warnBelow);

  const allMonths = monthsInRange(from, to, timeZone);
  const maxMonths = options.maxMonths ?? MAX_MONTHS;
  const shownMonths = allMonths.slice(-maxMonths);
  const hiddenMonths = allMonths.length - shownMonths.length;

  // Day buckets for every shown month, contiguous, oldest first.
  const days: DayModel[] = [];
  const months: MonthModel[] = shownMonths.map(({ year, month }) => {
    const monthDays: DayModel[] = [];
    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const date: LocalDate = { year, month, day: d };
      const start = startOfLocalDay(date, timeZone);
      const end = startOfLocalDay(nextDay(date), timeZone);
      const coveredMs = Math.max(0, Math.min(end, to) - Math.max(start, from));
      const day: DayModel = {
        ...date,
        key: dateKey(date),
        weekday: weekdayOf(date),
        start,
        end,
        minutes: (end - start) / MINUTE_MS,
        coveredMinutes: coveredMs / MINUTE_MS,
        samples: 0,
        sum: 0,
        max: -Infinity,
        status: coveredMs > 0 ? "no-data" : "outside",
        incidents: [],
      };
      monthDays.push(day);
      days.push(day);
    }
    return {
      key: monthKey(year, month),
      year,
      month,
      label: `${monthName(month)} ${year}`,
      days: monthDays,
      samples: 0,
      coveredMinutes: monthDays.reduce((acc, d) => acc + d.coveredMinutes, 0),
    };
  });
  const starts = days.map((d) => d.start);
  const lastEnd = days.length ? days[days.length - 1]!.end : 0;

  const percentInput =
    mode === "availability" ? looksLikePercent(valueSeries) : false;

  for (const series of valueSeries) {
    const half = inferStep(series.values) / 2;
    for (const [t, raw] of finiteSamples(series)) {
      const index = bucketIndex(starts, lastEnd, t - half);
      if (index < 0) continue;
      const value =
        mode === "availability"
          ? toAvailability(raw, valueType, percentInput)
          : raw;
      const day = days[index]!;
      day.samples += 1;
      day.sum += value;
      if (value > day.max) day.max = value;
    }
  }

  const incidentSeries = queryData[1]?.series ?? [];
  for (const series of incidentSeries) {
    const name =
      (options.incidentLabel && series.labels?.[options.incidentLabel]) ||
      series.formattedName ||
      series.name;
    const half = inferStep(series.values) / 2;
    for (const [t, raw] of finiteSamples(series)) {
      if (!(raw > 0)) continue;
      const index = bucketIndex(starts, lastEnd, t - half);
      if (index < 0) continue;
      const day = days[index]!;
      if (!day.incidents.includes(name)) day.incidents.push(name);
    }
  }

  let maxDayValue = 0;
  for (const day of days) {
    day.value = reduceDay(mode, reduce, day.sum, day.max, day.samples);
    if (day.value === undefined) continue;
    if (mode === "availability") {
      day.status = availabilityStatus(day.value, target, warnBelow);
      day.downtimeMinutes = downtimeMinutes(day.value, day.coveredMinutes);
    } else {
      day.status = "value";
      if (day.value > maxDayValue) maxDayValue = day.value;
    }
  }
  if (mode === "count") {
    for (const day of days) {
      if (day.value !== undefined)
        day.level = countLevel(day.value, maxDayValue);
    }
  }

  for (const month of months) {
    let samples = 0;
    let sum = 0;
    let max = -Infinity;
    for (const day of month.days) {
      samples += day.samples;
      sum += day.sum;
      if (day.samples > 0 && day.max > max) max = day.max;
    }
    month.samples = samples;
    month.value = reduceDay(mode, reduce, sum, max, samples);
    if (mode === "availability" && month.value !== undefined) {
      month.downtimeMinutes = downtimeMinutes(
        month.value,
        month.coveredMinutes,
      );
      month.met = month.value + EPSILON >= target / 100;
    }
  }

  return {
    status: "ok",
    mode,
    timeZone,
    months,
    hiddenMonths,
    maxDayValue,
    percentInput,
    target,
    warnBelow,
  };
}
