import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getInvoiceEmailHistory } from "../../../../lib/invoiceEmail";
import { InvoiceEmailHistorySection } from "./InvoiceEmailHistorySection";

vi.mock("../../../../lib/invoiceEmail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/invoiceEmail")>()),
  getInvoiceEmailHistory: vi.fn(),
}));

const mockedGetInvoiceEmailHistory = vi.mocked(getInvoiceEmailHistory);

describe("InvoiceEmailHistorySection", () => {
  it("shows a message when the invoice has never been emailed", async () => {
    mockedGetInvoiceEmailHistory.mockResolvedValue([]);
    render(<InvoiceEmailHistorySection invoiceId="invoice-1" />);

    expect(await screen.findByText("This invoice hasn't been emailed yet.")).toBeInTheDocument();
  });

  it("lists sent timestamp, recipients, subject and status for each entry", async () => {
    mockedGetInvoiceEmailHistory.mockResolvedValue([
      { id: "1", sentAt: "2026-09-01T10:00:00Z", to: ["customer@example.com"], cc: ["accounts@example.com"], subject: "Invoice INV-0001", status: "Sent" },
    ]);
    render(<InvoiceEmailHistorySection invoiceId="invoice-1" />);

    expect(await screen.findByText("Invoice INV-0001")).toBeInTheDocument();
    expect(screen.getByText("customer@example.com, accounts@example.com")).toBeInTheDocument();
    // "Sent" also appears as the "Sent" column header - scope to the status badge specifically.
    expect(screen.getByRole("cell", { name: "Sent" })).toBeInTheDocument();
  });

  it("shows a Failed status distinctly from Sent", async () => {
    mockedGetInvoiceEmailHistory.mockResolvedValue([
      { id: "1", sentAt: "2026-09-01T10:00:00Z", to: ["customer@example.com"], cc: [], subject: "Invoice INV-0001", status: "Failed" },
    ]);
    render(<InvoiceEmailHistorySection invoiceId="invoice-1" />);

    expect(await screen.findByText("Failed")).toBeInTheDocument();
  });

  it("shows when a sent email was opened, and how many times", async () => {
    mockedGetInvoiceEmailHistory.mockResolvedValue([
      {
        id: "1",
        sentAt: "2026-09-01T10:00:00Z",
        to: ["customer@example.com"],
        cc: [],
        subject: "Invoice INV-0001",
        status: "Sent",
        openedAt: "2026-09-02T09:00:00Z",
        openCount: 3,
      },
    ]);
    render(<InvoiceEmailHistorySection invoiceId="invoice-1" />);

    expect(await screen.findByText(/\(3 times\)/)).toBeInTheDocument();
    expect(screen.queryByText("Not opened yet")).not.toBeInTheDocument();
  });

  it("shows Not opened yet for a sent email with no recorded open, and Not sent for a failed one", async () => {
    mockedGetInvoiceEmailHistory.mockResolvedValue([
      { id: "1", sentAt: "2026-09-01T10:00:00Z", to: ["a@example.com"], cc: [], subject: "Invoice A", status: "Sent", openedAt: null, openCount: 0 },
      { id: "2", sentAt: "2026-09-02T10:00:00Z", to: ["b@example.com"], cc: [], subject: "Invoice B", status: "Failed", openedAt: null, openCount: 0 },
    ]);
    render(<InvoiceEmailHistorySection invoiceId="invoice-1" />);

    expect(await screen.findByText("Not opened yet")).toBeInTheDocument();
    expect(screen.getByText("Not sent")).toBeInTheDocument();
  });

  it("explains that not opened does not mean unread", async () => {
    mockedGetInvoiceEmailHistory.mockResolvedValue([
      { id: "1", sentAt: "2026-09-01T10:00:00Z", to: ["a@example.com"], cc: [], subject: "Invoice A", status: "Sent", openedAt: null, openCount: 0 },
    ]);
    render(<InvoiceEmailHistorySection invoiceId="invoice-1" />);

    expect(await screen.findByText(/best effort/)).toBeInTheDocument();
  });

  it("shows a load error instead of the table when the fetch fails", async () => {
    mockedGetInvoiceEmailHistory.mockRejectedValue(new Error("Failed to load the email history for this invoice."));
    render(<InvoiceEmailHistorySection invoiceId="invoice-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load the email history for this invoice.");
    expect(screen.queryByText("This invoice hasn't been emailed yet.")).not.toBeInTheDocument();
  });
});
