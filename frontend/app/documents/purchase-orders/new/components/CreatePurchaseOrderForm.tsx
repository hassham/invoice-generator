"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LineItemsSection } from "../../../../invoice/create/components/LineItemsSection";
import { customerDisplayName } from "../../../../invoice/create/lib/customerPicker";
import { CURRENCY_OPTIONS } from "../../../../invoice/create/lib/fields";
import {
  cloneLineItem,
  hasAnyLineItemError,
  validateLineItems,
  type LineItem,
  type LineItemErrors,
} from "../../../../invoice/create/lib/lineItems";
import { getBusinessProfile } from "../../../../lib/business";
import { listCustomers, type Customer } from "../../../../lib/customers";
import { createPurchaseOrder } from "../../../../lib/purchaseOrders";
import {
  buildCreatePurchaseOrderRequest,
  computePurchaseOrderDraftTotals,
  createEmptyPurchaseOrderDraft,
  hasAnyPurchaseOrderDraftError,
  newPurchaseOrderLineItem,
  todayIsoDate,
  validatePurchaseOrderDraft,
  type PurchaseOrderDraft,
  type PurchaseOrderDraftErrors,
} from "../lib/purchaseOrderDraft";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

const textAreaClass = "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950";

function fieldClass(hasError: boolean): string {
  return hasError
    ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
    : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950";
}

/**
 * IG-307: closes IG-236's User Story - until this existed a purchase order could only be created by
 * POSTing to the API. Structured like CreateEstimateEditor (IG-220): an authenticated-only create
 * flow reusing the shared line item components rather than CreateInvoiceEditor, which is coupled to
 * anonymous drafts, localStorage auto-save and the account gate, none of which apply here.
 *
 * Templates are deliberately left out: CreatePurchaseOrderCommand accepts a TemplateId, but
 * IG-307's scope stops at the fields listed on the issue, and the PO PDF already renders through
 * the shared document engine (IG-306) without one.
 */
export function CreatePurchaseOrderForm() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [draft, setDraft] = useState<PurchaseOrderDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<PurchaseOrderDraftErrors>({});
  const [lineItemErrors, setLineItemErrors] = useState<Record<string, LineItemErrors>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Unlike the estimate editor, a failed customer fetch is fatal rather than cosmetic: the
    // backend requires a real SupplierId, so an empty list means the form cannot be submitted at
    // all and the user deserves to be told why.
    Promise.all([getBusinessProfile(), listCustomers()])
      .then(([profile, customers]) => {
        if (cancelled) {
          return;
        }
        setBusinessId(profile.id);
        setDefaultTaxRate(profile.defaultTaxRate);
        setSuppliers(customers);
        setDraft(
          createEmptyPurchaseOrderDraft(profile.defaultCurrency, profile.defaultTaxRate, todayIsoDate())
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to start a new purchase order."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(
    () => (draft ? computePurchaseOrderDraftTotals(draft.lineItems) : null),
    [draft]
  );

  if (loadError) {
    return (
      <div>
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
        <Link href="/documents/purchase-orders" className="mt-4 inline-block text-sm text-slate-700 hover:underline">
          Back to purchase orders
        </Link>
      </div>
    );
  }

  if (!draft || !totals) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  const update = (changes: Partial<PurchaseOrderDraft>) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    // Errors already on screen are re-evaluated as the user types so a corrected field clears
    // immediately; fields not yet touched stay quiet until blur or submit.
    if (hasAnyPurchaseOrderDraftError(draftErrors)) {
      setDraftErrors(validatePurchaseOrderDraft(next));
    }
  };

  const updateLineItems = (lineItems: LineItem[]) => {
    setDraft({ ...draft, lineItems });
    if (hasAnyLineItemError(lineItemErrors)) {
      setLineItemErrors(validateLineItems(lineItems));
    }
  };

  const handleLineItemFieldChange = (id: string, field: keyof LineItem, value: string) => {
    updateLineItems(draft.lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleRemoveLineItem = (id: string) => {
    if (draft.lineItems.length === 1) {
      // Matches the invoice and estimate editors: the last row is cleared, never removed, so the
      // document always has somewhere to type.
      setDraft({ ...draft, lineItems: [newPurchaseOrderLineItem(defaultTaxRate)] });
      return;
    }
    setDraft({ ...draft, lineItems: draft.lineItems.filter((item) => item.id !== id) });
  };

  const handleDuplicateLineItem = (id: string) => {
    const index = draft.lineItems.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    const duplicate = cloneLineItem(draft.lineItems[index]);
    setDraft({
      ...draft,
      lineItems: [...draft.lineItems.slice(0, index + 1), duplicate, ...draft.lineItems.slice(index + 1)],
    });
  };

  const handleMoveLineItemUp = (id: string) => {
    const index = draft.lineItems.findIndex((item) => item.id === id);
    if (index <= 0) {
      return;
    }
    const next = [...draft.lineItems];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setDraft({ ...draft, lineItems: next });
  };

  const handleMoveLineItemDown = (id: string) => {
    const index = draft.lineItems.findIndex((item) => item.id === id);
    if (index === -1 || index >= draft.lineItems.length - 1) {
      return;
    }
    const next = [...draft.lineItems];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setDraft({ ...draft, lineItems: next });
  };

  const handleSubmit = async () => {
    const nextDraftErrors = validatePurchaseOrderDraft(draft);
    const nextLineItemErrors = validateLineItems(draft.lineItems);

    if (hasAnyPurchaseOrderDraftError(nextDraftErrors) || hasAnyLineItemError(nextLineItemErrors)) {
      setDraftErrors(nextDraftErrors);
      setLineItemErrors(nextLineItemErrors);
      return;
    }

    if (!businessId) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createPurchaseOrder(businessId, buildCreatePurchaseOrderRequest(draft));
      // IG-307's completion criterion: the user lands on the purchase order they just created.
      router.push(`/documents/purchase-orders/${created.id}`);
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create this purchase order."
      );
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/documents/purchase-orders" className="text-sm text-slate-700 hover:underline">
        Back to purchase orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          Purchase Order
        </span>
        <h1 className="text-2xl font-bold text-slate-950">New Purchase Order</h1>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        An order you are placing with a supplier. It gets its own numbering sequence, separate from
        the invoices you send to customers, and the number is assigned when you create it.
      </p>

      {suppliers.length === 0 ? (
        <p role="alert" className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You need at least one saved supplier before you can raise a purchase order. Suppliers are
          kept with your customer records.{" "}
          <Link href="/customers/new" className="font-semibold underline">
            Add a supplier
          </Link>
          .
        </p>
      ) : null}

      {submitError ? (
        <p role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{submitError}</span>
          <button type="button" onClick={() => void handleSubmit()} className="font-semibold underline">
            Retry
          </button>
        </p>
      ) : null}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="mt-6 rounded-lg border border-slate-200 p-6"
      >
        <fieldset>
          <legend className="text-base font-semibold text-slate-950">Order details</legend>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="po-supplier" className="text-sm font-medium text-slate-700">
                Supplier<span aria-hidden="true"> *</span>
              </label>
              <select
                id="po-supplier"
                value={draft.supplierId}
                onChange={(event) => update({ supplierId: event.target.value })}
                onBlur={() => setDraftErrors(validatePurchaseOrderDraft(draft))}
                disabled={suppliers.length === 0}
                aria-required="true"
                aria-invalid={draftErrors.supplierId ? true : undefined}
                aria-describedby={draftErrors.supplierId ? "po-supplier-error" : undefined}
                className={fieldClass(Boolean(draftErrors.supplierId))}
              >
                <option value="">Choose a supplier…</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {customerDisplayName(supplier)}
                  </option>
                ))}
              </select>
              {draftErrors.supplierId ? (
                <p id="po-supplier-error" role="alert" className="text-sm text-red-600">
                  {draftErrors.supplierId}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="po-currency" className="text-sm font-medium text-slate-700">
                Currency<span aria-hidden="true"> *</span>
              </label>
              <select
                id="po-currency"
                value={draft.currency}
                onChange={(event) => update({ currency: event.target.value })}
                aria-required="true"
                className={fieldClass(Boolean(draftErrors.currency))}
              >
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="po-issue-date" className="text-sm font-medium text-slate-700">
                Issue date<span aria-hidden="true"> *</span>
              </label>
              <input
                id="po-issue-date"
                type="date"
                value={draft.issueDate}
                onChange={(event) => update({ issueDate: event.target.value })}
                onBlur={() => setDraftErrors(validatePurchaseOrderDraft(draft))}
                aria-required="true"
                aria-invalid={draftErrors.issueDate ? true : undefined}
                aria-describedby={draftErrors.issueDate ? "po-issue-date-error" : undefined}
                className={fieldClass(Boolean(draftErrors.issueDate))}
              />
              {draftErrors.issueDate ? (
                <p id="po-issue-date-error" role="alert" className="text-sm text-red-600">
                  {draftErrors.issueDate}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="po-due-date" className="text-sm font-medium text-slate-700">
                Required by<span aria-hidden="true"> *</span>
              </label>
              <input
                id="po-due-date"
                type="date"
                value={draft.dueDate}
                onChange={(event) => update({ dueDate: event.target.value })}
                onBlur={() => setDraftErrors(validatePurchaseOrderDraft(draft))}
                aria-required="true"
                aria-invalid={draftErrors.dueDate ? true : undefined}
                aria-describedby={draftErrors.dueDate ? "po-due-date-error" : undefined}
                className={fieldClass(Boolean(draftErrors.dueDate))}
              />
              {draftErrors.dueDate ? (
                <p id="po-due-date-error" role="alert" className="text-sm text-red-600">
                  {draftErrors.dueDate}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="po-reference" className="text-sm font-medium text-slate-700">
                Reference
              </label>
              <input
                id="po-reference"
                type="text"
                value={draft.reference}
                maxLength={100}
                onChange={(event) => update({ reference: event.target.value })}
                className={fieldClass(false)}
              />
            </div>
          </div>
        </fieldset>

        <LineItemsSection
          items={draft.lineItems}
          errors={lineItemErrors}
          onFieldChange={handleLineItemFieldChange}
          onFieldBlur={() => setLineItemErrors(validateLineItems(draft.lineItems))}
          onAdd={() => setDraft({ ...draft, lineItems: [...draft.lineItems, newPurchaseOrderLineItem(defaultTaxRate)] })}
          onMoveUp={handleMoveLineItemUp}
          onMoveDown={handleMoveLineItemDown}
          onDuplicate={handleDuplicateLineItem}
          onRemove={handleRemoveLineItem}
        />

        <div className="mt-6 border-t border-slate-200 pt-6">
          <dl className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="text-slate-900">{formatCurrency(totals.subtotal, draft.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Tax</dt>
              <dd className="text-slate-900">{formatCurrency(totals.taxAmount, draft.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <dt className="text-slate-900">Total</dt>
              <dd className="text-slate-900">{formatCurrency(totals.total, draft.currency)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-right text-xs text-slate-500">
            Preview only — these are recalculated when the order is created.
          </p>
        </div>

        <fieldset className="mt-6 border-t border-slate-200 pt-6">
          <legend className="text-base font-semibold text-slate-950">Delivery and terms</legend>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="po-delivery-instructions" className="text-sm font-medium text-slate-700">
                Delivery instructions
              </label>
              <textarea
                id="po-delivery-instructions"
                value={draft.deliveryInstructions}
                onChange={(event) => update({ deliveryInstructions: event.target.value })}
                rows={4}
                maxLength={2000}
                className={textAreaClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="po-terms" className="text-sm font-medium text-slate-700">
                Terms
              </label>
              <textarea
                id="po-terms"
                value={draft.terms}
                onChange={(event) => update({ terms: event.target.value })}
                rows={4}
                maxLength={2000}
                className={textAreaClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="po-notes" className="text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                id="po-notes"
                value={draft.notes}
                onChange={(event) => update({ notes: event.target.value })}
                rows={4}
                maxLength={2000}
                className={textAreaClass}
              />
            </div>
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <Link
            href="/documents/purchase-orders"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || suppliers.length === 0}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create purchase order"}
          </button>
        </div>
      </form>
    </div>
  );
}
