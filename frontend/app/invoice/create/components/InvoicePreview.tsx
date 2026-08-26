import type { FieldValues } from "../lib/invoiceDraft";
import type { InvoiceTotalsResult } from "../lib/invoiceTotals";
import { computeLineTotals, type LineItem } from "../lib/lineItems";
import { hasAnyPaymentInstructionContent, PAYMENT_INSTRUCTION_FIELDS, type SupportingContentValues } from "../lib/supportingContent";
import type { TemplateCustomization } from "../lib/templateCustomization";

interface InvoicePreviewProps {
  header: FieldValues;
  currency: string;
  seller: string;
  customer: string;
  shipTo: string;
  lineItems: LineItem[];
  totals: InvoiceTotalsResult;
  supportingContent: SupportingContentValues;
  templateCustomization: TemplateCustomization;
  logo: string | null;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Read-only reflection of what's currently entered - live because it's rendered from the same
 * lifted state the editor fields write to, not a separate copy, including the `totals` figures
 * (FSD section 28 explicitly allows a frontend calculation for immediate preview - see
 * `lib/invoiceTotals.ts`'s doc comment for how it's kept consistent with the backend's
 * authoritative calculation). Ship To/Notes/Terms/Payment Instructions sections only render when
 * they have content - IG-122: "optional empty sections do not create misleading output." The
 * chosen template and PDF/print output come from the last Story in this Epic (S26).
 *
 * IG-193: seller/customer/shipTo are free text, not structured FieldValues - this preview is
 * never mode-aware (it always shows what's typed regardless of whether the editor's Basic/Advanced
 * toggle currently hides that field), so Ship To/Due Date/Reference/Notes content set in Advanced
 * still shows here even while the editor sits in Basic mode.
 *
 * IG-40: `templateCustomization` (lib/templateCustomization.ts) fully determines appearance -
 * primary/accent color, font, and one of three header styles (Banner: colored top strip; Bordered:
 * accent-colored rule under the header row; Plain: color only on the invoice-number text). Defaults
 * to whichever template is selected (IG-39) but can be overridden by the user.
 *
 * IG-42: `logo` is a client-resized data URL (lib/logoUpload.ts) or null - rendered here only;
 * PDF/print rendering of it is N/A until IG-43/44 exist.
 */
export function InvoicePreview({
  header,
  currency,
  seller,
  customer,
  shipTo,
  lineItems,
  totals,
  supportingContent,
  templateCustomization,
  logo,
}: InvoicePreviewProps) {
  const itemsWithContent = lineItems.filter(
    (item) => item.description.trim().length > 0 || item.unitPrice.trim().length > 0,
  );
  const { primaryColor, accentColor, font, headerStyle } = templateCustomization;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200" style={{ fontFamily: font }}>
      {headerStyle === "Banner" ? <div className="h-3" style={{ backgroundColor: primaryColor }} /> : null}
      <div className="p-6">
      <div
        className={headerStyle === "Bordered" ? "flex items-start justify-between border-b-4 pb-4" : "flex items-start justify-between"}
        style={headerStyle === "Bordered" ? { borderColor: accentColor } : undefined}
      >
        <div className="flex items-start gap-3">
          {logo ? (
            // next/image needs a static import or a configured loader - this is an arbitrary,
            // client-generated data URL (lib/logoUpload.ts), which next/image can't optimize anyway.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Business logo" className="h-12 w-auto object-contain" />
          ) : null}
          <div>
            <p className="text-sm font-semibold text-slate-700">From</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-950">{seller.trim() || "Your business details"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold" style={{ color: accentColor }}>
            {header.invoiceNumber.trim() || "Invoice"}
          </p>
          <p className="text-sm text-slate-600">{currency}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">Issue date</dt>
        <dd className="text-slate-950">{header.issueDate || "—"}</dd>
        <dt className="text-slate-500">Due date</dt>
        <dd className="text-slate-950">{header.dueDate || "—"}</dd>
        {header.reference.trim() ? (
          <>
            <dt className="text-slate-500">Reference</dt>
            <dd className="text-slate-950">{header.reference}</dd>
          </>
        ) : null}
      </dl>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-slate-700">Bill to</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-950">{customer.trim() || "Customer details"}</p>
      </div>

      {shipTo.trim() ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700">Ship to</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-950">{shipTo}</p>
        </div>
      ) : null}

      <div className="mt-6 border-t border-slate-200 pt-4">
        {itemsWithContent.length === 0 ? (
          <p className="text-sm text-slate-500">Items will appear here.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit Price</th>
                <th className="pb-2 text-right font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {itemsWithContent.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-2 text-slate-950">{item.description.trim() || "—"}</td>
                  <td className="py-2 text-right text-slate-950">{item.quantity || "—"}</td>
                  <td className="py-2 text-right text-slate-950">{formatCurrency(Number.parseFloat(item.unitPrice) || 0)}</td>
                  <td className="py-2 text-right text-slate-950">{formatCurrency(computeLineTotals(item).lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
        </dl>
      </div>

      {supportingContent.notes.trim() ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-950">{supportingContent.notes}</p>
        </div>
      ) : null}

      {supportingContent.terms.trim() ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700">Terms and Conditions</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-950">{supportingContent.terms}</p>
        </div>
      ) : null}

      {hasAnyPaymentInstructionContent(supportingContent) ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700">Payment Instructions</p>
          <div className="mt-1 text-sm text-slate-950">
            {PAYMENT_INSTRUCTION_FIELDS.map((field) => {
              const value = supportingContent.paymentInstructions[field.name]?.trim();
              return value ? (
                <p key={field.name}>
                  {field.label}: {value}
                </p>
              ) : null;
            })}
            {supportingContent.customInstructions.trim() ? (
              <p className="mt-1 whitespace-pre-wrap">{supportingContent.customInstructions}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
