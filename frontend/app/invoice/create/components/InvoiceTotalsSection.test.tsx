import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals, validateInvoiceDiscountValue, type InvoiceDiscountType } from "../lib/invoiceTotals";
import { InvoiceTotalsSection } from "./InvoiceTotalsSection";

function StatefulInvoiceTotalsSection() {
  const [discountType, setDiscountType] = useState<InvoiceDiscountType>("None");
  const [discountValue, setDiscountValue] = useState("");
  const [discountError, setDiscountError] = useState<string | undefined>();

  const parsed = discountValue.trim().length > 0 ? Number.parseFloat(discountValue) : null;
  const totals = calculateInvoiceTotals(
    [{ quantity: 1, unitPrice: 100, taxRate: 10, discount: 0 }],
    discountType,
    Number.isFinite(parsed) ? parsed : null,
    "Exclusive",
  );

  return (
    <InvoiceTotalsSection
      currency="AUD"
      discountType={discountType}
      discountValue={discountValue}
      discountError={discountError}
      onDiscountTypeChange={setDiscountType}
      onDiscountValueChange={(value) => {
        setDiscountValue(value);
        if (discountError) {
          setDiscountError(validateInvoiceDiscountValue(discountType, value));
        }
      }}
      onDiscountBlur={() => setDiscountError(validateInvoiceDiscountValue(discountType, discountValue))}
      totals={totals}
    />
  );
}

describe("InvoiceTotalsSection", () => {
  it("shows Subtotal, Tax and Total with no discount input by default", () => {
    render(<StatefulInvoiceTotalsSection />);

    expect(screen.getByText("AUD 100.00")).toBeInTheDocument(); // Subtotal
    expect(screen.getByText("AUD 10.00")).toBeInTheDocument(); // Tax
    // Total and Amount Due both legitimately show the same figure (no payments recorded yet).
    expect(screen.getAllByText("AUD 110.00")).toHaveLength(2);
    expect(screen.queryByLabelText(/Discount \(%\)|Discount Amount/)).not.toBeInTheDocument();
  });

  it("reveals a discount value field once a discount type is selected", async () => {
    const user = userEvent.setup();
    render(<StatefulInvoiceTotalsSection />);

    await user.selectOptions(screen.getByLabelText("Invoice Discount"), "Percentage");

    expect(screen.getByLabelText(/Discount \(%\)/)).toBeInTheDocument();
  });

  it("recalculates the totals as a discount value is entered", async () => {
    const user = userEvent.setup();
    render(<StatefulInvoiceTotalsSection />);

    await user.selectOptions(screen.getByLabelText("Invoice Discount"), "Percentage");
    await user.type(screen.getByLabelText(/Discount \(%\)/), "10");

    // Subtotal 100, 10% discount = 10, adjusted 90, tax on 90 @ 10% = 9, total = 99.
    expect(screen.getByText("-AUD 10.00")).toBeInTheDocument();
    expect(screen.getByText("AUD 90.00")).toBeInTheDocument();
    expect(screen.getByText("AUD 9.00")).toBeInTheDocument();
    expect(screen.getAllByText("AUD 99.00")).toHaveLength(2);
  });

  it("shows a validation error for a missing discount value after blur", async () => {
    const user = userEvent.setup();
    render(<StatefulInvoiceTotalsSection />);

    await user.selectOptions(screen.getByLabelText("Invoice Discount"), "Fixed");
    await user.click(screen.getByLabelText(/Discount Amount/));
    await user.tab();

    expect(screen.getByText("Enter a discount value.")).toBeInTheDocument();
  });

  it("hides the discount value field again when switching back to no discount", async () => {
    const user = userEvent.setup();
    render(<StatefulInvoiceTotalsSection />);

    await user.selectOptions(screen.getByLabelText("Invoice Discount"), "Fixed");
    expect(screen.getByLabelText(/Discount Amount/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Invoice Discount"), "No invoice discount");
    expect(screen.queryByLabelText(/Discount Amount/)).not.toBeInTheDocument();
  });
});
