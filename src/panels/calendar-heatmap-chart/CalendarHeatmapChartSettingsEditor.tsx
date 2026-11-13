import { ReactElement, useMemo } from "react";
import { MenuItem, TextField } from "@mui/material";
import {
  FormatControls,
  getTimeZoneOptions,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
  TimeZoneOption,
  TimeZoneSelector,
} from "@perses-dev/components";
import {
  CalendarHeatmapChartEditorProps,
  CalendarHeatmapChartOptions,
  CalendarLayout,
  CalendarMode,
  COLOR_SCALES,
  ColorScale,
  DEFAULT_COLOR_SCALE,
  DEFAULT_LAYOUT,
  DEFAULT_MODE,
  DEFAULT_REDUCE,
  DEFAULT_TARGET,
  DEFAULT_VALUE_TYPE,
  DEFAULT_WARN_BELOW,
  DEFAULT_WEEK_START,
  IncidentOptions,
  Reduce,
  ValueType,
  WeekStart,
} from "./calendar-heatmap-chart-types";

const COLOR_SCALE_LABELS: Record<ColorScale, string> = {
  success: "Green (success)",
  info: "Blue (info)",
  primary: "Primary",
  warning: "Amber (warning)",
  error: "Red (error)",
};

/** The editor's value for "no explicit zone": the dashboard's. */
const DASHBOARD_ZONE = "__dashboard__";

/** `"99.9"` to 99.9; empty or not a number in 0..100 to undefined. */
export function parsePercent(text: string): number | undefined {
  if (text.trim() === "") return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined;
}

/** Drops keys whose value is undefined or empty, so the saved spec stays minimal. */
function clean<T extends object>(value: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined || v === "") continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      if (Object.values(v).every((x) => x === undefined || x === "")) continue;
    }
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}): ReactElement {
  return (
    <OptionsEditorControl
      label={label}
      control={
        <TextField
          select
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          inputProps={{ "aria-label": label }}
        >
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      }
    />
  );
}

function TextControl({
  label,
  value,
  placeholder,
  type,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <OptionsEditorControl
      label={label}
      control={
        <TextField
          size="small"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ "aria-label": label }}
        />
      }
    />
  );
}

export function CalendarHeatmapChartSettingsEditor(
  props: CalendarHeatmapChartEditorProps,
): ReactElement {
  const { value, onChange } = props;
  const mode = value.mode ?? DEFAULT_MODE;

  const set = (patch: Partial<CalendarHeatmapChartOptions>): void =>
    onChange(clean({ ...value, ...patch }));
  const setIncidents = (patch: Partial<IncidentOptions>): void =>
    set({ incidents: clean({ ...value.incidents, ...patch }) });

  const zoneOptions: TimeZoneOption[] = useMemo(
    () => [
      { value: DASHBOARD_ZONE, display: "Dashboard default" },
      ...getTimeZoneOptions(),
    ],
    [],
  );

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Calendar">
          <Select<CalendarMode>
            label="Mode"
            value={mode}
            options={[
              { value: "availability", label: "Availability (SLA)" },
              { value: "count", label: "Count per day" },
            ]}
            onChange={(v) => set({ mode: v })}
          />
          <Select<CalendarLayout>
            label="Layout"
            value={value.layout ?? DEFAULT_LAYOUT}
            options={[
              { value: "months", label: "Months side by side" },
              { value: "year", label: "Year strip" },
            ]}
            onChange={(v) => set({ layout: v })}
          />
          <Select<WeekStart>
            label="Week starts on"
            value={value.weekStart ?? DEFAULT_WEEK_START}
            options={[
              { value: "monday", label: "Monday" },
              { value: "sunday", label: "Sunday" },
            ]}
            onChange={(v) => set({ weekStart: v })}
          />
          <OptionsEditorControl
            label="Time zone"
            control={
              <TimeZoneSelector
                size="small"
                aria-label="Time zone"
                value={value.timezone ?? DASHBOARD_ZONE}
                timeZoneOptions={
                  value.timezone &&
                  !zoneOptions.some((o) => o.value === value.timezone)
                    ? [
                        ...zoneOptions,
                        { value: value.timezone, display: value.timezone },
                      ]
                    : zoneOptions
                }
                onChange={(o) =>
                  set({
                    timezone: o.value === DASHBOARD_ZONE ? undefined : o.value,
                  })
                }
              />
            }
          />
          <TextControl
            label="Day link"
            value={value.dayLink ?? ""}
            placeholder="Zoom the dashboard (default)"
            onChange={(v) => set({ dayLink: v || undefined })}
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        {mode === "availability" ? (
          <OptionsEditorGroup title="Availability">
            <Select<ValueType>
              label="Values are"
              value={value.valueType ?? DEFAULT_VALUE_TYPE}
              options={[
                { value: "availability", label: "Availability (0..1 or %)" },
                { value: "errorRatio", label: "Error ratio (0..1 or %)" },
              ]}
              onChange={(v) => set({ valueType: v })}
            />
            <TextControl
              label="Target (%)"
              type="number"
              value={String(value.target ?? "")}
              placeholder={String(DEFAULT_TARGET)}
              onChange={(v) => set({ target: parsePercent(v) })}
            />
            <TextControl
              label="Close below (%)"
              type="number"
              value={String(value.warnBelow ?? "")}
              placeholder={String(DEFAULT_WARN_BELOW)}
              onChange={(v) => set({ warnBelow: parsePercent(v) })}
            />
          </OptionsEditorGroup>
        ) : (
          <OptionsEditorGroup title="Count">
            <Select<Reduce>
              label="Per day"
              value={value.reduce ?? DEFAULT_REDUCE}
              options={[
                { value: "sum", label: "Sum" },
                { value: "max", label: "Max" },
                { value: "mean", label: "Mean" },
              ]}
              onChange={(v) => set({ reduce: v })}
            />
            <Select<ColorScale>
              label="Colour scale"
              value={value.colorScale ?? DEFAULT_COLOR_SCALE}
              options={COLOR_SCALES.map((c) => ({
                value: c,
                label: COLOR_SCALE_LABELS[c],
              }))}
              onChange={(v) => set({ colorScale: v })}
            />
            <FormatControls
              value={value.format ?? { unit: "decimal" }}
              onChange={(format) => set({ format })}
            />
          </OptionsEditorGroup>
        )}
        <OptionsEditorGroup title="Incidents">
          <TextControl
            label="Incident label"
            value={value.incidents?.label ?? ""}
            placeholder="Series name (second query)"
            onChange={(v) => setIncidents({ label: v || undefined })}
          />
          <TextControl
            label="Incident link"
            value={value.incidents?.link ?? ""}
            placeholder="https://…/incidents/${incident}"
            onChange={(v) => setIncidents({ link: v || undefined })}
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
