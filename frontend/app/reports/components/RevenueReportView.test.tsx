import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RevenueReportView } from "./RevenueReportView";
import * as dashboardLib from "../../lib/dashboard";

vi.mock("../../lib/dashboard");

// The component derives its date ranges from `new Date()`, so the clock is frozen mid-Q3 to keep
// the range assertions below deterministic. Only Date is faked: faking the timers userEvent relies
// on makes its interactions hang rather than fail.
const FROZEN_NOW = new Date(2026, 7, 15);

describe("RevenueReportView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders loading state initially", () => {
    vi.mocked(dashboardLib.getRevenueReport).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RevenueReportView />);
    expect(screen.getByText("Loading revenue report...")).toBeInTheDocument();
  });

  it("displays revenue report with month data", async () => {
    const mockReport = {
      currency: "USD",
      periodType: "month",
      periods: [
        { period: "2026-09", revenue: 1000 },
        { period: "2026-10", revenue: 2000 },
      ],
    };

    vi.mocked(dashboardLib.getRevenueReport).mockResolvedValue(mockReport);

    render(<RevenueReportView />);

    await waitFor(() => {
      expect(screen.getByText("2026-09")).toBeInTheDocument();
      expect(screen.getByText("2026-10")).toBeInTheDocument();
    });

    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
    expect(screen.getByText("$2,000.00")).toBeInTheDocument();
  });

  it("switches between period types with appropriate date ranges", async () => {
    const monthReport = {
      currency: "USD",
      periodType: "month",
      periods: [{ period: "2026-09", revenue: 1000 }],
    };

    const quarterReport = {
      currency: "USD",
      periodType: "quarter",
      periods: [{ period: "2026-Q3", revenue: 3000 }],
    };

    vi.mocked(dashboardLib.getRevenueReport)
      .mockResolvedValueOnce(monthReport)
      .mockResolvedValueOnce(quarterReport);

    const user = userEvent.setup();
    render(<RevenueReportView />);

    await waitFor(() => {
      expect(screen.getByText("2026-09")).toBeInTheDocument();
    });

    const quarterButton = screen.getByRole("button", { name: /By Quarter/i });
    await user.click(quarterButton);

    await waitFor(() => {
      expect(screen.getByText("2026-Q3")).toBeInTheDocument();
    });

    // Frozen at 2026-08-15, so the enclosing quarter is Q3: 1 Jul to 30 Sep.
    expect(dashboardLib.getRevenueReport).toHaveBeenLastCalledWith(
      "quarter",
      "2026-07-01",
      "2026-09-30"
    );
  });

  it("displays error message on fetch failure", async () => {
    vi.mocked(dashboardLib.getRevenueReport).mockRejectedValue(
      new Error("API error")
    );

    render(<RevenueReportView />);

    await waitFor(() => {
      expect(screen.getByText(/Error: API error/)).toBeInTheDocument();
    });
  });

  it("displays message when no revenue is recorded", async () => {
    const mockReport = {
      currency: "USD",
      periodType: "month",
      periods: [
        { period: "2026-09", revenue: 0 },
        { period: "2026-10", revenue: 0 },
      ],
    };

    vi.mocked(dashboardLib.getRevenueReport).mockResolvedValue(mockReport);

    render(<RevenueReportView />);

    await waitFor(() => {
      expect(screen.getByText("No revenue recorded for this period")).toBeInTheDocument();
    });
  });

  it("requests full year data when period type is year", async () => {
    const monthReport = {
      currency: "USD",
      periodType: "month",
      periods: [{ period: "2026-09", revenue: 1000 }],
    };

    const yearReport = {
      currency: "USD",
      periodType: "year",
      periods: [{ period: "2026", revenue: 5000 }],
    };

    vi.mocked(dashboardLib.getRevenueReport)
      .mockResolvedValueOnce(monthReport)
      .mockResolvedValueOnce(yearReport);

    const user = userEvent.setup();
    render(<RevenueReportView />);

    await waitFor(() => {
      expect(screen.getByText("2026-09")).toBeInTheDocument();
    });

    const yearButton = screen.getByRole("button", { name: /By Year/i });
    await user.click(yearButton);

    await waitFor(() => {
      expect(dashboardLib.getRevenueReport).toHaveBeenLastCalledWith(
        "year",
        "2026-01-01",
        "2026-12-31"
      );
    });
  });
});
