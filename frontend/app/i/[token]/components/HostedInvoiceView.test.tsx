import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmCheckoutSession, createCheckoutSession, getHostedInvoice, hostedInvoicePdfUrl } from "../../lib/hostedInvoice";
import { HostedInvoiceView } from "./HostedInvoiceView";

const replaceMock = vi.fn();
// IG-216: reads ?session_id=/?checkout= via useSearchParams and cleans the URL via
// useRouter().replace() - defaults to no query params; tests exercising the Checkout redirect
// override currentSearchParams per-test. Same mock shape as BusinessProfileSettings.test.tsx.
let currentSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("../../lib/hostedInvoice", () => ({
  getHostedInvoice: vi.fn(),
  hostedInvoicePdfUrl: vi.fn((token: string) => `http://localhost:5094/api/v1/public/invoices/${token}/pdf`),
  createCheckoutSession: vi.fn(),
  confirmCheckoutSession: vi.fn(),
}));

const mockedGetHostedInvoice = vi.mocked(getHostedInvoice);
const mockedCreateCheckoutSession = vi.mocked(createCheckoutSession);
const mockedConfirmCheckoutSession = vi.mocked(confirmCheckoutSession);

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
  hasStripeAccount: true,
};

describe("HostedInvoiceView", () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  });

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

  it("shows a Pay Now button when the business has Stripe connected and the invoice is unpaid", async () => {
    mockedGetHostedInvoice.mockResolvedValue(SAMPLE);
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    expect(await screen.findByRole("button", { name: "Pay Now" })).toBeInTheDocument();
  });

  it("hides Pay Now when the business has no Stripe account connected", async () => {
    mockedGetHostedInvoice.mockResolvedValue({ ...SAMPLE, hasStripeAccount: false });
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    await screen.findByText("Acme Pty Ltd");
    expect(screen.queryByRole("button", { name: "Pay Now" })).not.toBeInTheDocument();
  });

  it("hides Pay Now once the invoice is already paid", async () => {
    mockedGetHostedInvoice.mockResolvedValue({ ...SAMPLE, status: "Paid", amountDue: 0 });
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    await screen.findByText("Acme Pty Ltd");
    expect(screen.queryByRole("button", { name: "Pay Now" })).not.toBeInTheDocument();
  });

  it("redirects to the Stripe Checkout URL when Pay Now is clicked", async () => {
    mockedGetHostedInvoice.mockResolvedValue(SAMPLE);
    mockedCreateCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const navigations: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, set href(value: string) { navigations.push(value); } },
    });
    const user = userEvent.setup();
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    await user.click(await screen.findByRole("button", { name: "Pay Now" }));

    await waitFor(() => expect(navigations).toEqual(["https://checkout.stripe.com/c/pay/cs_test_1"]));
  });

  it("shows an error and re-enables Pay Now when session creation fails", async () => {
    mockedGetHostedInvoice.mockResolvedValue(SAMPLE);
    mockedCreateCheckoutSession.mockRejectedValue(new Error("This invoice can't be paid online right now."));
    const user = userEvent.setup();
    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    await user.click(await screen.findByRole("button", { name: "Pay Now" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/can't be paid online/);
    expect(screen.getByRole("button", { name: "Pay Now" })).not.toBeDisabled();
  });

  it("confirms the session and shows a payment-received banner after a successful Checkout redirect", async () => {
    currentSearchParams = new URLSearchParams({ session_id: "cs_test_1" });
    const paidInvoice = { ...SAMPLE, status: "Paid", amountDue: 0 };
    mockedGetHostedInvoice.mockResolvedValue(SAMPLE);
    mockedConfirmCheckoutSession.mockResolvedValue({ paid: true, invoice: paidInvoice });

    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    expect(await screen.findByRole("status")).toHaveTextContent(/Payment received/);
    expect(mockedConfirmCheckoutSession).toHaveBeenCalledWith("qk6XMgWUVz9KbfJP", "cs_test_1");
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/i/qk6XMgWUVz9KbfJP");
  });

  it("shows a cancelled notice, without confirming anything, after a cancelled Checkout redirect", async () => {
    currentSearchParams = new URLSearchParams({ checkout: "cancelled" });
    mockedGetHostedInvoice.mockResolvedValue(SAMPLE);

    render(<HostedInvoiceView token="qk6XMgWUVz9KbfJP" />);

    expect(await screen.findByRole("status")).toHaveTextContent(/cancelled/);
    expect(mockedConfirmCheckoutSession).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pay Now" })).toBeInTheDocument();
  });
});
