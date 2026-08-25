import type { FieldValues } from "../lib/invoiceDraft";
import { computeLineTotals, sumLineTotals, type LineItem } from "../lib/lineItems";

interface InvoicePreviewProps {
  header: FieldValues;
  currency: string;
  seller: FieldValues;
  customer: FieldValues;
  lineItems: LineItem[];
}

function PreviewLine({ value }: { value: string }) {
  return value.trim() ? <p className="text-sm text-slate-700">{value}</p> : null;
}

/**
 * Read-only reflection of what's currently entered - live because it's rendered from the same
 * lifted state the editor fields write to, not a separate copy. The line-items subtotal shown
 * here is a frontend-only preview figure (FSD section 28 explicitly allows this); the actual
 * invoice-level Subtotal/Discount/Tax/Total roll-up and chosen template come from later Stories
 * (S24-S26).
 */
function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

export function InvoicePreview({ header, currency, seller, customer, lineItems }: InvoicePreviewProps) {
  const itemsWithContent = lineItems.filter(
    (item) => item.description.trim().length > 0 || item.unitPrice.trim().length > 0,
  );
  return (
    <div className="rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-950">
            {seller.businessName.trim() || "Your business name"}
          </p>
          <PreviewLine value={seller.addressLine1} />
          <PreviewLine value={seller.addressLine2} />
          <PreviewLine value={[seller.city, seller.state, seller.postalCode].filter(Boolean).join(", ")} />
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-950">
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
        <p className="mt-1 text-sm text-slate-950">{customer.customerName.trim() || "Customer name"}</p>
        <PreviewLine value={customer.addressLine1} />
        <PreviewLine value={customer.addressLine2} />
        <PreviewLine value={[customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ")} />
      </div>

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
        <p className="mt-4 text-right text-sm text-slate-600">
          Items subtotal:{" "}
          <span className="font-semibold text-slate-950">
            {currency} {formatCurrency(sumLineTotals(lineItems))}
          </span>
        </p>
        <p className="mt-1 text-right text-xs text-slate-400">
          Invoice discount, tax rules and the final total are calculated in a later step.
        </p>
      </div>
    </div>
  );
}
