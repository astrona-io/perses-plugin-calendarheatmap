import { memo, ReactElement } from "react";
import { weekdayColumn, weekdayLetters, weekdayNames } from "./calendar";
import { Reduce, WeekStart } from "./calendar-heatmap-chart-types";
import { MonthModel } from "./data";
import { DayCell, DayContext } from "./DayCell";
import { monthSummary } from "./MonthCalendar";

export interface YearStripProps {
  months: MonthModel[];
  ctx: DayContext;
  weekStart: WeekStart;
  reduce: Reduce;
  cellSize: number;
  gap: number;
}

/** Number of week columns the strip needs for these months. */
export function weekColumns(
  months: MonthModel[],
  weekStart: WeekStart,
): number {
  const first = months[0]?.days[0];
  if (!first) return 0;
  const days = months.reduce((n, m) => n + m.days.length, 0);
  return Math.ceil((weekdayColumn(first.weekday, weekStart) + days) / 7);
}

/** One long strip: a column per week, a row per weekday, months labelled above. */
function YearStripBase({
  months,
  ctx,
  weekStart,
  reduce,
  cellSize,
  gap,
}: YearStripProps): ReactElement {
  const first = months[0]!.days[0]!;
  const offset = weekdayColumn(first.weekday, weekStart);
  const letters = weekdayLetters(weekStart);
  const names = weekdayNames(weekStart);
  const columns = weekColumns(months, weekStart);

  const labels: Array<{ key: string; label: string; column: number }> = [];
  const cells: ReactElement[] = [];
  let index = offset;
  for (const month of months) {
    labels.push({
      key: month.key,
      label: month.label.split(" ")[0]!,
      column: Math.floor(index / 7),
    });
    for (const day of month.days) {
      cells.push(
        <DayCell
          key={day.key}
          day={day}
          ctx={ctx}
          // column 0 holds the weekday letters, row 0 the month names
          column={Math.floor(index / 7) + 1}
          row={(index % 7) + 1}
        />,
      );
      index++;
    }
  }

  return (
    <div className="ch-year">
      <div
        className="ch-grid"
        role="group"
        aria-label="Calendar"
        style={{
          gridTemplateColumns: `auto repeat(${columns}, ${cellSize}px)`,
          gridTemplateRows: `auto repeat(7, ${cellSize}px)`,
          gap,
        }}
      >
        {labels.map((l) => (
          <span
            key={l.key}
            className="ch-weekday ch-year-month"
            style={{ gridRow: 1, gridColumn: `${l.column + 2} / span 4` }}
          >
            {l.label}
          </span>
        ))}
        {letters.map((letter, i) => (
          <abbr
            key={i}
            className="ch-weekday"
            title={names[i]}
            style={{ gridRow: i + 2, gridColumn: 1, paddingRight: 4 }}
          >
            {letter}
          </abbr>
        ))}
        {cells}
      </div>
      <ul className="ch-year-totals" aria-label="Month totals">
        {months.map((month) => {
          const summary = monthSummary(month, ctx, reduce);
          return (
            <li key={month.key}>
              <span className="ch-month-name">{month.label}</span>{" "}
              <span style={{ color: summary.colour }}>
                {ctx.mode === "availability" && month.value !== undefined
                  ? `${summary.total} · ${summary.verdict}`
                  : summary.verdict}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const YearStrip = memo(YearStripBase);
