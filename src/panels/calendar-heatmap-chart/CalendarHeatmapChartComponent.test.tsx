import { fireEvent, render, screen } from "@testing-library/react";
import type { TimeSeriesData } from "@perses-dev/spec";
import { data, DAY, HOUR, hourly, ms, series } from "../../test-utils/fixtures";
import {
  CalendarHeatmapChartOptions,
  CalendarHeatmapChartProps,
} from "./calendar-heatmap-chart-types";
import { CalendarHeatmapChartComponent } from "./CalendarHeatmapChartComponent";

const FROM = ms("2026-10-01T00:00:00Z");
const TO = ms("2026-11-01T00:00:00Z");
const setTimeRange = jest.fn();
let range = { start: new Date(FROM), end: new Date(TO) };

jest.mock("@perses-dev/plugin-system", () => ({
  ...jest.requireActual("@perses-dev/plugin-system"),
  useTimeRange: () => ({ absoluteTimeRange: range, setTimeRange }),
  useAllVariableValues: () => ({ env: { value: "prod", loading: false } }),
}));

function renderPanel(
  spec: Partial<CalendarHeatmapChartOptions>,
  results: Array<TimeSeriesData | undefined>,
  size = { width: 900, height: 360 },
) {
  const props = {
    spec: { mode: "availability", timezone: "UTC", ...spec },
    queryResults: results.map((d) => ({
      definition: { kind: "TimeSeriesQuery", spec: { plugin: {} } },
      data: d,
    })),
    contentDimensions: size,
  } as unknown as CalendarHeatmapChartProps;
  return render(<CalendarHeatmapChartComponent {...props} />);
}

/** Oct 1 at 100%, Oct 2 at 99%, Oct 3 at 99.93%, no data afterwards. */
function availability(): TimeSeriesData {
  return data(
    series(
      hourly(FROM, FROM + 3 * DAY, (t) => {
        const day = Math.floor((t - HOUR - FROM) / DAY);
        return [1, 0.99, 0.9993][day]!;
      }),
    ),
  );
}

beforeEach(() => {
  range = { start: new Date(FROM), end: new Date(TO) };
  setTimeRange.mockClear();
});

describe("CalendarHeatmapChartComponent", () => {
  it("shows a no-data message for an empty result", () => {
    renderPanel({}, [data()]);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("flags an unknown time zone", () => {
    renderPanel({ timezone: "Mars/Olympus" }, [availability()]);
    expect(screen.getByRole("alert")).toHaveTextContent("Mars/Olympus");
  });

  it("renders a day button per day with its status and a ! on breach days", () => {
    renderPanel({}, [availability()]);
    expect(screen.getByText("Oct 2026")).toBeInTheDocument();
    const breach = screen.getByRole("button", { name: /Oct 2, 2026: 99\.00%/ });
    expect(breach).toHaveTextContent("!");
    expect(breach).toHaveAccessibleName(/breach, below 99\.9%, 14 min down/);
    const close = screen.getByRole("button", { name: /Oct 3, 2026/ });
    expect(close).toHaveAccessibleName(/close/);
    expect(close).not.toHaveTextContent("!");
    expect(
      screen.getByRole("button", { name: "Oct 4, 2026: no data" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(31);
  });

  it("states the month verdict from pooled samples", () => {
    renderPanel({}, [availability()]);
    // (24 + 23.76 + 23.9832) / 72 = 99.64%
    expect(screen.getByText("99.64%")).toBeInTheDocument();
    expect(screen.getByText(/Breached/)).toBeInTheDocument();
  });

  it("zooms the dashboard to the clicked day", () => {
    renderPanel({}, [availability()]);
    fireEvent.click(screen.getByRole("button", { name: /Oct 2, 2026/ }));
    expect(setTimeRange).toHaveBeenCalledWith({
      start: new Date(ms("2026-10-02T00:00:00Z")),
      end: new Date(ms("2026-10-03T00:00:00Z")),
    });
  });

  it("turns days into links when a day link is set", () => {
    renderPanel({ dayLink: "/d/day?day=${day}&env=$env" }, [availability()]);
    const link = screen.getByRole("link", { name: /Oct 2, 2026/ });
    expect(link).toHaveAttribute("href", "/d/day?day=2026-10-02&env=prod");
  });

  it("shows the year strip with month totals", () => {
    range = {
      start: new Date(ms("2025-11-01T00:00:00Z")),
      end: new Date(TO),
    };
    renderPanel({ layout: "year" }, [availability()]);
    expect(screen.getByRole("list", { name: "Month totals" })).toBeVisible();
    expect(screen.getByText("12 months · UTC")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(365);
  });

  it("caps a longer range at the last 12 months", () => {
    range = {
      start: new Date(ms("2025-01-01T00:00:00Z")),
      end: new Date(TO),
    };
    renderPanel({}, [availability()], { width: 1600, height: 900 });
    expect(screen.getByText(/Last 12 of 22 months/)).toBeInTheDocument();
  });

  it("renders count mode with a scale legend", () => {
    const counts = data(
      series(hourly(FROM, FROM + 2 * DAY, (t) => (t <= FROM + DAY ? 2 : 0))),
    );
    renderPanel({ mode: "count" }, [counts]);
    expect(
      screen.getByRole("button", { name: "Oct 1, 2026: 48" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Oct 2, 2026: 0" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent(
      "48",
    );
  });

  it("names incidents from the second query in the tooltip", async () => {
    const incidents = data(
      series([[FROM + DAY + 2 * HOUR, 1]], { id: "INC-7" }, "incident"),
    );
    renderPanel(
      {
        incidents: {
          label: "id",
          link: "https://status.example.com/${incident}",
        },
      },
      [availability(), incidents],
    );
    fireEvent.mouseOver(screen.getByRole("button", { name: /Oct 2, 2026/ }));
    const link = await screen.findByRole("link", { name: /Incident INC-7/ });
    expect(link).toHaveAttribute("href", "https://status.example.com/INC-7");
  });
});
