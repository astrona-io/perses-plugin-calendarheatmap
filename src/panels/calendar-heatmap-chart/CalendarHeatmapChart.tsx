import type { PanelPlugin } from "@perses-dev/plugin-system";

import type {
  CalendarHeatmapChartOptions,
  CalendarHeatmapChartProps,
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
  createInitialOptions: () => ({}),
};
