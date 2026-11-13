import { memo, ReactElement } from "react";
import { formatValue } from "@perses-dev/components";
import { weekdayColumn, weekdayLetters, weekdayNames } from "./calendar";
import { Reduce, WeekStart } from "./calendar-heatmap-chart-types";
import { MonthModel } from "./data";
import { DayCell, DayContext } from "./DayCell";
import { formatDowntime, formatPercent } from "./format";

const REDUCE_LABEL: Record<Reduce, string> = {
  sum: "Total",
  max: "Max",
  mean: "Mean",
};

/** The month's total next to its name, and its verdict under the grid. */
export function monthSummary(
  month: MonthModel,
  ctx: DayContext,
  reduce: Reduce,
): { total: string; verdict: string; colour?: string } {
  if (month.value === undefined) return { total: "–", verdict: "No data" };
  if (ctx.mode === "count") {
    const total = formatValue(month.value, ctx.format);
    return { total, verdict: `${REDUCE_LABEL[reduce]} ${total}` };
  }
  const total = formatPercent(month.value, ctx.decimals);
  if (month.met) {
    return { total, verdict: "SLA met", colour: ctx.colours.met };
  }
  return {
    total,
    verdict: `Breached · ${formatDowntime(month.downtimeMinutes ?? 0)} down`,
    colour: ctx.colours.breached,
  };
}

export interface MonthCalendarProps {
  month: MonthModel;
  ctx: DayContext;
  weekStart: WeekStart;
  reduce: Reduce;
  cellSize: number;
  gap: number;
}

function MonthCalendarBase({
  month,
  ctx,
  weekStart,
  reduce,
  cellSize,
  gap,
}: MonthCalendarProps): ReactElement {
  const summary = monthSummary(month, ctx, reduce);
  const offset = weekdayColumn(month.days[0]!.weekday, weekStart);
  const letters = weekdayLetters(weekStart);
  const names = weekdayNames(weekStart);
  const width = cellSize * 7 + gap * 6;

  return (
    <section className="ch-month" aria-label={month.label} style={{ width }}>
      <div className="ch-month-head">
        <span className="ch-month-name">{month.label}</span>
        <span
          className="ch-month-total"
          style={{ color: summary.colour }}
          title={
            ctx.mode === "availability"
              ? "Availability over every sample of the month"
              : undefined
          }
        >
          {summary.total}
        </span>
      </div>
      <div
        className="ch-grid"
        style={{
          gridTemplateColumns: `repeat(7, ${cellSize}px)`,
          gridTemplateRows: "auto",
          gridAutoRows: `${cellSize}px`,
          gap,
        }}
      >
        {letters.map((letter, i) => (
          <abbr
            key={i}
            className="ch-weekday"
            title={names[i]}
            style={{ gridRow: 1, gridColumn: i + 1 }}
          >
            {letter}
          </abbr>
        ))}
        {month.days.map((day, i) => {
          const position = offset + i;
          return (
            <DayCell
              key={day.key}
              day={day}
              ctx={ctx}
              column={position % 7}
              row={Math.floor(position / 7) + 1}
            />
          );
        })}
      </div>
      <div className="ch-verdict" style={{ color: summary.colour }}>
        {summary.verdict}
      </div>
    </section>
  );
}

export const MonthCalendar = memo(MonthCalendarBase);
