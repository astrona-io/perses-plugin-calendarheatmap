import {
  OptionsEditorGrid,
  OptionsEditorColumn,
  ThresholdsEditor,
} from "@perses-dev/components";
import type { ThresholdsEditorProps } from "@perses-dev/components";
import type {
  LegendOptionsEditorProps,
  OptionsEditorProps,
} from "@perses-dev/plugin-system";
import { LegendOptionsEditor } from "@perses-dev/plugin-system";
import type { ReactElement } from "react";
import { useCallback } from "react";

import type { CalendarHeatmapChartOptions } from "./calendar-heatmap-chart-types";

type CalendarHeatmapChartSettingsEditorProps =
  OptionsEditorProps<CalendarHeatmapChartOptions>;

export function CalendarHeatmapChartSettingsEditor(
  props: CalendarHeatmapChartSettingsEditorProps,
): ReactElement {
  const { onChange, value } = props;

  const handleLegendChange: LegendOptionsEditorProps["onChange"] = useCallback(
    (newLegend) => {
      onChange({ ...value, legend: newLegend });
    },
    [onChange, value],
  );

  const handleThresholdsChange: ThresholdsEditorProps["onChange"] = useCallback(
    (thresholds) => {
      onChange({ ...value, thresholds });
    },
    [onChange, value],
  );

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <LegendOptionsEditor
          value={value.legend}
          onChange={handleLegendChange}
        />
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <ThresholdsEditor
          hideDefault
          thresholds={value.thresholds}
          onChange={handleThresholdsChange}
        />
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
