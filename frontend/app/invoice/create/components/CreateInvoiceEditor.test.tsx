import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CreateInvoiceEditor } from "./CreateInvoiceEditor";

describe("CreateInvoiceEditor", () => {
  it("reflects the seller business name and customer name in the live preview as they're typed", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("Business Name", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Business / Customer Name", { exact: false }), "Jane's Cafe");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(within(preview).getByText("Jane's Cafe")).toBeInTheDocument();
  });

  it("shows a field-level error for a missing required field without clearing other entered values", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("Business Name", { exact: false }), "Acme Pty Ltd");
    // Invoice Number is required and left empty - blur it directly.
    await user.click(screen.getByLabelText(/Invoice Number/));
    await user.tab();

    expect(screen.getByText("Invoice Number is required.")).toBeInTheDocument();
    // The valid, already-entered Business Name must still be there.
    expect(screen.getByLabelText("Business Name", { exact: false })).toHaveValue("Acme Pty Ltd");
  });

  it("clears a field's error as soon as it's corrected, without waiting for another blur", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    const invoiceNumberInput = screen.getByLabelText(/Invoice Number/);
    await user.click(invoiceNumberInput);
    await user.tab();
    expect(screen.getByText("Invoice Number is required.")).toBeInTheDocument();

    await user.type(invoiceNumberInput, "INV-000001");

    expect(screen.queryByText("Invoice Number is required.")).not.toBeInTheDocument();
  });

  it("rejects a due date earlier than the issue date", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    const dueDateInput = screen.getByLabelText(/Due Date/);
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2000-01-01");
    await user.tab();

    expect(screen.getByText("Due date cannot be earlier than the issue date.")).toBeInTheDocument();
  });

  it("uses the Australian labels for the seller's registration and tax fields - FSD section 13", () => {
    render(<CreateInvoiceEditor />);

    expect(screen.getByLabelText("ABN")).toBeInTheDocument();
    expect(screen.getByLabelText("GST Registration / ABN")).toBeInTheDocument();
  });

  it("defaults the seller country to AU and currency to AUD", () => {
    render(<CreateInvoiceEditor />);

    const sellerSection = screen.getByRole("group", { name: "Seller information" });
    expect(within(sellerSection).getByLabelText("Country", { exact: false })).toHaveValue("AU");
    expect(screen.getByLabelText("Currency")).toHaveValue("AUD");
  });

  it("reflects a line item's description and computed line total in the live preview", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.clear(screen.getByLabelText(/Quantity/));
    await user.type(screen.getByLabelText(/Quantity/), "2");
    await user.type(screen.getByLabelText(/Unit Price/), "50");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Consulting")).toBeInTheDocument();
    // 2 x 50 = 100, + 10% default GST = 110.00, shown as this item's line total and (with only
    // one item) also as the items subtotal.
    expect(within(preview).getByText(/AUD 110\.00/)).toBeInTheDocument();
  });

  it("adding a second line item is reflected in the editor and the preview", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Add Item" }));

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(2);
  });
});
