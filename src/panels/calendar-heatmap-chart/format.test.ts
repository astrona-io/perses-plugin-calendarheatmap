import { formatDowntime, formatPercent, percentDecimals } from "./format";

describe("formatPercent", () => {
  it("rounds down so a breach never shows as meeting the target", () => {
    expect(formatPercent(0.99899, 2)).toBe("99.89%");
    expect(formatPercent(0.999, 2)).toBe("99.90%");
    expect(formatPercent(0.99999, 2)).toBe("99.99%");
    expect(formatPercent(1, 2)).toBe("100%");
    expect(formatPercent(0.5, 3)).toBe("50.000%");
  });

  it("uses enough decimals for the thresholds", () => {
    expect(percentDecimals(99.9, 99.95)).toBe(2);
    expect(percentDecimals(99.995)).toBe(3);
    expect(percentDecimals(99)).toBe(2);
    expect(percentDecimals(99.123456)).toBe(4);
  });
});

describe("formatDowntime", () => {
  it("reads naturally from seconds to hours", () => {
    expect(formatDowntime(0)).toBe("0 min");
    expect(formatDowntime(0.4)).toBe("<1 min");
    expect(formatDowntime(14.4)).toBe("14 min");
    expect(formatDowntime(99.4)).toBe("99 min");
    expect(formatDowntime(125)).toBe("2 h 5 min");
    expect(formatDowntime(180)).toBe("3 h");
  });
});
