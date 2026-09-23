import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OutstandingAndOverdueView } from "./OutstandingAndOverdueView";
import * as dashboardLib from "../../lib/dashboard";

vi.mock("../../lib/dashboard");
vi.mock("next/link", () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

describe("OutstandingAndOverdueView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(dashboardLib.getOutstandingReport).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<OutstandingAndOverdueView type="outstanding" />);
    expect(screen.getByText("Loading outstanding invoices...")).toBeInTheDocument();
  });

  it("displays outstanding invoices", async () => {
    const mockInvoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        customerName: "Acme Corp",
        issueDate: "2026-09-01",
        dueDate: "2026-09-15",
        currency: "USD",
        amountDue: 1500,
        status: "Sent",
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-002",
        customerName: "Tech Startup",
        issueDate: "2026-09-10",
        dueDate: "2026-09-20",
        currency: "USD",
        amountDue: 2500,
        status: "Sent",
      },
    ];

    vi.mocked(dashboardLib.getOutstandingReport).mockResolvedValue(mockInvoices);

    render(<OutstandingAndOverdueView type="outstanding" />);

    await waitFor(() => {
      expect(screen.getByText("Outstanding Invoices")).toBeInTheDocument();
      expect(screen.getByText("INV-001")).toBeInTheDocument();
      expect(screen.getByText("INV-002")).toBeInTheDocument();
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Tech Startup")).toBeInTheDocument();
    });

    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
    expect(screen.getByText("$2,500.00")).toBeInTheDocument();
  });

  it("displays overdue invoices", async () => {
    const mockInvoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        customerName: "Late Payer Inc",
        issueDate: "2026-08-01",
        dueDate: "2026-08-15",
        currency: "AUD",
        amountDue: 3000,
        status: "Sent",
      },
    ];

    vi.mocked(dashboardLib.getOverdueReport).mockResolvedValue(mockInvoices);

    render(<OutstandingAndOverdueView type="overdue" />);

    await waitFor(() => {
      expect(screen.getByText("Overdue Invoices")).toBeInTheDocument();
      expect(screen.getByText("INV-001")).toBeInTheDocument();
      expect(screen.getByText("Late Payer Inc")).toBeInTheDocument();
    });

    expect(screen.getByText("A$3,000.00")).toBeInTheDocument();
  });

  it("displays empty state for outstanding", async () => {
    vi.mocked(dashboardLib.getOutstandingReport).mockResolvedValue([]);

    render(<OutstandingAndOverdueView type="outstanding" />);

    await waitFor(() => {
      expect(screen.getByText("No outstanding invoices - all paid up!")).toBeInTheDocument();
    });
  });

  it("displays empty state for overdue", async () => {
    vi.mocked(dashboardLib.getOverdueReport).mockResolvedValue([]);

    render(<OutstandingAndOverdueView type="overdue" />);

    await waitFor(() => {
      expect(screen.getByText("No overdue invoices - great work!")).toBeInTheDocument();
    });
  });

  it("displays error message on fetch failure", async () => {
    vi.mocked(dashboardLib.getOutstandingReport).mockRejectedValue(new Error("API error"));

    render(<OutstandingAndOverdueView type="outstanding" />);

    await waitFor(() => {
      expect(screen.getByText(/Error: API error/)).toBeInTheDocument();
    });
  });

  it("shows total invoice count", async () => {
    const mockInvoices = [
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        customerName: "Customer A",
        issueDate: "2026-09-01",
        dueDate: "2026-09-15",
        currency: "USD",
        amountDue: 1000,
        status: "Sent",
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-002",
        customerName: "Customer B",
        issueDate: "2026-09-10",
        dueDate: "2026-09-20",
        currency: "USD",
        amountDue: 2000,
        status: "Sent",
      },
    ];

    vi.mocked(dashboardLib.getOutstandingReport).mockResolvedValue(mockInvoices);

    render(<OutstandingAndOverdueView type="outstanding" />);

    await waitFor(() => {
      expect(screen.getByText("2 invoices")).toBeInTheDocument();
    });
  });
});
