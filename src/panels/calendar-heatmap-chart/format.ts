/** Decimals of a number as written, e.g. 99.95 → 2. */
function decimalsOf(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

/** Enough decimals to tell the thresholds apart: at least 2. */
export function percentDecimals(...thresholds: number[]): number {
  return Math.min(4, Math.max(2, ...thresholds.map(decimalsOf)));
}

/**
 * A 0..1 availability as a percentage, rounded down: 99.899% shows as 99.89%, never as a
 * target-meeting 99.90%. Only a full 1 shows as 100%.
 */
export function formatPercent(ratio: number, decimals = 2): string {
  if (ratio >= 1) return "100%";
  const factor = 10 ** decimals;
  const floored = Math.floor(ratio * 100 * factor + 1e-6) / factor;
  return `${floored.toFixed(decimals)}%`;
}

/** `0 min`, `<1 min`, `82 min`, `2 h 5 min` */
export function formatDowntime(minutes: number): string {
  if (!(minutes > 0)) return "0 min";
  if (minutes < 1) return "<1 min";
  const rounded = Math.round(minutes);
  if (rounded < 100) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
