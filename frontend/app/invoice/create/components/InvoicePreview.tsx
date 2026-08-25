import type { FieldValues } from "../lib/invoiceDraft";

interface InvoicePreviewProps {
  header: FieldValues;
  currency: string;
  seller: FieldValues;
  customer: FieldValues;
}

function PreviewLine({ value }: { value: string }) {
  return value.trim() ? <p className="text-sm text-slate-700">{value}</p> : null;
}

/**
 * Read-only reflection of what's currently entered - live because it's rendered from the same
 * lifted state the editor fields write to, not a separate copy. Line items, totals and the actual
 * chosen template come from later Stories (S23-S26); this only covers what S22 introduces.
 */
export function InvoicePreview({ header, currency, seller, customer }: InvoicePreviewProps) {
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

      <p className="mt-6 text-sm text-slate-500">Line items and totals will appear here.</p>
    </div>
  );
}
