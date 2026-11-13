import type { ReactElement } from "react";

import type { CalendarHeatmapChartProps } from "./calendar-heatmap-chart-types";

export function CalendarHeatmapChartComponent(
  props: CalendarHeatmapChartProps,
): ReactElement | null {
  const { queryResults, spec } = props;

  console.log("Panel data", queryResults);
  console.log("Panel spec", spec);

  // TODO: implement your awesome panel component here

  return <div>Panel goes here!</div>;
}
