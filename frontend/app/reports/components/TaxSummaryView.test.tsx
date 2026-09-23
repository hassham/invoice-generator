import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaxSummaryView } from "./TaxSummaryView";
import * as dashboardLib from "../../lib/dashboard";

vi.mock("../../lib/dashboard");

describe("TaxSummaryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(dashboardLib.getTaxSummary).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TaxSummaryView />);
    expect(screen.getByText("Loading tax summary...")).toBeInTheDocument();
  });

  it("displays tax summary with taxes by rate", async () => {
    const mockData = {
      currency: "USD",
      totalTaxableAmount: 10000,
      totalTaxCollected: 1000,
      taxesByRate: [
        { taxRate: 10, taxableAmount: 10000, taxCollected: 1000 },
      ],
    };

    vi.mocked(dashboardLib.getTaxSummary).mockResolvedValue(mockData);

    render(<TaxSummaryView />);

    await waitFor(() => {
      expect(screen.queryByText("Loading tax summary...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Tax Summary")).toBeInTheDocument();
    expect(screen.getAllByText("Taxable Amount").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tax Collected").length).toBeGreaterThan(0);
    expect(screen.getByText("10.00%")).toBeInTheDocument();
  });

  it("displays multiple tax rates", async () => {
    const mockData = {
      currency: "AUD",
      totalTaxableAmount: 15000,
      totalTaxCollected: 1500,
      taxesByRate: [
        { taxRate: 10, taxableAmount: 10000, taxCollected: 1000 },
        { taxRate: 5, taxableAmount: 5000, taxCollected: 250 },
      ],
    };

    vi.mocked(dashboardLib.getTaxSummary).mockResolvedValue(mockData);

    render(<TaxSummaryView />);

    await waitFor(() => {
      expect(screen.getByText("10.00%")).toBeInTheDocument();
      expect(screen.getByText("5.00%")).toBeInTheDocument();
      expect(screen.getByText("A$15,000.00")).toBeInTheDocument();
      expect(screen.getByText("A$1,500.00")).toBeInTheDocument();
    });
  });

  it("displays empty state when no tax collected", async () => {
    const mockData = {
      currency: "USD",
      totalTaxableAmount: 0,
      totalTaxCollected: 0,
      taxesByRate: [],
    };

    vi.mocked(dashboardLib.getTaxSummary).mockResolvedValue(mockData);

    render(<TaxSummaryView />);

    await waitFor(() => {
      expect(screen.getByText("No tax collected for this period")).toBeInTheDocument();
    });
  });

  it("displays error message on fetch failure", async () => {
    vi.mocked(dashboardLib.getTaxSummary).mockRejectedValue(new Error("API error"));

    render(<TaxSummaryView />);

    await waitFor(() => {
      expect(screen.getByText(/Error: API error/)).toBeInTheDocument();
    });
  });

  it("displays disclaimer about tax calculation timing", async () => {
    const mockData = {
      currency: "USD",
      totalTaxableAmount: 1000,
      totalTaxCollected: 100,
      taxesByRate: [{ taxRate: 10, taxableAmount: 1000, taxCollected: 100 }],
    };

    vi.mocked(dashboardLib.getTaxSummary).mockResolvedValue(mockData);

    render(<TaxSummaryView />);

    await waitFor(() => {
      expect(
        screen.getByText(/Based on invoices issued in the current month/)
      ).toBeInTheDocument();
    });
  });
});
