import { data, DAY, HOUR, hourly, ms, series } from "../../test-utils/fixtures";
import {
  availabilityStatus,
  buildCalendarModel,
  countLevel,
  downtimeMinutes,
  inferStep,
  looksLikePercent,
  toAvailability,
} from "./data";

const UTC = "UTC";

function dayOf(
  model: ReturnType<typeof buildCalendarModel>,
  key: string,
): NonNullable<
  ReturnType<typeof buildCalendarModel>["months"][number]["days"][number]
> {
  for (const month of model.months) {
    const day = month.days.find((d) => d.key === key);
    if (day) return day;
  }
  throw new Error(`no day ${key}`);
}

describe("helpers", () => {
  it("infers the step from the smallest gap", () => {
    expect(
      inferStep([
        [0, 1],
        [3600, 1],
        [5400, 1],
      ]),
    ).toBe(1800);
    expect(inferStep([[0, 1]])).toBe(0);
  });

  it("detects percent input from any value above 1", () => {
    expect(looksLikePercent([series([[0, 0.999]])])).toBe(false);
    expect(looksLikePercent([series([[0, 99.9]])])).toBe(true);
    expect(looksLikePercent([series([[0, null]])])).toBe(false);
  });

  it("converts ratios, percentages and error ratios to availability", () => {
    expect(toAvailability(0.999, "availability", false)).toBeCloseTo(0.999);
    expect(toAvailability(99.9, "availability", true)).toBeCloseTo(0.999);
    expect(toAvailability(0.001, "errorRatio", false)).toBeCloseTo(0.999);
    expect(toAvailability(0.1, "errorRatio", true)).toBeCloseTo(0.999);
    expect(toAvailability(1.5, "availability", false)).toBe(1);
    expect(toAvailability(-1, "availability", false)).toBe(0);
  });

  it("computes downtime as (1 - availability) x minutes", () => {
    expect(downtimeMinutes(0.999, 1440)).toBeCloseTo(1.44);
    expect(downtimeMinutes(0.995, 1440)).toBeCloseTo(7.2);
    expect(downtimeMinutes(1, 1440)).toBe(0);
    // 99.9% over a 30-day month allows 43.2 minutes
    expect(downtimeMinutes(0.999, 30 * 1440)).toBeCloseTo(43.2);
  });

  it("classifies against the target and warn level, tolerating float noise", () => {
    expect(availabilityStatus(0.9995, 99.9, 99.95)).toBe("ok");
    expect(availabilityStatus(0.9992, 99.9, 99.95)).toBe("close");
    expect(availabilityStatus(0.999, 99.9, 99.95)).toBe("close");
    expect(availabilityStatus(0.9989, 99.9, 99.95)).toBe("breach");
  });

  it("puts counts on five steps relative to the max", () => {
    expect(countLevel(0, 10)).toBe(0);
    expect(countLevel(1, 10)).toBe(1);
    expect(countLevel(2.5, 10)).toBe(1);
    expect(countLevel(2.6, 10)).toBe(2);
    expect(countLevel(10, 10)).toBe(4);
    expect(countLevel(5, 0)).toBe(0);
  });
});

describe("buildCalendarModel: availability", () => {
  const from = ms("2026-10-01T00:00:00Z");
  const to = ms("2026-11-01T00:00:00Z");

  it("reports no data and bad time zones", () => {
    expect(
      buildCalendarModel([data()], { timeZone: UTC, from, to }).status,
    ).toBe("no-data");
    expect(
      buildCalendarModel([data(series([[from, null]]))], {
        timeZone: UTC,
        from,
        to,
      }).status,
    ).toBe("no-data");
    expect(
      buildCalendarModel([data(series([[from + HOUR, 1]]))], {
        timeZone: "Mars/Olympus",
        from,
        to,
      }).status,
    ).toBe("bad-timezone");
  });

  it("puts the 00:00 sample, which covers the hour before, on the previous day", () => {
    const model = buildCalendarModel(
      [data(series(hourly(from, to, () => 1)))],
      { timeZone: UTC, from, to },
    );
    expect(model.months).toHaveLength(1);
    const oct1 = dayOf(model, "2026-10-01");
    const oct31 = dayOf(model, "2026-10-31");
    expect(oct1.samples).toBe(24);
    expect(oct31.samples).toBe(24);
    expect(oct1.status).toBe("ok");
  });

  it("pools month totals from raw samples, not from daily percentages", () => {
    // Oct 1: 24 samples at 100%. Oct 2: 2 samples at 0% (a short outage window with data).
    const values: Array<[number, number | null]> = [
      ...hourly(from, from + DAY, () => 1),
      [from + DAY + HOUR, 0],
      [from + DAY + 2 * HOUR, 0],
    ];
    const model = buildCalendarModel([data(series(values))], {
      timeZone: UTC,
      from,
      to,
      target: 99,
      warnBelow: 99.5,
    });
    const month = model.months[0]!;
    expect(dayOf(model, "2026-10-01").value).toBe(1);
    expect(dayOf(model, "2026-10-02").value).toBe(0);
    // mean of daily values would be 50%; pooled is 24 / 26
    expect(month.value).toBeCloseTo(24 / 26);
    expect(month.samples).toBe(26);
    expect(month.met).toBe(false);
  });

  it("marks breach, close, ok and no-data days and computes their downtime", () => {
    const values = hourly(from, from + 4 * DAY, (t) => {
      const day = Math.floor((t - HOUR - from) / DAY);
      return [1, 0.9993, 0.99, null][day]!;
    });
    const model = buildCalendarModel([data(series(values))], {
      timeZone: UTC,
      from,
      to,
      target: 99.9,
      warnBelow: 99.95,
    });
    expect(dayOf(model, "2026-10-01").status).toBe("ok");
    expect(dayOf(model, "2026-10-02").status).toBe("close");
    const breach = dayOf(model, "2026-10-03");
    expect(breach.status).toBe("breach");
    expect(breach.downtimeMinutes).toBeCloseTo(14.4);
    expect(dayOf(model, "2026-10-04").status).toBe("no-data");
    expect(dayOf(model, "2026-10-04").value).toBeUndefined();
  });

  it("auto-detects percentages and error ratios", () => {
    const pct = buildCalendarModel(
      [data(series(hourly(from, from + DAY, () => 99.5)))],
      { timeZone: UTC, from, to },
    );
    expect(pct.percentInput).toBe(true);
    expect(dayOf(pct, "2026-10-01").value).toBeCloseTo(0.995);

    const errors = buildCalendarModel(
      [data(series(hourly(from, from + DAY, () => 0.002)))],
      { timeZone: UTC, from, to, valueType: "errorRatio" },
    );
    expect(dayOf(errors, "2026-10-01").value).toBeCloseTo(0.998);
  });

  it("clamps warnBelow to at least the target", () => {
    const model = buildCalendarModel(
      [data(series(hourly(from, from + DAY, () => 0.9995)))],
      { timeZone: UTC, from, to, target: 99.9, warnBelow: 99 },
    );
    expect(model.warnBelow).toBe(99.9);
    expect(dayOf(model, "2026-10-01").status).toBe("ok");
  });

  it("clips coverage and downtime to the time range", () => {
    const rangeFrom = ms("2026-10-10T12:00:00Z");
    const rangeTo = ms("2026-10-20T00:00:00Z");
    const model = buildCalendarModel(
      [data(series(hourly(rangeFrom, rangeTo, () => 0.5)))],
      { timeZone: UTC, from: rangeFrom, to: rangeTo },
    );
    expect(dayOf(model, "2026-10-09").status).toBe("outside");
    expect(dayOf(model, "2026-10-20").status).toBe("outside");
    const half = dayOf(model, "2026-10-10");
    expect(half.coveredMinutes).toBe(720);
    expect(half.downtimeMinutes).toBeCloseTo(360);
    const month = model.months[0]!;
    expect(month.coveredMinutes).toBe(9.5 * 1440);
    expect(month.downtimeMinutes).toBeCloseTo(9.5 * 720);
  });

  it("handles 23 h and 25 h days in Europe/Berlin", () => {
    const zone = "Europe/Berlin";
    const rangeFrom = ms("2026-03-01T00:00:00Z");
    const rangeTo = ms("2026-11-01T00:00:00Z");
    const model = buildCalendarModel(
      [data(series(hourly(rangeFrom, rangeTo, () => 0.99)))],
      { timeZone: zone, from: rangeFrom, to: rangeTo },
    );
    const spring = dayOf(model, "2026-03-29");
    expect(spring.minutes).toBe(1380);
    expect(spring.samples).toBe(23);
    expect(spring.downtimeMinutes).toBeCloseTo(13.8);
    const autumn = dayOf(model, "2026-10-25");
    expect(autumn.minutes).toBe(1500);
    expect(autumn.samples).toBe(25);
    expect(autumn.downtimeMinutes).toBeCloseTo(15);
    const normal = dayOf(model, "2026-06-15");
    expect(normal.samples).toBe(24);
  });

  it("assigns days by the zone's midnight, across a year end", () => {
    const zone = "America/New_York";
    const rangeFrom = ms("2026-12-31T05:00:00Z"); // 00:00 New York
    const rangeTo = ms("2027-01-02T05:00:00Z");
    const values: Array<[number, number | null]> = hourly(
      rangeFrom,
      rangeTo,
      (t) => (t <= rangeFrom + DAY ? 1 : 0),
    );
    const model = buildCalendarModel([data(series(values))], {
      timeZone: zone,
      from: rangeFrom,
      to: rangeTo,
    });
    expect(model.months.map((m) => m.key)).toEqual(["2026-12", "2027-01"]);
    expect(dayOf(model, "2026-12-31").value).toBe(1);
    expect(dayOf(model, "2027-01-01").value).toBe(0);
    expect(model.months[0]!.met).toBe(true);
    expect(model.months[1]!.met).toBe(false);
  });

  it("names incidents from the second query by label", () => {
    const incidents = series(
      [
        [from + 3 * HOUR, 1],
        [from + 4 * HOUR, 1],
        [from + DAY + 5 * HOUR, 0],
      ],
      { incident: "INC-42" },
      "incident_open",
    );
    const model = buildCalendarModel(
      [data(series(hourly(from, from + 2 * DAY, () => 1))), data(incidents)],
      { timeZone: UTC, from, to, incidentLabel: "incident" },
    );
    expect(dayOf(model, "2026-10-01").incidents).toEqual(["INC-42"]);
    expect(dayOf(model, "2026-10-02").incidents).toEqual([]);
  });

  it("shows only the last 12 months of a longer range", () => {
    const rangeFrom = ms("2025-01-01T00:00:00Z");
    const rangeTo = ms("2026-11-01T00:00:00Z");
    const model = buildCalendarModel([data(series([[rangeTo - HOUR, 1]]))], {
      timeZone: UTC,
      from: rangeFrom,
      to: rangeTo,
    });
    expect(model.months).toHaveLength(12);
    expect(model.hiddenMonths).toBe(10);
    expect(model.months[0]!.key).toBe("2025-11");
    expect(model.months[11]!.key).toBe("2026-10");
  });

  it("handles a full year of hourly samples quickly", () => {
    const rangeFrom = ms("2025-11-01T00:00:00Z");
    const rangeTo = ms("2026-11-01T00:00:00Z");
    const values = hourly(rangeFrom, rangeTo, (t) =>
      t % (17 * DAY) < HOUR ? 0 : 1,
    );
    const started = Date.now();
    const model = buildCalendarModel([data(series(values))], {
      timeZone: "Europe/Berlin",
      from: rangeFrom,
      to: rangeTo,
    });
    expect(Date.now() - started).toBeLessThan(1000);
    // In Berlin the range runs from 1 Nov 2025 01:00 to 1 Nov 2026 01:00: thirteen months, so the
    // oldest is hidden.
    expect(model.months).toHaveLength(12);
    expect(model.hiddenMonths).toBe(1);
    expect(model.months[11]!.key).toBe("2026-11");
    expect(model.months[11]!.samples).toBe(1);
  });
});

describe("buildCalendarModel: count", () => {
  const from = ms("2026-10-01T00:00:00Z");
  const to = ms("2026-11-01T00:00:00Z");
  const values = [
    ...hourly(from, from + DAY, () => 1), // 24 per day, max 1
    ...hourly(from + DAY, from + 2 * DAY, (t) =>
      t === from + DAY + HOUR ? 6 : 0,
    ),
  ];

  it("sums per day by default and scales to the busiest day", () => {
    const model = buildCalendarModel([data(series(values))], {
      timeZone: UTC,
      from,
      to,
      mode: "count",
    });
    expect(dayOf(model, "2026-10-01").value).toBe(24);
    expect(dayOf(model, "2026-10-02").value).toBe(6);
    expect(model.maxDayValue).toBe(24);
    expect(dayOf(model, "2026-10-01").level).toBe(4);
    expect(dayOf(model, "2026-10-02").level).toBe(1);
    expect(dayOf(model, "2026-10-01").status).toBe("value");
    expect(dayOf(model, "2026-10-03").status).toBe("no-data");
    expect(model.months[0]!.value).toBe(30);
  });

  it("supports max and mean", () => {
    const max = buildCalendarModel([data(series(values))], {
      timeZone: UTC,
      from,
      to,
      mode: "count",
      reduce: "max",
    });
    expect(dayOf(max, "2026-10-02").value).toBe(6);
    expect(max.months[0]!.value).toBe(6);
    const mean = buildCalendarModel([data(series(values))], {
      timeZone: UTC,
      from,
      to,
      mode: "count",
      reduce: "mean",
    });
    expect(dayOf(mean, "2026-10-02").value).toBe(0.25);
    expect(mean.months[0]!.value).toBeCloseTo(30 / 48);
  });

  it("does not treat counts as percentages", () => {
    const model = buildCalendarModel([data(series(values))], {
      timeZone: UTC,
      from,
      to,
      mode: "count",
    });
    expect(model.percentInput).toBe(false);
  });
});
