import { useId } from "react";
import type { InvoiceDiscountType, InvoiceTotalsResult } from "../lib/invoiceTotals";

interface InvoiceTotalsSectionProps {
  currency: string;
  discountType: InvoiceDiscountType;
  discountValue: string;
  discountError?: string;
  onDiscountTypeChange: (value: InvoiceDiscountType) => void;
  onDiscountValueChange: (value: string) => void;
  onDiscountBlur: () => void;
  totals: InvoiceTotalsResult;
}

const DISCOUNT_TYPES: { value: InvoiceDiscountType; label: string }[] = [
  { value: "None", label: "No invoice discount" },
  { value: "Percentage", label: "Percentage" },
  { value: "Fixed", label: "Fixed amount" },
];

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * FSD section 23's invoice-level discount ("MVP recommendation: support invoice-level discount
 * first") plus the authoritative Subtotal/Discount/Tax/Total/Amount Due roll-up (FSD section 26's
 * 8-step engine). This is a frontend preview of the same figures the backend's
 * /api/v1/invoices/calculate endpoint (IG-119) would return for the same input - see
 * `lib/invoiceTotals.ts`'s doc comment for how the two are kept in sync. Tax-inclusive/exclusive
 * mode (FSD section 29) isn't exposed as a control here - it's a business setting with no
 * settings page to source it from yet (Epic IG-8), so this page always calculates exclusive.
 */
export function InvoiceTotalsSection({
  currency,
  discountType,
  discountValue,
  discountError,
  onDiscountTypeChange,
  onDiscountValueChange,
  onDiscountBlur,
  totals,
}: InvoiceTotalsSectionProps) {
  const discountTypeId = useId();
  const discountValueId = useId();

  return (
    <fieldset className="mt-6 border-t border-slate-200 pt-6">
      <legend className="text-base font-semibold text-slate-950">Totals</legend>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={discountTypeId} className="text-sm font-medium text-slate-700">
            Invoice Discount
          </label>
          <select
            id={discountTypeId}
            value={discountType}
            onChange={(event) => onDiscountTypeChange(event.target.value as InvoiceDiscountType)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          >
            {DISCOUNT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {discountType !== "None" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor={discountValueId} className="text-sm font-medium text-slate-700">
              {discountType === "Percentage" ? "Discount (%)" : "Discount Amount"}
              <span aria-hidden="true"> *</span>
            </label>
            <input
              id={discountValueId}
              type="number"
              step="any"
              min={0}
              value={discountValue}
              onChange={(event) => onDiscountValueChange(event.target.value)}
              onBlur={onDiscountBlur}
              required
              aria-required="true"
              aria-invalid={discountError ? true : undefined}
              className={
                discountError
                  ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
                  : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
              }
            />
            {discountError ? (
              <p role="alert" className="text-sm text-red-600">
                {discountError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">Subtotal</dt>
        <dd className="text-right text-slate-950">
          {currency} {formatCurrency(totals.subtotal)}
        </dd>
        {totals.discountAmount > 0 ? (
          <>
            <dt className="text-slate-500">Discount</dt>
            <dd className="text-right text-slate-950">
              -{currency} {formatCurrency(totals.discountAmount)}
            </dd>
          </>
        ) : null}
        <dt className="text-slate-500">Tax</dt>
        <dd className="text-right text-slate-950">
          {currency} {formatCurrency(totals.taxAmount)}
        </dd>
        <dt className="font-semibold text-slate-950">Total</dt>
        <dd className="text-right font-semibold text-slate-950">
          {currency} {formatCurrency(totals.totalAmount)}
        </dd>
        <dt className="text-slate-500">Amount Due</dt>
        <dd className="text-right text-slate-950">
          {currency} {formatCurrency(totals.amountDue)}
        </dd>
      </dl>
    </fieldset>
  );
}
