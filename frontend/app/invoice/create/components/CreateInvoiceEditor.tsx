"use client";

import { useEffect, useMemo, useState } from "react";
import { CUSTOMER_FIELDS, SELLER_FIELDS } from "../lib/fields";
import {
  createEmptyDraft,
  hasAnyError,
  todayIsoDate,
  validateFieldValues,
  validateHeaderFields,
  type FieldErrors,
  type FieldValues,
} from "../lib/invoiceDraft";
import { calculateInvoiceTotals, validateInvoiceDiscountValue, type InvoiceDiscountType } from "../lib/invoiceTotals";
import {
  cloneLineItem,
  createEmptyLineItem,
  hasAnyLineItemError,
  toCalculationInput,
  validateLineItems,
  type LineItem,
  type LineItemErrors,
} from "../lib/lineItems";
import {
  createEmptySupportingContent,
  hasAnySupportingContentError,
  validateSupportingContent,
  type SupportingContentErrors,
} from "../lib/supportingContent";
import { InvoiceEditorLayout } from "./InvoiceEditorLayout";
import { InvoiceHeaderSection } from "./InvoiceHeaderSection";
import { InvoicePreview } from "./InvoicePreview";
import { InvoiceTotalsSection } from "./InvoiceTotalsSection";
import { LineItemsSection } from "./LineItemsSection";
import { PartyDetailsSection } from "./PartyDetailsSection";
import { SupportingContentSection } from "./SupportingContentSection";

export function CreateInvoiceEditor() {
  const [draft, setDraft] = useState(createEmptyDraft);
  const [headerErrors, setHeaderErrors] = useState<FieldErrors>({});
  const [sellerErrors, setSellerErrors] = useState<FieldErrors>({});
  const [customerErrors, setCustomerErrors] = useState<FieldErrors>({});
  const [lineItems, setLineItems] = useState<LineItem[]>(() => [createEmptyLineItem()]);
  const [lineItemErrors, setLineItemErrors] = useState<Record<string, LineItemErrors>>({});
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<InvoiceDiscountType>("None");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState("");
  const [invoiceDiscountError, setInvoiceDiscountError] = useState<string | undefined>();
  const [supportingContent, setSupportingContent] = useState(createEmptySupportingContent);
  const [supportingContentErrors, setSupportingContentErrors] = useState<SupportingContentErrors>({
    paymentInstructions: {},
  });

  useEffect(() => {
    // Computed on mount only, client-side - this page is statically prerendered, so setting
    // "today" during the initial render would bake in the build date instead of the visitor's
    // actual today. Starting both dates empty keeps server and client markup identical for
    // hydration, then this effect fills in the real date once mounted in the browser.
    const today = todayIsoDate();
    // Legitimate exception to the "don't setState in an effect" rule: this value can only be
    // computed client-side (it depends on the visitor's local clock, not build/request time), so
    // there's no way to have it ready before the first client render without risking a
    // server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((current) =>
      current.header.issueDate
        ? current
        : {
            ...current,
            header: { ...current.header, issueDate: today, dueDate: today },
          },
    );
  }, []);

  // Once a section has shown at least one error, keep re-validating it on every keystroke so a
  // correction clears its error immediately rather than leaving a stale message until the next
  // blur - first validation still only happens on blur, so a field isn't marked invalid before
  // the user has finished with it.
  const handleHeaderChange = (name: string, value: string) => {
    const nextHeader: FieldValues = { ...draft.header, [name]: value };
    setDraft((current) => ({ ...current, header: nextHeader }));
    if (hasAnyError(headerErrors)) {
      setHeaderErrors(validateHeaderFields(nextHeader));
    }
  };

  const handleHeaderBlur = () => {
    setHeaderErrors(validateHeaderFields(draft.header));
  };

  const handleCurrencyChange = (value: string) => {
    setDraft((current) => ({ ...current, currency: value }));
  };

  const handleSellerChange = (name: string, value: string) => {
    const nextSeller: FieldValues = { ...draft.seller, [name]: value };
    setDraft((current) => ({ ...current, seller: nextSeller }));
    if (hasAnyError(sellerErrors)) {
      setSellerErrors(validateFieldValues(nextSeller, SELLER_FIELDS));
    }
  };

  const handleSellerBlur = () => {
    setSellerErrors(validateFieldValues(draft.seller, SELLER_FIELDS));
  };

  const handleCustomerChange = (name: string, value: string) => {
    const nextCustomer: FieldValues = { ...draft.customer, [name]: value };
    setDraft((current) => ({ ...current, customer: nextCustomer }));
    if (hasAnyError(customerErrors)) {
      setCustomerErrors(validateFieldValues(nextCustomer, CUSTOMER_FIELDS));
    }
  };

  const handleCustomerBlur = () => {
    setCustomerErrors(validateFieldValues(draft.customer, CUSTOMER_FIELDS));
  };

  const handleLineItemFieldChange = (id: string, field: keyof LineItem, value: string) => {
    const nextItems = lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    setLineItems(nextItems);
    if (hasAnyLineItemError(lineItemErrors)) {
      setLineItemErrors(validateLineItems(nextItems));
    }
  };

  const handleLineItemFieldBlur = () => {
    setLineItemErrors(validateLineItems(lineItems));
  };

  const handleAddLineItem = () => {
    setLineItems((current) => [...current, createEmptyLineItem()]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((current) => {
      if (current.length === 1) {
        // FSD section 24: with only one row left, "Remove" clears its fields rather than
        // removing the row - an invoice must always have at least one item.
        return [createEmptyLineItem()];
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const handleDuplicateLineItem = (id: string) => {
    setLineItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index === -1) {
        return current;
      }
      const duplicate = cloneLineItem(current[index]);
      return [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)];
    });
  };

  const handleMoveLineItemUp = (id: string) => {
    setLineItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index <= 0) {
        return current;
      }
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const handleMoveLineItemDown = (id: string) => {
    setLineItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index === -1 || index >= current.length - 1) {
        return current;
      }
      const next = [...current];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleInvoiceDiscountTypeChange = (value: InvoiceDiscountType) => {
    setInvoiceDiscountType(value);
    if (value === "None") {
      setInvoiceDiscountValue("");
      setInvoiceDiscountError(undefined);
    } else if (invoiceDiscountError) {
      setInvoiceDiscountError(validateInvoiceDiscountValue(value, invoiceDiscountValue));
    }
  };

  const handleInvoiceDiscountValueChange = (value: string) => {
    setInvoiceDiscountValue(value);
    if (invoiceDiscountError) {
      setInvoiceDiscountError(validateInvoiceDiscountValue(invoiceDiscountType, value));
    }
  };

  const handleInvoiceDiscountBlur = () => {
    setInvoiceDiscountError(validateInvoiceDiscountValue(invoiceDiscountType, invoiceDiscountValue));
  };

  const handleSupportingContentChange = (name: string, value: string) => {
    const next = { ...supportingContent, [name]: value };
    setSupportingContent(next);
    if (hasAnySupportingContentError(supportingContentErrors)) {
      setSupportingContentErrors(validateSupportingContent(next));
    }
  };

  const handleSupportingContentBlur = () => {
    setSupportingContentErrors(validateSupportingContent(supportingContent));
  };

  const handlePaymentInstructionChange = (name: string, value: string) => {
    const next = { ...supportingContent, paymentInstructions: { ...supportingContent.paymentInstructions, [name]: value } };
    setSupportingContent(next);
    if (hasAnySupportingContentError(supportingContentErrors)) {
      setSupportingContentErrors(validateSupportingContent(next));
    }
  };

  const handlePaymentInstructionBlur = () => {
    setSupportingContentErrors(validateSupportingContent(supportingContent));
  };

  // Tax-inclusive/exclusive (FSD section 29) is a business setting with no settings page to
  // source a real value from yet (Epic IG-8) - always calculated exclusive here, matching the
  // domain default (docs/DATABASE_SCHEMA.md's businesses.tax_calculation_method).
  //
  // Memoized so typing in fields that don't affect totals (Notes, Terms, header/party details)
  // doesn't re-run this on every keystroke - CreateInvoiceEditor holds all state at the top level,
  // so any change here re-renders the whole tree regardless, but recomputing the line-item sum on
  // every unrelated keystroke was measurably slow once Notes/Terms/Payment Instructions added more
  // fields to type into.
  const parsedDiscountValue = invoiceDiscountValue.trim().length > 0 ? Number.parseFloat(invoiceDiscountValue) : null;
  const totals = useMemo(
    () =>
      calculateInvoiceTotals(
        lineItems.map(toCalculationInput),
        invoiceDiscountType,
        Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : null,
        "Exclusive",
      ),
    [lineItems, invoiceDiscountType, parsedDiscountValue],
  );

  return (
    <InvoiceEditorLayout
      editor={
        <div className="rounded-lg border border-slate-200 p-6">
          <InvoiceHeaderSection
            values={draft.header}
            currency={draft.currency}
            errors={headerErrors}
            onFieldChange={handleHeaderChange}
            onFieldBlur={handleHeaderBlur}
            onCurrencyChange={handleCurrencyChange}
          />
          <PartyDetailsSection
            title="Seller information"
            fields={SELLER_FIELDS}
            values={draft.seller}
            errors={sellerErrors}
            onFieldChange={handleSellerChange}
            onFieldBlur={handleSellerBlur}
          />
          <PartyDetailsSection
            title="Customer information"
            fields={CUSTOMER_FIELDS}
            values={draft.customer}
            errors={customerErrors}
            onFieldChange={handleCustomerChange}
            onFieldBlur={handleCustomerBlur}
          />
          <LineItemsSection
            items={lineItems}
            errors={lineItemErrors}
            onFieldChange={handleLineItemFieldChange}
            onFieldBlur={handleLineItemFieldBlur}
            onAdd={handleAddLineItem}
            onMoveUp={handleMoveLineItemUp}
            onMoveDown={handleMoveLineItemDown}
            onDuplicate={handleDuplicateLineItem}
            onRemove={handleRemoveLineItem}
          />
          <InvoiceTotalsSection
            currency={draft.currency}
            discountType={invoiceDiscountType}
            discountValue={invoiceDiscountValue}
            discountError={invoiceDiscountError}
            onDiscountTypeChange={handleInvoiceDiscountTypeChange}
            onDiscountValueChange={handleInvoiceDiscountValueChange}
            onDiscountBlur={handleInvoiceDiscountBlur}
            totals={totals}
          />
          <SupportingContentSection
            values={supportingContent}
            errors={supportingContentErrors}
            onFieldChange={handleSupportingContentChange}
            onFieldBlur={handleSupportingContentBlur}
            onPaymentInstructionChange={handlePaymentInstructionChange}
            onPaymentInstructionBlur={handlePaymentInstructionBlur}
          />
        </div>
      }
      preview={
        <InvoicePreview
          header={draft.header}
          currency={draft.currency}
          seller={draft.seller}
          customer={draft.customer}
          lineItems={lineItems}
          totals={totals}
          supportingContent={supportingContent}
        />
      }
    />
  );
}
