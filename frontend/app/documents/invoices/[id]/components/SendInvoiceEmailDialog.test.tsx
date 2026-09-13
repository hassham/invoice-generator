import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomer } from "../../../../lib/customers";
import { sendInvoiceEmail } from "../../../../lib/invoiceEmail";
import { SendInvoiceEmailDialog } from "./SendInvoiceEmailDialog";

vi.mock("../../../../lib/customers", () => ({
  getCustomer: vi.fn(),
}));

vi.mock("../../../../lib/invoiceEmail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/invoiceEmail")>()),
  sendInvoiceEmail: vi.fn(),
}));

const mockedGetCustomer = vi.mocked(getCustomer);
const mockedSendInvoiceEmail = vi.mocked(sendInvoiceEmail);

const CUSTOMER = {
  id: "customer-1",
  businessName: "Jane's Cafe",
  contactName: null,
  email: "jane@example.com",
  phone: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  taxNumber: null,
  notes: null,
  isArchived: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function renderDialog(overrides: Partial<Parameters<typeof SendInvoiceEmailDialog>[0]> = {}) {
  const onClose = vi.fn();
  const onSent = vi.fn();
  render(
    <SendInvoiceEmailDialog
      invoiceId="invoice-1"
      invoiceNumber="INV-0001"
      customerId="customer-1"
      onClose={onClose}
      onSent={onSent}
      {...overrides}
    />,
  );
  return { onClose, onSent };
}

describe("SendInvoiceEmailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pre-fills Recipient with the linked customer's email once loaded", async () => {
    mockedGetCustomer.mockResolvedValue(CUSTOMER);
    renderDialog();

    await waitFor(() => expect(screen.getByLabelText("Recipient")).toHaveValue("jane@example.com"));
  });

  it("leaves Recipient blank when the customer has no email on file", async () => {
    mockedGetCustomer.mockResolvedValue({ ...CUSTOMER, email: null });
    renderDialog();

    await waitFor(() => expect(mockedGetCustomer).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Recipient")).toHaveValue("");
  });

  it("pre-fills Subject and Message with sensible defaults referencing the invoice number", () => {
    mockedGetCustomer.mockResolvedValue({ ...CUSTOMER, email: null });
    renderDialog();

    expect(screen.getByLabelText("Subject")).toHaveValue("Invoice INV-0001");
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toContain("INV-0001");
  });

  it("sends the parsed To/Cc lists plus Subject/Message, then calls onSent", async () => {
    mockedGetCustomer.mockResolvedValue({ ...CUSTOMER, email: null });
    mockedSendInvoiceEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onSent } = renderDialog();

    await user.type(screen.getByLabelText("Recipient"), "customer@example.com, other@example.com");
    await user.type(screen.getByLabelText("CC"), "accounts@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockedSendInvoiceEmail).toHaveBeenCalledTimes(1));
    expect(mockedSendInvoiceEmail).toHaveBeenCalledWith("invoice-1", {
      to: ["customer@example.com", "other@example.com"],
      cc: ["accounts@example.com"],
      subject: "Invoice INV-0001",
      message: expect.stringContaining("INV-0001"),
    });
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it("shows an error and does not call onSent when sending fails", async () => {
    mockedGetCustomer.mockResolvedValue({ ...CUSTOMER, email: null });
    mockedSendInvoiceEmail.mockRejectedValue(new Error("At least one recipient is required."));
    const user = userEvent.setup();
    const { onSent } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("At least one recipient is required.");
    expect(onSent).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    mockedGetCustomer.mockResolvedValue({ ...CUSTOMER, email: null });
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape", async () => {
    mockedGetCustomer.mockResolvedValue({ ...CUSTOMER, email: null });
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
