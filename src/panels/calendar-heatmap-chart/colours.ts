import { alpha, Theme } from "@mui/material";
import type { ColorScale } from "./calendar-heatmap-chart-types";
import type { DayStatus } from "./data";

/** Theme colours resolved once per theme, so day cells get plain strings and stay memoisable. */
export interface Colours {
  fill: Record<DayStatus, string>;
  /** Text on a filled cell (the "!" marker). */
  onFill: Record<DayStatus, string>;
  /** Count mode: five steps, 0 (zero) to 4 (highest). */
  scale: string[];
  onScale: string[];
  met: string;
  breached: string;
  focus: string;
}

export function resolveColours(theme: Theme, colorScale: ColorScale): Colours {
  const p = theme.palette;
  const noData = p.mode === "dark" ? alpha(p.common.white, 0.08) : p.grey[200];
  const base = p[colorScale].main;
  // Zero is a faint tint of the scale, so a quiet day never looks like a day without data.
  const scale = [
    alpha(base, 0.14),
    alpha(base, 0.3),
    alpha(base, 0.5),
    alpha(base, 0.75),
    base,
  ];
  return {
    fill: {
      ok: p.success.main,
      close: p.warning.main,
      breach: p.error.main,
      "no-data": noData,
      // Outside the time range: no fill, a dashed outline (see the panel's styles).
      outside: "transparent",
      value: base,
    },
    onFill: {
      ok: p.success.contrastText,
      close: p.warning.contrastText,
      breach: p.error.contrastText,
      "no-data": p.text.secondary,
      outside: p.text.disabled,
      value: p[colorScale].contrastText,
    },
    scale,
    onScale: [
      p.text.secondary,
      p.text.primary,
      p.text.primary,
      p[colorScale].contrastText,
      p[colorScale].contrastText,
    ],
    met: p.success.main,
    breached: p.error.main,
    focus: p.primary.main,
  };
}
