import { memo, ReactElement } from "react";
import { Box, Link, Tooltip } from "@mui/material";
import { formatValue, FormatOptions } from "@perses-dev/components";
import {
  replaceVariablesInString,
  VariableStateMap,
} from "@perses-dev/plugin-system";
import { formatLocalDate, weekdayNames } from "./calendar";
import { CalendarMode, IncidentOptions } from "./calendar-heatmap-chart-types";
import { Colours } from "./colours";
import { DayModel } from "./data";
import { formatDowntime, formatPercent } from "./format";
import { LinkContext, resolveLink } from "./links";

/** Everything a day needs besides its own data; built once per render of the panel. */
export interface DayContext {
  mode: CalendarMode;
  decimals: number;
  target: number;
  warnBelow: number;
  format?: FormatOptions;
  dayLink?: string;
  incidents?: IncidentOptions;
  hasIncidentQuery: boolean;
  colours: Colours;
  variables: VariableStateMap;
  onZoom: (start: number, end: number) => void;
}

const WEEKDAYS = weekdayNames("sunday");

/** An opaque, theme-coloured tooltip: the default translucent grey is hard to read over the cells. */
const TOOLTIP_SLOTS = {
  tooltip: {
    sx: {
      bgcolor: "background.paper",
      color: "text.primary",
      border: 1,
      borderColor: "divider",
      boxShadow: 4,
      px: 1.25,
      py: 0.75,
      maxWidth: 320,
    },
  },
  arrow: {
    sx: {
      color: "background.paper",
      "&::before": { border: 1, borderColor: "divider" },
    },
  },
} as const;

function linkContext(day: DayModel, incident?: string): LinkContext {
  return { day: day.key, from: day.start, to: day.end, incident };
}

function href(
  template: string | undefined,
  context: LinkContext,
  variables: VariableStateMap,
): string | undefined {
  const link = resolveLink(template, context);
  return link ? replaceVariablesInString(link, variables) : undefined;
}

/** Short status for the accessible name and the tooltip. */
export function describeDay(day: DayModel, ctx: DayContext): string {
  const date = formatLocalDate(day);
  if (day.status === "outside") return `${date}: outside the time range`;
  if (day.value === undefined) return `${date}: no data`;
  if (ctx.mode === "count") {
    return `${date}: ${formatValue(day.value, ctx.format)}`;
  }
  const pct = formatPercent(day.value, ctx.decimals);
  const down = formatDowntime(day.downtimeMinutes ?? 0);
  const status =
    day.status === "breach"
      ? `breach, below ${ctx.target}%`
      : day.status === "close"
        ? `close, below ${ctx.warnBelow}%`
        : "meets the target";
  return `${date}: ${pct}, ${status}, ${down} down`;
}

function DayTooltip({
  day,
  ctx,
}: {
  day: DayModel;
  ctx: DayContext;
}): ReactElement {
  const statusColour =
    day.status === "breach"
      ? ctx.colours.breached
      : day.status === "ok"
        ? ctx.colours.met
        : undefined;
  const incidentLinks = day.incidents.map((name) => ({
    name,
    href: href(ctx.incidents?.link, linkContext(day, name), ctx.variables),
  }));
  const templateOnly =
    !ctx.hasIncidentQuery && day.status === "breach"
      ? href(ctx.incidents?.link, linkContext(day), ctx.variables)
      : undefined;
  const dstNote =
    day.minutes !== 1440
      ? `${Math.round(day.minutes / 60)}-hour day (clock change)`
      : undefined;

  return (
    <Box sx={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
      <Box sx={{ fontWeight: 600 }}>
        {WEEKDAYS[day.weekday]}, {formatLocalDate(day)}
      </Box>
      {day.status === "outside" ? (
        <Box>Outside the time range</Box>
      ) : day.value === undefined ? (
        <Box>No data</Box>
      ) : ctx.mode === "count" ? (
        <Box>{formatValue(day.value, ctx.format)}</Box>
      ) : (
        <>
          <Box sx={{ color: statusColour, fontWeight: 600 }}>
            {formatPercent(day.value, ctx.decimals)} ·{" "}
            {formatDowntime(day.downtimeMinutes ?? 0)} down
          </Box>
          <Box>
            {day.status === "breach"
              ? `Breach: below the ${ctx.target}% target`
              : day.status === "close"
                ? `Close: below ${ctx.warnBelow}%`
                : "Meets the target"}
          </Box>
        </>
      )}
      {dstNote && <Box sx={{ opacity: 0.8 }}>{dstNote}</Box>}
      {incidentLinks.map((incident) => (
        <Box key={incident.name}>
          {incident.href ? (
            <Link href={incident.href} color="inherit" underline="always">
              Incident {incident.name} →
            </Link>
          ) : (
            <>Incident {incident.name}</>
          )}
        </Box>
      ))}
      {templateOnly && (
        <Box>
          <Link href={templateOnly} color="inherit" underline="always">
            Incidents on this day →
          </Link>
        </Box>
      )}
      {day.status !== "outside" && (
        <Box sx={{ opacity: 0.7, mt: 0.25 }}>
          {ctx.dayLink
            ? "Click to open the day link"
            : "Click to zoom to this day"}
        </Box>
      )}
    </Box>
  );
}

export interface DayCellProps {
  day: DayModel;
  ctx: DayContext;
  /** Grid position; omitted when the parent lays cells out in flow. */
  column?: number;
  row?: number;
}

function DayCellBase({ day, ctx, column, row }: DayCellProps): ReactElement {
  const { colours } = ctx;
  const counted = ctx.mode === "count" && day.level !== undefined;
  const background = counted
    ? colours.scale[day.level!]
    : colours.fill[day.status];
  const color = counted
    ? colours.onScale[day.level!]
    : colours.onFill[day.status];
  const style = {
    backgroundColor: background,
    color,
    gridColumn: column !== undefined ? column + 1 : undefined,
    gridRow: row !== undefined ? row + 1 : undefined,
  };
  const label = describeDay(day, ctx);
  const marker = day.status === "breach" ? "!" : "";
  const className = `ch-day ch-${day.status}`;

  if (day.status === "outside") {
    return (
      <span className={className} style={style} role="img" aria-label={label} />
    );
  }

  const dayHref = href(ctx.dayLink, linkContext(day), ctx.variables);
  const cell = dayHref ? (
    <a className={className} style={style} href={dayHref} aria-label={label}>
      {marker}
    </a>
  ) : (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={label}
      onClick={() => ctx.onZoom(day.start, day.end)}
    >
      {marker}
    </button>
  );

  return (
    <Tooltip
      title={<DayTooltip day={day} ctx={ctx} />}
      placement="top"
      arrow
      enterDelay={150}
      describeChild
      slotProps={TOOLTIP_SLOTS}
    >
      {cell}
    </Tooltip>
  );
}

export const DayCell = memo(DayCellBase);
