import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDashboardSummary } from "../../lib/dashboard";
import { DashboardView } from "./DashboardView";

vi.mock("../../lib/dashboard", () => ({
  getDashboardSummary: vi.fn(),
}));

const mockedGetDashboardSummary = vi.mocked(getDashboardSummary);

const sampleInvoice = {
  id: "inv-1",
  invoiceNumber: "INV-0001",
  customerName: "Acme Pty Ltd",
  status: "Draft",
  issueDate: "2026-06-01",
  dueDate: "2026-06-15",
  currency: "AUD",
  totalAmount: 220,
  amountDue: 220,
};

const sampleSummary = {
  totalInvoiced: 220,
  totalPaid: 0,
  outstanding: 220,
  overdue: 0,
  currency: "AUD",
  recentInvoices: [sampleInvoice],
};

describe("DashboardView", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before the summary resolves", () => {
    mockedGetDashboardSummary.mockReturnValue(new Promise(() => {}));

    render(<DashboardView />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");
  });

  it("shows an error state when the summary fails to load", async () => {
    mockedGetDashboardSummary.mockRejectedValue(new Error("Your session has expired. Please sign in again."));

    render(<DashboardView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("shows the FSD empty state instead of $0 cards when there are no invoices at all", async () => {
    mockedGetDashboardSummary.mockResolvedValue({ totalInvoiced: 0, totalPaid: 0, outstanding: 0, overdue: 0, currency: "AUD", recentInvoices: [] });

    render(<DashboardView />);

    expect(await screen.findByText("Create your first invoice.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Invoice" })).toHaveAttribute("href", "/invoice/create");
    expect(screen.queryByText("Total Invoiced")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New invoice" })).not.toBeInTheDocument();
  });

  it("renders the summary cards and recent invoices when data exists", async () => {
    mockedGetDashboardSummary.mockResolvedValue(sampleSummary);

    render(<DashboardView />);

    expect(await screen.findByText("Total Invoiced")).toBeInTheDocument();
    expect(screen.getAllByText("AUD 220.00").length).toBeGreaterThan(0);
    expect(screen.getByText("INV-0001")).toBeInTheDocument();
    expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice INV-0001" })).toHaveAttribute("href", "/documents/invoices/inv-1");
    expect(screen.getByRole("link", { name: "View all invoices" })).toHaveAttribute("href", "/documents/invoices");
  });

  it("offers a review action only when the period has an overdue balance", async () => {
    mockedGetDashboardSummary.mockResolvedValue({ ...sampleSummary, overdue: 120 });
    render(<DashboardView />);
    expect(await screen.findByRole("heading", { name: "Needs attention" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Review overdue invoices" })).toHaveAttribute("href", "/reports/overdue");
  });


  it("distinguishes the selected period's activity from today's balances", async () => {
    mockedGetDashboardSummary.mockResolvedValue({ ...sampleSummary, overdue: 120 });

    render(<DashboardView />);

    expect(await screen.findByText("Issued in the selected period")).toBeVisible();
    expect(screen.getByText("Paid on invoices from this period")).toBeVisible();
    expect(screen.getByText("Unpaid balance today")).toBeVisible();
    expect(screen.getByText("AUD 120.00 overdue today.")).toBeVisible();
    expect(screen.getByText("Your latest invoices, regardless of the selected period.")).toBeVisible();
  });

  it("keeps all invoice data in one labelled table, with readable dates and labelled row actions", async () => {
    mockedGetDashboardSummary.mockResolvedValue({
      ...sampleSummary,
      recentInvoices: [{ ...sampleInvoice, status: "PartiallyPaid", currency: "USD", totalAmount: 1234.5 }],
    });

    render(<DashboardView />);

    const table = await screen.findByRole("table", { name: "Recent Invoices" });
    const invoice = within(table);
    expect(invoice.getAllByRole("columnheader")).toHaveLength(8);
    expect(invoice.getByText("1 June 2026")).toHaveAttribute("datetime", "2026-06-01");
    expect(invoice.getByText("Partially paid")).toBeVisible();
    expect(invoice.getByText("USD 1,234.50").closest("td")).toHaveAttribute("headers", "recent-amount");
    expect(invoice.getByRole("link", { name: "View invoice INV-0001" })).toHaveAttribute("href", "/documents/invoices/inv-1");
  });

  it("rejects a reversed custom range without fetching or mislabelling the last loaded totals", async () => {
    mockedGetDashboardSummary.mockResolvedValue(sampleSummary);
    const user = userEvent.setup();
    render(<DashboardView />);

    expect(await screen.findByText("This Month", { selector: "strong" })).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Period"), "Custom");
    await user.type(screen.getByLabelText("Start date"), "2026-06-20");
    await user.type(screen.getByLabelText("End date"), "2026-06-01");

    expect(screen.getByText("End date must be on or after the start date.")).toBeVisible();
    expect(screen.getByLabelText("End date")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("This Month", { selector: "strong" })).toBeVisible();
    expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(1);
  });

  it("does not show totals on a load failure and can retry the same period", async () => {
    mockedGetDashboardSummary.mockRejectedValueOnce(new Error("Service unavailable")).mockResolvedValueOnce(sampleSummary);
    const user = userEvent.setup();
    render(<DashboardView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    expect(screen.queryByText("Total Invoiced")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Total Invoiced")).toBeVisible();
    expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(2);
    expect(mockedGetDashboardSummary.mock.calls[0]).toEqual(mockedGetDashboardSummary.mock.calls[1]);
  });

  it("defaults to This Month, requesting the computed current-month range", async () => {
    mockedGetDashboardSummary.mockResolvedValue(sampleSummary);

    render(<DashboardView />);

    await waitFor(() => expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(1));
    const [startDate, endDate] = mockedGetDashboardSummary.mock.calls[0];
    expect(startDate).toMatch(/^\d{4}-\d{2}-01$/);
    expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByLabelText("Period")).toHaveValue("ThisMonth");
  });

  it("re-fetches with a computed range when a different preset is chosen", async () => {
    mockedGetDashboardSummary.mockResolvedValue(sampleSummary);
    const user = userEvent.setup();
    render(<DashboardView />);
    await waitFor(() => expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText("Period"), "ThisYear");

    await waitFor(() => expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(2));
    const [startDate, endDate] = mockedGetDashboardSummary.mock.calls[1];
    expect(startDate).toMatch(/^\d{4}-01-01$/);
    expect(endDate).toMatch(/^\d{4}-12-31$/);
  });

  it("only fetches once both Custom dates are filled in", async () => {
    mockedGetDashboardSummary.mockResolvedValue(sampleSummary);
    const user = userEvent.setup();
    render(<DashboardView />);
    await waitFor(() => expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText("Period"), "Custom");
    // Selecting "Custom" alone shouldn't trigger a new (invalid, dateless) fetch.
    expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText("Start date"), "2026-01-01");
    expect(mockedGetDashboardSummary).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText("End date"), "2026-01-31");

    await waitFor(() => expect(mockedGetDashboardSummary).toHaveBeenLastCalledWith("2026-01-01", "2026-01-31"));
  });
});
