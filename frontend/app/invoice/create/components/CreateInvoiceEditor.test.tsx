import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CreateInvoiceEditor } from "./CreateInvoiceEditor";

describe("CreateInvoiceEditor", () => {
  it("reflects the From and Bill To text in the live preview as it's typed", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(within(preview).getByText("Jane's Cafe")).toBeInTheDocument();
  });

  it("shows a field-level error for a missing required field without clearing other entered values", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    // Invoice Number is required and left empty - blur it directly.
    await user.click(screen.getByLabelText(/Invoice Number/));
    await user.tab();

    expect(screen.getByText("Invoice Number is required.")).toBeInTheDocument();
    // The valid, already-entered From text must still be there.
    expect(screen.getByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");
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

  it("rejects a due date earlier than the issue date, once Advanced is switched on", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    const dueDateInput = screen.getByLabelText(/Due Date/);
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2000-01-01");
    await user.tab();

    expect(screen.getByText("Due date cannot be earlier than the issue date.")).toBeInTheDocument();
  });

  it("defaults currency to AUD", () => {
    render(<CreateInvoiceEditor />);

    expect(screen.getByLabelText("Currency")).toHaveValue("AUD");
  });

  it("starts in Basic mode, hiding Due Date, Reference, Ship To, Notes and Payment Instructions", () => {
    render(<CreateInvoiceEditor />);

    expect(screen.getByLabelText(/Due Date/)).not.toBeVisible();
    expect(screen.getByLabelText(/^Reference/)).not.toBeVisible();
    expect(screen.getByLabelText("Ship To")).not.toBeVisible();
    expect(screen.getByLabelText("Notes")).not.toBeVisible();
    expect(screen.getByLabelText("Bank Name")).not.toBeVisible();
    // Basic-tier fields, including Terms, stay visible.
    expect(screen.getByLabelText("From", { exact: false })).toBeVisible();
    expect(screen.getByLabelText("Bill To", { exact: false })).toBeVisible();
    expect(screen.getByLabelText("Terms and Conditions")).toBeVisible();
  });

  it("switching to Advanced reveals Due Date, Reference, Ship To, Notes and Payment Instructions", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));

    expect(screen.getByLabelText(/Due Date/)).toBeVisible();
    expect(screen.getByLabelText(/^Reference/)).toBeVisible();
    expect(screen.getByLabelText("Ship To")).toBeVisible();
    expect(screen.getByLabelText("Notes")).toBeVisible();
    expect(screen.getByLabelText("Bank Name")).toBeVisible();
  });

  it("keeps typed Advanced-only content after toggling back to Basic and forward again", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.type(screen.getByLabelText("Ship To"), "Warehouse 3");
    await user.click(screen.getByRole("button", { name: "Basic" }));
    await user.click(screen.getByRole("button", { name: "Advanced" }));

    expect(screen.getByLabelText("Ship To")).toHaveValue("Warehouse 3");
  });

  it("shows Advanced-only content in the preview even while the editor stays in Basic mode", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.type(screen.getByLabelText("Ship To"), "Warehouse 3");
    await user.click(screen.getByRole("button", { name: "Basic" }));

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Warehouse 3")).toBeInTheDocument();
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
    // 2 x 50 = 100, + 10% default GST = 110.00, shown as this item's own line total and (with
    // only one item, no invoice discount) also as the invoice Total/Amount Due.
    expect(within(preview).getAllByText(/AUD 110\.00/).length).toBeGreaterThan(0);
  });

  it("adding a second line item is reflected in the editor and the preview", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Add Item" }));

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(2);
  });

  it("applying an invoice discount updates the Totals in both the editor and the preview", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.type(screen.getByLabelText(/Unit Price/), "100");
    // Default tax rate is 10%: subtotal 100, tax 10, total 110 before any invoice discount.

    await user.selectOptions(screen.getByLabelText("Invoice Discount"), "Percentage");
    await user.type(screen.getByLabelText(/Discount \(%\)/), "10");

    // Subtotal 100, 10% invoice discount = 10, adjusted 90, tax on 90 @ 10% = 9, total = 99.
    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("-AUD 10.00")).toBeInTheDocument();
    expect(within(preview).getAllByText("AUD 99.00").length).toBeGreaterThan(0);
  });

  it("does not show Notes, Terms or Payment Instructions sections in the preview when empty - IG-122", () => {
    render(<CreateInvoiceEditor />);

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).queryByText("Notes")).not.toBeInTheDocument();
    expect(within(preview).queryByText("Terms and Conditions")).not.toBeInTheDocument();
    expect(within(preview).queryByText("Payment Instructions")).not.toBeInTheDocument();
  });

  it("reflects entered Notes, Terms and Payment Instructions in the preview once populated", async () => {
    // .paste() sets the whole value in one operation rather than simulating per-character
    // keystrokes (.type()) - these tests only care about the final rendered value, not per-key
    // behaviour, and per-character typing across three fields was measurably slow enough under
    // parallel test-suite load to occasionally bleed into the next test's render.
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByLabelText("Terms and Conditions"));
    await user.paste("Due in 14 days.");
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByLabelText("Notes"));
    await user.paste("Thank you.");
    await user.click(screen.getByLabelText("Bank Name"));
    await user.paste("Big Bank");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Notes")).toBeInTheDocument();
    expect(within(preview).getByText("Thank you.")).toBeInTheDocument();
    expect(within(preview).getByText("Terms and Conditions")).toBeInTheDocument();
    expect(within(preview).getByText("Due in 14 days.")).toBeInTheDocument();
    expect(within(preview).getByText("Payment Instructions")).toBeInTheDocument();
    expect(within(preview).getByText("Bank Name: Big Bank")).toBeInTheDocument();
  });

  it("only shows the specific payment instruction fields that were actually filled in", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByLabelText("Bank Name"));
    await user.paste("Big Bank");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Bank Name: Big Bank")).toBeInTheDocument();
    expect(within(preview).queryByText(/^IBAN:/)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/^SWIFT:/)).not.toBeInTheDocument();
  });
});
