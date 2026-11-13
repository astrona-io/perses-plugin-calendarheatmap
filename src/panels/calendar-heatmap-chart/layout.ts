/** Gap between day cells, relative to the cell size. */
export const GAP_RATIO = 0.16;
export const MIN_CELL = 6;
export const MAX_CELL = 36;
/** Panel chrome: the target line on top and the legend under the calendars. */
export const CHROME_Y = 52;
/** A month's fixed rows: its name, the weekday letters and the verdict. */
export const MONTH_FIXED_Y = 64;
export const MONTH_GAP_X = 24;
export const MONTH_GAP_Y = 12;
/** Year strip: weekday letters on the left; month names on top; the totals under it. */
export const YEAR_FIXED_X = 20;
export const YEAR_FIXED_Y = 18 + 44;

export interface CellLayout {
  cellSize: number;
  gap: number;
  /** Months per row (months layout). */
  columns: number;
}

function finish(size: number, columns: number): CellLayout {
  const cellSize = Math.floor(Math.min(MAX_CELL, Math.max(MIN_CELL, size)));
  return {
    cellSize,
    gap: Math.max(1, Math.round(cellSize * GAP_RATIO)),
    columns,
  };
}

/**
 * The biggest square cell that fits `count` month calendars in the panel, trying every number of
 * months per row. Below MIN_CELL the panel scrolls instead of shrinking further.
 */
export function monthsLayout(
  width: number,
  height: number,
  count: number,
): CellLayout {
  if (count <= 0) return finish(MIN_CELL, 1);
  let best = 0;
  let bestColumns = 1;
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const perMonthWidth = (width - (columns - 1) * MONTH_GAP_X) / columns;
    const byWidth = perMonthWidth / (7 + 6 * GAP_RATIO);
    const perMonthHeight =
      (height - CHROME_Y - (rows - 1) * MONTH_GAP_Y) / rows - MONTH_FIXED_Y;
    const byHeight = perMonthHeight / (6 + 6 * GAP_RATIO);
    const size = Math.min(byWidth, byHeight);
    if (size > best + 0.01) {
      best = size;
      bestColumns = columns;
    }
  }
  return finish(best, bestColumns);
}

/** The biggest square cell for a strip of `weeks` columns and seven rows. */
export function yearLayout(
  width: number,
  height: number,
  weeks: number,
): CellLayout {
  const byWidth =
    (width - YEAR_FIXED_X) / (Math.max(1, weeks) * (1 + GAP_RATIO));
  const byHeight = (height - CHROME_Y - YEAR_FIXED_Y) / (7 * (1 + GAP_RATIO));
  return finish(Math.min(byWidth, byHeight), 1);
}
