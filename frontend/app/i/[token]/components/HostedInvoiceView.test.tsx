import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHostedInvoice, hostedInvoicePdfUrl } from "../../lib/hostedInvoice";
import { HostedInvoiceView } from "./HostedInvoiceView";

vi.mock("../../lib/hostedInvoice", () => ({
  getHostedInvoice: vi.fn(),
  hostedInvoicePdfUrl: vi.fn((token: string) => `http://localhost:5094/api/v1/public/invoices/${token}/pdf`),
}));

const mockedGetHostedInvoice = vi.mocked(getHostedInvoice);

const SAMPLE = {
  businessName: "Acme Pty Ltd",
  logoUrl: "/api/v1/business/logo/business-1",
  invoiceNumber: "INV-000123",
  status: "Sent",
  issueDate: "2026-09-01",
  dueDate: "2026-09-15",
  currency: "AUD",
  totalAmount: 220,
  amountDue: 220,
};

describe("HostedInvoiceView", () => {
  it("shows a loading state before the fetch resolves", () => {
    mockedGetHostedInvoice.mockReturnValue(new Promise(() => {}));
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    expect(screen.getByText(/Loading invoice/)).toBeInTheDocument();
  });

  it("shows the business name, invoice number, amount due and status once loaded", async () => {
    mockedGetHostedInvoice.mockResolvedValue(SAMPLE);
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    expect(await screen.findByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByText("INV-000123")).toBeInTheDocument();
    // Appears twice: once under "Total", once under "Amount due" (both 220.00 in this fixture).
    expect(screen.getAllByText("AUD 220.00")).toHaveLength(2);
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("links Download PDF to the token's PDF endpoint", async () => {
    mockedGetHostedInvoice.mockResolvedValue(SAMPLE);
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    const link = await screen.findByRole("link", { name: "Download PDF" });
    expect(link).toHaveAttribute("href", hostedInvoicePdfUrl("qk6XMgWUVz9KbfJP"));
  });

  it("shows a generic not-found message on failure, matching the backend's own IG-215 behavior", async () => {
    mockedGetHostedInvoice.mockRejectedValue(new Error("This invoice could not be found. The link may be incorrect or the invoice may no longer be available."));
    render(<HostedInvoiceView token="does-not-exist" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be found/);
  });

  it("renders without a logo when none is set", async () => {
    mockedGetHostedInvoice.mockResolvedValue({ ...SAMPLE, logoUrl: null });
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    await screen.findByText("Acme Pty Ltd");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
