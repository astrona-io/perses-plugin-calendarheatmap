import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { WeekStart } from "./calendar-heatmap-chart-types";

/** A calendar date in some time zone. `month` is 1..12. */
export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

export const MINUTE_MS = 60_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The IANA zone to compute calendar days in. `local` and `browser` (the Perses spellings for "the
 * viewer's zone") and an unset value with no dashboard zone resolve to the browser's zone.
 */
export function resolveTimeZone(
  timezone: string | undefined,
  dashboardTimeZone?: string,
): string {
  const chosen = timezone?.trim() || dashboardTimeZone?.trim();
  const lower = chosen?.toLowerCase();
  if (!chosen || lower === "local" || lower === "browser") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }
  if (lower === "utc") return "UTC";
  return chosen;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** `2026-10-09` */
export function dateKey(date: LocalDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** `2026-10` */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

/** The calendar date `ms` falls on in `timeZone`. */
export function localDateOf(ms: number, timeZone: string): LocalDate {
  const [year, month, day] = formatInTimeZone(ms, timeZone, "yyyy-MM-dd")
    .split("-")
    .map(Number);
  return { year: year!, month: month!, day: day! };
}

/**
 * The instant a calendar day starts in `timeZone`. Days are not always 24 hours: with DST they
 * are 23 or 25, which is why boundaries come from the zone rules and are never added up.
 */
export function startOfLocalDay(date: LocalDate, timeZone: string): number {
  return fromZonedTime(`${dateKey(date)}T00:00:00`, timeZone).getTime();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function nextDay(date: LocalDate): LocalDate {
  if (date.day < daysInMonth(date.year, date.month)) {
    return { ...date, day: date.day + 1 };
  }
  return date.month === 12
    ? { year: date.year + 1, month: 1, day: 1 }
    : { year: date.year, month: date.month + 1, day: 1 };
}

/** 0 = Sunday … 6 = Saturday. A calendar date's weekday does not depend on the zone. */
export function weekdayOf(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

/** Column of a weekday in a week that starts on `weekStart`: 0..6. */
export function weekdayColumn(weekday: number, weekStart: WeekStart): number {
  return weekStart === "monday" ? (weekday + 6) % 7 : weekday;
}

/** Weekday headers in display order. */
export function weekdayLetters(weekStart: WeekStart): string[] {
  return weekStart === "monday"
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];
}

export function weekdayNames(weekStart: WeekStart): string[] {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return weekStart === "monday" ? [...names.slice(1), names[0]!] : names;
}

/** Every month that the range [from, to) touches in `timeZone`, oldest first. */
export function monthsInRange(
  from: number,
  to: number,
  timeZone: string,
): Array<{ year: number; month: number }> {
  if (!(to > from)) return [];
  const first = localDateOf(from, timeZone);
  const last = localDateOf(to - 1, timeZone);
  const months: Array<{ year: number; month: number }> = [];
  let year = first.year;
  let month = first.month;
  while (year < last.year || (year === last.year && month <= last.month)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

/** `Oct 9, 2026` */
export function formatLocalDate(date: LocalDate): string {
  return `${monthName(date.month)} ${date.day}, ${date.year}`;
}

/**
 * Index of the bucket `ms` falls in, for sorted bucket start times with the last bucket ending at
 * `end`; -1 outside them.
 */
export function bucketIndex(starts: number[], end: number, ms: number): number {
  if (starts.length === 0 || ms < starts[0]! || ms >= end) return -1;
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
