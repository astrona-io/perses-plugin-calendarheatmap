import type { TimeSeries, TimeSeriesData } from "@perses-dev/spec";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export function ms(iso: string): number {
  return new Date(iso).getTime();
}

export function series(
  values: Array<[number, number | null]>,
  labels: Record<string, string> = {},
  name = "probe_success",
): TimeSeries {
  return { name, labels: { __name__: name, ...labels }, values };
}

/**
 * Hourly range-query samples: one at every full hour in (from, to], as Prometheus returns for
 * `avg_over_time(x[1h])` with a 1h step (the sample at `t` covers the hour before it).
 */
export function hourly(
  from: number,
  to: number,
  value: (t: number) => number | null,
): Array<[number, number | null]> {
  const out: Array<[number, number | null]> = [];
  for (let t = from + HOUR; t <= to; t += HOUR) out.push([t, value(t)]);
  return out;
}

export function data(...seriesList: TimeSeries[]): TimeSeriesData {
  return { series: seriesList };
}
