import { afterEach, describe, expect, it, vi } from "vitest";
import { getDashboardSummary } from "./dashboard";

const sampleSummary = {
  totalInvoiced: 500,
  totalPaid: 0,
  outstanding: 500,
  overdue: 0,
  currency: "AUD",
  recentInvoices: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getDashboardSummary", () => {
  it("sends credentials: include with no query params when no dates are given", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleSummary) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getDashboardSummary();

    expect(result).toEqual(sampleSummary);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:5094/api/v1/dashboard/summary");
    expect(init.credentials).toBe("include");
  });

  it("includes startDate/endDate as query params when given", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleSummary) });
    vi.stubGlobal("fetch", fetchMock);

    await getDashboardSummary("2026-06-01", "2026-06-30");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("startDate=2026-06-01");
    expect(url).toContain("endDate=2026-06-30");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Your session has expired. Please sign in again." }) }));

    await expect(getDashboardSummary()).rejects.toThrow("Your session has expired. Please sign in again.");
  });

  it("falls back to a generic message when the error response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("not json")) }));

    await expect(getDashboardSummary()).rejects.toThrow("Failed to load the dashboard.");
  });
});
