import type { PanelPlugin } from "@perses-dev/plugin-system";
import {
  CalendarHeatmapChartOptions,
  CalendarHeatmapChartProps,
  DEFAULT_MODE,
  DEFAULT_TARGET,
  DEFAULT_WARN_BELOW,
  QUERY_STEP_MS,
} from "./calendar-heatmap-chart-types";
import { CalendarHeatmapChartComponent } from "./CalendarHeatmapChartComponent";
import { CalendarHeatmapChartSettingsEditor } from "./CalendarHeatmapChartSettingsEditor";

export const CalendarHeatmapChart: PanelPlugin<
  CalendarHeatmapChartOptions,
  CalendarHeatmapChartProps
> = {
  PanelComponent: CalendarHeatmapChartComponent,
  panelOptionsEditorComponents: [
    { label: "Settings", content: CalendarHeatmapChartSettingsEditor },
  ],
  supportedQueryTypes: ["TimeSeriesQuery"],
  // One sample per hour, whatever the panel width: day boundaries fall on sample windows and a
  // year stays under Prometheus' 11,000 points per series.
  queryOptions: { suggestedStepMs: QUERY_STEP_MS },
  createInitialOptions: () => ({
    mode: DEFAULT_MODE,
    target: DEFAULT_TARGET,
    warnBelow: DEFAULT_WARN_BELOW,
  }),
};
