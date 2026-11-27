import { useId } from "react";
import type { InvoiceDiscountType, InvoiceTotalsResult } from "../lib/invoiceTotals";

interface InvoiceTotalsSectionProps {
  compact?: boolean;
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
  compact = false,
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
    <fieldset className={compact ? "mt-4 border-t border-border pt-2" : "mt-6 border-t border-border pt-6"}>
      <legend className={compact ? "sr-only" : "font-display text-lg font-bold text-ink"}>Totals</legend>

      <div hidden={compact} className={compact ? undefined : "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"}>
        <div className="flex flex-col gap-1">
          <label htmlFor={discountTypeId} className="text-sm font-semibold text-ink">
            Invoice Discount
          </label>
          <select
            id={discountTypeId}
            value={discountType}
            onChange={(event) => onDiscountTypeChange(event.target.value as InvoiceDiscountType)}
            className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
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
            <label htmlFor={discountValueId} className="text-sm font-semibold text-ink">
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
                  ? "rounded-lg border-[1.5px] border-[#991b1b] bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  : "rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              }
            />
            {discountError ? (
              <p role="alert" className="text-sm font-semibold text-[#991b1b]">
                {discountError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {!compact ? (
          <>
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-right text-ink">{currency} {formatCurrency(totals.subtotal)}</dd>
          </>
        ) : null}
        {totals.discountAmount > 0 ? (
          <>
            <dt className="text-muted">Discount</dt>
            <dd className="text-right text-ink">
              -{currency} {formatCurrency(totals.discountAmount)}
            </dd>
          </>
        ) : null}
        {!compact || totals.taxAmount !== 0 ? (
          <>
            <dt className="text-muted">Tax</dt>
            <dd className="text-right text-ink">{currency} {formatCurrency(totals.taxAmount)}</dd>
          </>
        ) : null}
        <dt className={compact ? "text-base font-bold text-ink" : "font-semibold text-ink"}>Total</dt>
        <dd className={compact ? "text-right text-base font-bold text-ink" : "text-right font-semibold text-ink"}>
          {currency} {formatCurrency(totals.totalAmount)}
        </dd>
        {!compact || totals.amountDue !== totals.totalAmount ? (
          <>
            <dt className="text-muted">Amount Due</dt>
            <dd className="text-right text-ink">{currency} {formatCurrency(totals.amountDue)}</dd>
          </>
        ) : null}
      </dl>
    </fieldset>
  );
}
