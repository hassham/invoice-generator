import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTemplates, type Template } from "../../../../invoice/create/lib/templates";
import { updateInvoice } from "../../../../invoice/create/lib/invoiceSave";
import { getInvoice, type InvoiceDetail as InvoiceDetailData } from "../../../../lib/invoiceDetail";
import { InvoiceDetail } from "./InvoiceDetail";

vi.mock("../../../../invoice/create/lib/templates", () => ({
  fetchTemplates: vi.fn(),
}));

vi.mock("../../../../lib/invoiceDetail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/invoiceDetail")>()),
  getInvoice: vi.fn(),
}));

vi.mock("../../../../invoice/create/lib/invoiceSave", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../invoice/create/lib/invoiceSave")>()),
  updateInvoice: vi.fn(),
}));

const mockedFetchTemplates = vi.mocked(fetchTemplates);
const mockedGetInvoice = vi.mocked(getInvoice);
const mockedUpdateInvoice = vi.mocked(updateInvoice);

const STUB_TEMPLATES: Template[] = [
  { id: "template-classic", name: "Classic", templateCode: "classic", previewImage: null, isPremium: false, sortOrder: 1 },
];

const sampleDetail: InvoiceDetailData = {
  id: "invoice-1",
  customerId: "customer-1",
  invoiceNumber: "INV-000001",
  status: "Draft",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  reference: null,
  currency: "AUD",
  seller: "Acme Pty Ltd",
  customer: "Jane's Cafe",
  shipTo: null,
  items: [{ description: "Consulting", quantity: 2, unit: null, unitPrice: 100, taxRate: 10, discount: 0 }],
  invoiceDiscountType: "None",
  invoiceDiscountValue: null,
  notes: null,
  terms: null,
  paymentInstructions: null,
  templateId: "template-classic",
  templateCustomization: { primaryColor: "#0f172a", accentColor: "#0f172a", font: "Arial, Helvetica, sans-serif", headerStyle: "Banner" },
  subtotal: 200,
  discountAmount: 0,
  taxAmount: 20,
  totalAmount: 220,
  amountPaid: 0,
  amountDue: 220,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("InvoiceDetail", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before the invoice resolves", () => {
    mockedGetInvoice.mockReturnValue(new Promise(() => {}));
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);

    render(<InvoiceDetail invoiceId="invoice-1" />);

    expect(screen.getByText("Loading invoice…")).toBeInTheDocument();
  });

  it("shows an error state when the invoice fails to load", async () => {
    mockedGetInvoice.mockRejectedValue(new Error("Invoice not found."));
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);

    render(<InvoiceDetail invoiceId="missing" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Invoice not found.");
  });

  it("loads the invoice and pre-fills the form", async () => {
    mockedGetInvoice.mockResolvedValue(sampleDetail);
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);

    render(<InvoiceDetail invoiceId="invoice-1" />);

    expect(await screen.findByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");
    expect(screen.getByLabelText("Bill To", { exact: false })).toHaveValue("Jane's Cafe");
    expect(screen.getByLabelText(/Invoice Number/)).toHaveValue("INV-000001");
    expect(screen.getByLabelText("Description", { exact: false })).toHaveValue("Consulting");
    expect(screen.getByRole("heading", { name: "INV-000001" })).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows a Paid warning banner when the invoice status is Paid, but keeps the form editable", async () => {
    mockedGetInvoice.mockResolvedValue({ ...sampleDetail, status: "Paid" });
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);

    render(<InvoiceDetail invoiceId="invoice-1" />);

    expect(await screen.findByText(/marked Paid/)).toBeInTheDocument();
    expect(screen.getByLabelText("From", { exact: false })).not.toBeDisabled();
  });

  it("saves changes and shows a Saved status", async () => {
    mockedGetInvoice.mockResolvedValue(sampleDetail);
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);
    mockedUpdateInvoice.mockResolvedValue(sampleDetail);
    const user = userEvent.setup();

    render(<InvoiceDetail invoiceId="invoice-1" />);
    await screen.findByLabelText("From", { exact: false });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
    expect(mockedUpdateInvoice).toHaveBeenCalledWith("invoice-1", expect.objectContaining({ invoiceNumber: "INV-000001" }));
  });

  it("shows a retryable error banner when saving fails", async () => {
    mockedGetInvoice.mockResolvedValue(sampleDetail);
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);
    mockedUpdateInvoice.mockRejectedValueOnce(new Error("An invoice with this number already exists."));
    mockedUpdateInvoice.mockResolvedValueOnce(sampleDetail);
    const user = userEvent.setup();

    render(<InvoiceDetail invoiceId="invoice-1" />);
    await screen.findByLabelText("From", { exact: false });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("An invoice with this number already exists.");

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
  });

  it("blocks saving an invalid invoice and shows field-level errors", async () => {
    mockedGetInvoice.mockResolvedValue({ ...sampleDetail, invoiceNumber: "" });
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);
    const user = userEvent.setup();

    render(<InvoiceDetail invoiceId="invoice-1" />);
    await screen.findByLabelText("From", { exact: false });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Invoice Number is required.")).toBeInTheDocument();
    expect(mockedUpdateInvoice).not.toHaveBeenCalled();
  });

  it("edits the free-text Payment Instructions field and includes it in the save payload", async () => {
    mockedGetInvoice.mockResolvedValue({ ...sampleDetail, paymentInstructions: "Bank Name: Big Bank" });
    mockedFetchTemplates.mockResolvedValue(STUB_TEMPLATES);
    mockedUpdateInvoice.mockResolvedValue(sampleDetail);
    const user = userEvent.setup();

    render(<InvoiceDetail invoiceId="invoice-1" />);
    const paymentField = await screen.findByLabelText("Payment Instructions");
    expect(paymentField).toHaveValue("Bank Name: Big Bank");

    await user.type(paymentField, "\nPay within 14 days");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockedUpdateInvoice).toHaveBeenCalledWith(
        "invoice-1",
        expect.objectContaining({ customInstructions: "Bank Name: Big Bank\nPay within 14 days", paymentInstructions: null }),
      ),
    );
  });
});
