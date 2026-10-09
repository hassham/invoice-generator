import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCreditNote } from "../../lib/creditNotes";
import type { InvoiceListItem } from "../../lib/invoiceList";
import { CreateCreditNoteForm } from "./CreateCreditNoteForm";

vi.mock("../../lib/creditNotes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/creditNotes")>()),
  createCreditNote: vi.fn(),
}));

const mockedCreate = vi.mocked(createCreditNote);

/** A 500 invoice with 200 already paid, so 300 is outstanding. */
const invoice: InvoiceListItem = {
  id: "inv-1",
  invoiceNumber: "INV-0001",
  customerName: "Acme Pty Ltd",
  status: "PartiallyPaid",
  issueDate: "2030-08-01",
  dueDate: "2030-08-15",
  currency: "AUD",
  totalAmount: 500,
  amountDue: 300,
};

async function fill(user: ReturnType<typeof userEvent.setup>, amount: string) {
  await user.selectOptions(screen.getByLabelText(/^Invoice/), "inv-1");
  await user.type(screen.getByLabelText(/^Credit Amount/), amount);
  await user.type(screen.getByLabelText(/^Reason/), "Returned goods");
}

function renderForm() {
  render(<CreateCreditNoteForm businessId="biz-1" invoices={[invoice]} />);
}

describe("CreateCreditNoteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreate.mockResolvedValue({} as Awaited<ReturnType<typeof createCreditNote>>);
  });

  it("shows both thresholds once an invoice is chosen", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/^Invoice/), "inv-1");

    expect(screen.getByText(/Outstanding: 300\.00 AUD/)).toBeInTheDocument();
    expect(screen.getByText(/Invoice total: 500\.00 AUD/)).toBeInTheDocument();
  });

  it("creates without confirmation when the amount is within what is outstanding", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "100");
    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith("biz-1", expect.objectContaining({
        amount: 100,
        confirmedOverAmountDue: false,
      }));
    });
    expect(screen.queryByText("Credit more than is outstanding?")).not.toBeInTheDocument();
  });

  // IG-309 / IG-234 AC 3.
  it("asks before crediting more than is outstanding, and posts nothing yet", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "400");
    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));

    expect(await screen.findByText("Credit more than is outstanding?")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  /// The confirmation has to state the figures, not just ask.
  it("states what is being over-credited by", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "400");
    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));

    expect(await screen.findByText(/300\.00 AUD outstanding/)).toBeInTheDocument();
    expect(screen.getByText(/crediting 400\.00 AUD/)).toBeInTheDocument();
    expect(screen.getByText(/100\.00 AUD more than is owed/)).toBeInTheDocument();
  });

  it("creates with the confirmation flag once confirmed", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "400");
    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));
    await user.click(await screen.findByRole("button", { name: "Yes, credit this amount" }));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith("biz-1", expect.objectContaining({
        amount: 400,
        confirmedOverAmountDue: true,
      }));
    });
  });

  it("creates nothing when the confirmation is dismissed", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "400");
    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Credit more than is outstanding?")).not.toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  /// The ceiling confirmation does not lift: above the invoice total the form will not submit at
  /// all, and offers no way to confirm past it.
  it("refuses an amount above the invoice total outright, with no confirmation offered", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "600");

    expect(screen.getByText(/The most you can credit is 500\.00 AUD/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Credit Note" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));

    expect(screen.queryByText("Credit more than is outstanding?")).not.toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("warns inline before submission once the amount passes what is outstanding", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "400");

    expect(screen.getByText(/More than the 300\.00 AUD still outstanding/)).toBeInTheDocument();
  });

  it("refuses a zero amount", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "0");
    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));

    expect(await screen.findByText("Credit amount must be greater than zero.")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  /// Editing the amount after being asked invalidates what the user was agreeing to.
  it("withdraws a pending confirmation if the amount changes", async () => {
    const user = userEvent.setup();
    renderForm();

    await fill(user, "400");
    await user.click(screen.getByRole("button", { name: "Create Credit Note" }));
    expect(await screen.findByText("Credit more than is outstanding?")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Credit Amount/), "0");

    expect(screen.queryByText("Credit more than is outstanding?")).not.toBeInTheDocument();
  });
});
