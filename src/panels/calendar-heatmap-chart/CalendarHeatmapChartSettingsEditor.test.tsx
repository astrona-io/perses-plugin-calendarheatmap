import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarHeatmapChartOptions } from "./calendar-heatmap-chart-types";
import {
  CalendarHeatmapChartSettingsEditor,
  parsePercent,
} from "./CalendarHeatmapChartSettingsEditor";

function renderEditor(value: CalendarHeatmapChartOptions) {
  const onChange = jest.fn();
  render(
    <CalendarHeatmapChartSettingsEditor value={value} onChange={onChange} />,
  );
  return onChange;
}

describe("CalendarHeatmapChartSettingsEditor", () => {
  it("parses percentages", () => {
    expect(parsePercent("99.9")).toBe(99.9);
    expect(parsePercent("")).toBeUndefined();
    expect(parsePercent("101")).toBeUndefined();
    expect(parsePercent("abc")).toBeUndefined();
  });

  it("edits the availability target and drops it when cleared", () => {
    const onChange = renderEditor({ mode: "availability", target: 99.9 });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Target (%)" }), {
      target: { value: "99.5" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      mode: "availability",
      target: 99.5,
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Target (%)" }), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ mode: "availability" });
  });

  it("shows count options in count mode", () => {
    renderEditor({ mode: "count" });
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: "Target (%)" }),
    ).not.toBeInTheDocument();
  });

  it("keeps incident options together and removes them when empty", () => {
    const onChange = renderEditor({
      mode: "availability",
      incidents: { label: "id" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Incident link" }), {
      target: { value: "https://x.example/${incident}" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      mode: "availability",
      incidents: { label: "id", link: "https://x.example/${incident}" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Incident label" }), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ mode: "availability" });
  });
});
