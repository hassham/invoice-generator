import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RevenueReportView } from "./RevenueReportView";
import { TaxSummaryView } from "./TaxSummaryView";
import { RevenueByCustomerView } from "./RevenueByCustomerView";
import { OutstandingAndOverdueView } from "./OutstandingAndOverdueView";
import * as dashboardLib from "../../lib/dashboard";

vi.mock("../../lib/dashboard");

// IG-275: the PDF export button on each report view. These assert the button exists, calls the
// right client function, and - for the revenue report - passes the filters currently applied, which
// is the half of IG-275's criterion a frontend test can actually prove. Whether the resulting
// document contains the right figures is a backend concern, verified there.

// RevenueReportView derives its ranges from `new Date()`, so the clock is frozen. Only Date is
// faked: faking the timers userEvent relies on makes its interactions hang rather than fail.
const FROZEN_NOW = new Date(2026, 7, 15);

/** jsdom implements neither of these, and downloadExport uses both. */
function stubObjectUrl() {
  const createObjectURL = vi.fn(() => "blob:report");
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });
  return { createObjectURL, revokeObjectURL };
}

describe("report PDF export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN_NOW);
    stubObjectUrl();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports the revenue report as a PDF with the filters currently applied", async () => {
    vi.mocked(dashboardLib.getRevenueReport).mockResolvedValue({
      currency: "AUD",
      periodType: "month",
      periods: [{ period: "2026-08", revenue: 1000 }],
    });
    vi.mocked(dashboardLib.exportRevenueReportPdf).mockResolvedValue(new Blob(["%PDF-"]));

    render(<RevenueReportView />);
    await waitFor(() => expect(screen.getByText("2026-08")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    // The same period type and dates the on-screen table was loaded with - not defaults, and not
    // whatever the server would have guessed had they been omitted.
    expect(dashboardLib.exportRevenueReportPdf).toHaveBeenCalledWith(
      "month",
      "2026-08-01",
      "2026-08-31"
    );
  });

  it("follows the selected period type into the PDF export", async () => {
    vi.mocked(dashboardLib.getRevenueReport).mockResolvedValue({
      currency: "AUD",
      periodType: "quarter",
      periods: [{ period: "2026-Q3", revenue: 1000 }],
    });
    vi.mocked(dashboardLib.exportRevenueReportPdf).mockResolvedValue(new Blob(["%PDF-"]));

    render(<RevenueReportView />);
    await waitFor(() => expect(screen.getByRole("button", { name: "By Quarter" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "By Quarter" }));
    await waitFor(() => expect(screen.getByText("2026-Q3")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    expect(dashboardLib.exportRevenueReportPdf).toHaveBeenCalledWith(
      "quarter",
      expect.any(String),
      expect.any(String)
    );
  });

  it("leaves the CSV export alone when the PDF button is used", async () => {
    vi.mocked(dashboardLib.getRevenueReport).mockResolvedValue({
      currency: "AUD",
      periodType: "month",
      periods: [{ period: "2026-08", revenue: 1000 }],
    });
    vi.mocked(dashboardLib.exportRevenueReportPdf).mockResolvedValue(new Blob(["%PDF-"]));

    render(<RevenueReportView />);
    await waitFor(() => expect(screen.getByText("2026-08")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    expect(dashboardLib.exportRevenueReportCsv).not.toHaveBeenCalled();
  });

  it("surfaces a failed PDF export instead of failing silently", async () => {
    vi.mocked(dashboardLib.getRevenueReport).mockResolvedValue({
      currency: "AUD",
      periodType: "month",
      periods: [{ period: "2026-08", revenue: 1000 }],
    });
    vi.mocked(dashboardLib.exportRevenueReportPdf).mockRejectedValue(
      new Error("Failed to export revenue report.")
    );

    render(<RevenueReportView />);
    await waitFor(() => expect(screen.getByText("2026-08")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    // A download that quietly does nothing is the worst outcome here: the user has no way to tell
    // a failed export from a browser that swallowed the file.
    await waitFor(() =>
      expect(screen.getByText(/Failed to export revenue report/)).toBeInTheDocument()
    );
  });

  it("exports the tax summary as a PDF", async () => {
    vi.mocked(dashboardLib.getTaxSummary).mockResolvedValue({
      currency: "AUD",
      totalTaxableAmount: 1000,
      totalTaxCollected: 100,
      taxesByRate: [{ taxRate: 10, taxableAmount: 1000, taxCollected: 100 }],
    });
    vi.mocked(dashboardLib.exportTaxSummaryPdf).mockResolvedValue(new Blob(["%PDF-"]));

    render(<TaxSummaryView />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Export to PDF" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    expect(dashboardLib.exportTaxSummaryPdf).toHaveBeenCalled();
  });

  it("exports revenue by customer as a PDF", async () => {
    vi.mocked(dashboardLib.getRevenueByCustomer).mockResolvedValue([
      { customerId: "c1", customerName: "Acme Pty Ltd", currency: "AUD", revenue: 1000 },
    ]);
    vi.mocked(dashboardLib.exportRevenueByCustomerPdf).mockResolvedValue(new Blob(["%PDF-"]));

    render(<RevenueByCustomerView />);
    await waitFor(() => expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    expect(dashboardLib.exportRevenueByCustomerPdf).toHaveBeenCalled();
  });

  it("exports outstanding invoices as a PDF", async () => {
    vi.mocked(dashboardLib.getOutstandingReport).mockResolvedValue([
      {
        id: "i1",
        invoiceNumber: "INV-0001",
        customerName: "Acme Pty Ltd",
        issueDate: "2026-08-01",
        dueDate: "2026-08-15",
        currency: "AUD",
        amountDue: 550,
        status: "Draft",
      },
    ]);
    vi.mocked(dashboardLib.exportOutstandingInvoicesPdf).mockResolvedValue(new Blob(["%PDF-"]));

    render(<OutstandingAndOverdueView type="outstanding" />);
    await waitFor(() => expect(screen.getByText("INV-0001")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    expect(dashboardLib.exportOutstandingInvoicesPdf).toHaveBeenCalled();
    expect(dashboardLib.exportOverdueInvoicesPdf).not.toHaveBeenCalled();
  });

  it("exports overdue invoices through its own endpoint, not the outstanding one", async () => {
    vi.mocked(dashboardLib.getOverdueReport).mockResolvedValue([
      {
        id: "i2",
        invoiceNumber: "INV-0002",
        customerName: "Globex Corp",
        issueDate: "2026-07-01",
        dueDate: "2026-07-15",
        currency: "AUD",
        amountDue: 220,
        status: "Draft",
        daysOverdue: 31,
      },
    ]);
    vi.mocked(dashboardLib.exportOverdueInvoicesPdf).mockResolvedValue(new Blob(["%PDF-"]));

    render(<OutstandingAndOverdueView type="overdue" />);
    await waitFor(() => expect(screen.getByText("INV-0002")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Export to PDF" }));

    // The two reports share one component, so this is the assertion that keeps the overdue view
    // from quietly exporting the outstanding report.
    expect(dashboardLib.exportOverdueInvoicesPdf).toHaveBeenCalled();
    expect(dashboardLib.exportOutstandingInvoicesPdf).not.toHaveBeenCalled();
  });
});
