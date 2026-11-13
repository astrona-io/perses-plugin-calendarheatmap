import {
  bucketIndex,
  daysInMonth,
  isValidTimeZone,
  localDateOf,
  monthsInRange,
  nextDay,
  resolveTimeZone,
  startOfLocalDay,
  weekdayColumn,
  weekdayOf,
} from "./calendar";

const H = 60 * 60 * 1000;

describe("resolveTimeZone", () => {
  it("prefers the panel's zone, then the dashboard's", () => {
    expect(resolveTimeZone("Europe/Berlin", "America/New_York")).toBe(
      "Europe/Berlin",
    );
    expect(resolveTimeZone(undefined, "America/New_York")).toBe(
      "America/New_York",
    );
    expect(resolveTimeZone("  ", "Asia/Tokyo")).toBe("Asia/Tokyo");
  });

  it("normalises utc and resolves local and browser to the browser zone", () => {
    expect(resolveTimeZone("utc")).toBe("UTC");
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(resolveTimeZone("local")).toBe(browser);
    expect(resolveTimeZone(undefined, "browser")).toBe(browser);
    expect(resolveTimeZone(undefined, undefined)).toBe(browser);
  });

  it("knows real zones from typos", () => {
    expect(isValidTimeZone("Europe/Berlin")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("local days", () => {
  it("finds the calendar date of an instant in the zone", () => {
    const t = Date.parse("2026-10-31T23:30:00Z");
    expect(localDateOf(t, "UTC")).toEqual({ year: 2026, month: 10, day: 31 });
    expect(localDateOf(t, "Europe/Berlin")).toEqual({
      year: 2026,
      month: 11,
      day: 1,
    });
    expect(localDateOf(t, "America/Los_Angeles")).toEqual({
      year: 2026,
      month: 10,
      day: 31,
    });
  });

  it("makes the spring DST day 23 hours and the autumn one 25 (Europe/Berlin)", () => {
    const zone = "Europe/Berlin";
    const spring = startOfLocalDay({ year: 2026, month: 3, day: 29 }, zone);
    const springEnd = startOfLocalDay({ year: 2026, month: 3, day: 30 }, zone);
    expect(spring).toBe(Date.parse("2026-03-28T23:00:00Z"));
    expect(springEnd - spring).toBe(23 * H);
    const autumn = startOfLocalDay({ year: 2026, month: 10, day: 25 }, zone);
    const autumnEnd = startOfLocalDay({ year: 2026, month: 10, day: 26 }, zone);
    expect(autumnEnd - autumn).toBe(25 * H);
  });

  it("handles DST in America/New_York, which changes at 02:00", () => {
    const zone = "America/New_York";
    const start = startOfLocalDay({ year: 2026, month: 3, day: 8 }, zone);
    const end = startOfLocalDay({ year: 2026, month: 3, day: 9 }, zone);
    expect(start).toBe(Date.parse("2026-03-08T05:00:00Z"));
    expect(end - start).toBe(23 * H);
    const nov = startOfLocalDay({ year: 2026, month: 11, day: 1 }, zone);
    const novEnd = startOfLocalDay({ year: 2026, month: 11, day: 2 }, zone);
    expect(novEnd - nov).toBe(25 * H);
  });

  it("rolls over month and year ends, with leap years", () => {
    expect(nextDay({ year: 2026, month: 1, day: 31 })).toEqual({
      year: 2026,
      month: 2,
      day: 1,
    });
    expect(nextDay({ year: 2026, month: 12, day: 31 })).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("places weekdays for Monday and Sunday weeks", () => {
    // 2026-10-01 is a Thursday
    const thursday = weekdayOf({ year: 2026, month: 10, day: 1 });
    expect(thursday).toBe(4);
    expect(weekdayColumn(thursday, "monday")).toBe(3);
    expect(weekdayColumn(thursday, "sunday")).toBe(4);
    expect(weekdayColumn(0, "monday")).toBe(6);
  });
});

describe("monthsInRange", () => {
  it("lists every month the range touches, across a year end", () => {
    const months = monthsInRange(
      Date.parse("2026-11-15T00:00:00Z"),
      Date.parse("2027-02-01T00:00:00Z"),
      "UTC",
    );
    expect(months).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });

  it("uses the zone for the first and last month", () => {
    // 23:30Z on 31 December is already 1 January in Auckland (UTC+13).
    const from = Date.parse("2026-12-31T23:30:00Z");
    const to = from + H;
    expect(monthsInRange(from, to, "UTC")).toEqual([
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
    expect(monthsInRange(from, to, "Pacific/Auckland")).toEqual([
      { year: 2027, month: 1 },
    ]);
  });

  it("is empty for an empty range", () => {
    expect(monthsInRange(10, 10, "UTC")).toEqual([]);
  });
});

describe("bucketIndex", () => {
  const starts = [0, 10, 20];
  it("finds the bucket by its start, the last ending at end", () => {
    expect(bucketIndex(starts, 30, 0)).toBe(0);
    expect(bucketIndex(starts, 30, 9)).toBe(0);
    expect(bucketIndex(starts, 30, 10)).toBe(1);
    expect(bucketIndex(starts, 30, 29)).toBe(2);
  });
  it("is -1 outside", () => {
    expect(bucketIndex(starts, 30, -1)).toBe(-1);
    expect(bucketIndex(starts, 30, 30)).toBe(-1);
    expect(bucketIndex([], 30, 5)).toBe(-1);
  });
});
