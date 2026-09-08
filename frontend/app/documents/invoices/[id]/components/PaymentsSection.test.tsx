import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listPayments, recordPayment, removePayment, type Payment } from "../../../../lib/payments";
import { PaymentsSection } from "./PaymentsSection";

vi.mock("../../../../lib/payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/payments")>()),
  listPayments: vi.fn(),
  recordPayment: vi.fn(),
  removePayment: vi.fn(),
}));

const mockedListPayments = vi.mocked(listPayments);
const mockedRecordPayment = vi.mocked(recordPayment);
const mockedRemovePayment = vi.mocked(removePayment);

const onInvoiceUpdated = vi.fn();

const SAMPLE_PAYMENT: Payment = {
  id: "payment-1",
  invoiceId: "invoice-1",
  paymentDate: "2030-08-05",
  amount: 40,
  paymentMethod: "Cash",
  reference: "REF-1",
  notes: null,
  createdAt: "2030-08-05T00:00:00Z",
};

describe("PaymentsSection", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a message when there are no payments yet", async () => {
    mockedListPayments.mockResolvedValue([]);

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Draft" amountDue={100} onInvoiceUpdated={onInvoiceUpdated} />);

    expect(await screen.findByText("No payments recorded yet.")).toBeInTheDocument();
  });

  it("lists existing payments", async () => {
    mockedListPayments.mockResolvedValue([SAMPLE_PAYMENT]);

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Draft" amountDue={100} onInvoiceUpdated={onInvoiceUpdated} />);

    expect(await screen.findByText("2030-08-05")).toBeInTheDocument();
    expect(screen.getByText("AUD 40.00")).toBeInTheDocument();
    expect(screen.getByText("REF-1")).toBeInTheDocument();
  });

  it("shows a load error when the payment history fails to load", async () => {
    mockedListPayments.mockRejectedValue(new Error("Failed to load payments for this invoice."));

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Draft" amountDue={100} onInvoiceUpdated={onInvoiceUpdated} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load payments for this invoice.");
  });

  it("pre-fills the amount with the current outstanding balance and records a payment", async () => {
    mockedListPayments.mockResolvedValue([]);
    mockedRecordPayment.mockResolvedValue({
      payment: SAMPLE_PAYMENT,
      invoice: { id: "invoice-1", status: "PartiallyPaid", amountPaid: 40, amountDue: 60, updatedAt: "2030-08-05T00:00:00Z" },
    });
    const user = userEvent.setup();

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Draft" amountDue={100} onInvoiceUpdated={onInvoiceUpdated} />);
    await screen.findByText("No payments recorded yet.");

    expect(screen.getByLabelText("Amount")).toHaveValue(100);

    await user.click(screen.getByRole("button", { name: "Record Payment" }));

    await waitFor(() =>
      expect(mockedRecordPayment).toHaveBeenCalledWith(
        "invoice-1",
        expect.objectContaining({ amount: 100, paymentMethod: "Cash" }),
      ),
    );
    expect(onInvoiceUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PartiallyPaid", amountPaid: 40, amountDue: 60 }),
    );
  });

  it("shows the server's error when recording a payment is rejected", async () => {
    mockedListPayments.mockResolvedValue([]);
    mockedRecordPayment.mockRejectedValue(new Error("Amount cannot exceed the outstanding balance of 100.00."));
    const user = userEvent.setup();

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Draft" amountDue={100} onInvoiceUpdated={onInvoiceUpdated} />);
    await screen.findByText("No payments recorded yet.");

    await user.click(screen.getByRole("button", { name: "Record Payment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Amount cannot exceed the outstanding balance of 100.00.");
    expect(onInvoiceUpdated).not.toHaveBeenCalled();
  });

  it("rejects a non-positive amount client-side without calling the server", async () => {
    mockedListPayments.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Draft" amountDue={100} onInvoiceUpdated={onInvoiceUpdated} />);
    await screen.findByText("No payments recorded yet.");

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "0");
    await user.click(screen.getByRole("button", { name: "Record Payment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Amount must be greater than zero.");
    expect(mockedRecordPayment).not.toHaveBeenCalled();
  });

  it("removes a payment and reports the updated invoice summary", async () => {
    mockedListPayments.mockResolvedValue([SAMPLE_PAYMENT]);
    mockedRemovePayment.mockResolvedValue({ id: "invoice-1", status: "Draft", amountPaid: 0, amountDue: 100, updatedAt: "2030-08-06T00:00:00Z" });
    const user = userEvent.setup();

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="PartiallyPaid" amountDue={60} onInvoiceUpdated={onInvoiceUpdated} />);
    await screen.findByText("2030-08-05");

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(mockedRemovePayment).toHaveBeenCalledWith("invoice-1", "payment-1"));
    expect(onInvoiceUpdated).toHaveBeenCalledWith(expect.objectContaining({ status: "Draft", amountPaid: 0, amountDue: 100 }));
    expect(screen.queryByText("2030-08-05")).not.toBeInTheDocument();
  });

  it("hides the record-payment form when the invoice is cancelled", async () => {
    mockedListPayments.mockResolvedValue([]);

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Cancelled" amountDue={100} onInvoiceUpdated={onInvoiceUpdated} />);

    await screen.findByText("Payments cannot be added to a cancelled invoice.");
    expect(screen.queryByRole("button", { name: "Record Payment" })).not.toBeInTheDocument();
  });

  it("hides the record-payment form when the invoice is fully paid", async () => {
    mockedListPayments.mockResolvedValue([]);

    render(<PaymentsSection invoiceId="invoice-1" currency="AUD" status="Paid" amountDue={0} onInvoiceUpdated={onInvoiceUpdated} />);

    await screen.findByText("This invoice is fully paid.");
    expect(screen.queryByRole("button", { name: "Record Payment" })).not.toBeInTheDocument();
  });
});
