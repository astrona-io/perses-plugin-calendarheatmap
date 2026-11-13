import { interpolate, isSafeHref, resolveLink } from "./links";

const ctx = { day: "2026-10-09", from: 1, to: 2 };

describe("links", () => {
  it("fills the day, range and incident, URL-encoded", () => {
    expect(
      interpolate("/d?day=${day}&from=${from}&to=${to}&i=${incident}", {
        ...ctx,
        incident: "INC 42/a",
      }),
    ).toBe("/d?day=2026-10-09&from=1&to=2&i=INC%2042%2Fa");
  });

  it("leaves dashboard variables for Perses", () => {
    expect(interpolate("/x?env=${env}&day=${day}", ctx)).toBe(
      "/x?env=${env}&day=2026-10-09",
    );
  });

  it("drops unsafe schemes", () => {
    expect(isSafeHref("https://status.example.com")).toBe(true);
    expect(isSafeHref("/relative")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref(" data:text/html,x")).toBe(false);
    expect(resolveLink("javascript:${day}", ctx)).toBeUndefined();
    expect(resolveLink(undefined, ctx)).toBeUndefined();
    expect(resolveLink("", ctx)).toBeUndefined();
  });
});
