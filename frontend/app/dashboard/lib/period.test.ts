import { describe, expect, it } from "vitest";
import { computePeriodRange } from "./period";

describe("computePeriodRange", () => {
  const reference = new Date(2026, 5, 15); // June 15, 2026

  it("computes This Month", () => {
    expect(computePeriodRange("ThisMonth", reference)).toEqual({ startDate: "2026-06-01", endDate: "2026-06-30" });
  });

  it("computes Last Month", () => {
    expect(computePeriodRange("LastMonth", reference)).toEqual({ startDate: "2026-05-01", endDate: "2026-05-31" });
  });

  it("computes Last Month correctly across a year boundary", () => {
    const january = new Date(2026, 0, 15);
    expect(computePeriodRange("LastMonth", january)).toEqual({ startDate: "2025-12-01", endDate: "2025-12-31" });
  });

  it("computes This Quarter", () => {
    expect(computePeriodRange("ThisQuarter", reference)).toEqual({ startDate: "2026-04-01", endDate: "2026-06-30" });
  });

  it("computes This Quarter for the first quarter", () => {
    const february = new Date(2026, 1, 10);
    expect(computePeriodRange("ThisQuarter", february)).toEqual({ startDate: "2026-01-01", endDate: "2026-03-31" });
  });

  it("computes This Quarter for the last quarter", () => {
    const november = new Date(2026, 10, 1);
    expect(computePeriodRange("ThisQuarter", november)).toEqual({ startDate: "2026-10-01", endDate: "2026-12-31" });
  });

  it("computes This Year", () => {
    expect(computePeriodRange("ThisYear", reference)).toEqual({ startDate: "2026-01-01", endDate: "2026-12-31" });
  });
});
