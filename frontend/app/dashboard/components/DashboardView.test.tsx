import { render, screen, waitFor } from "@testing-library/react";
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
  status: "Sent",
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

    expect(screen.getByText("Loading dashboard…")).toBeInTheDocument();
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
  });

  it("renders the summary cards and recent invoices when data exists", async () => {
    mockedGetDashboardSummary.mockResolvedValue(sampleSummary);

    render(<DashboardView />);

    expect(await screen.findByText("Total Invoiced")).toBeInTheDocument();
    expect(screen.getAllByText("AUD 220.00").length).toBeGreaterThan(0);
    expect(screen.getByText("INV-0001")).toBeInTheDocument();
    expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/documents/invoices/inv-1");
    expect(screen.getByRole("link", { name: "View all invoices" })).toHaveAttribute("href", "/documents/invoices");
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
