"use client";

import { useEffect, useState } from "react";
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
import { InvoiceEditorLayout } from "./InvoiceEditorLayout";
import { InvoiceHeaderSection } from "./InvoiceHeaderSection";
import { InvoicePreview } from "./InvoicePreview";
import { PartyDetailsSection } from "./PartyDetailsSection";

export function CreateInvoiceEditor() {
  const [draft, setDraft] = useState(createEmptyDraft);
  const [headerErrors, setHeaderErrors] = useState<FieldErrors>({});
  const [sellerErrors, setSellerErrors] = useState<FieldErrors>({});
  const [customerErrors, setCustomerErrors] = useState<FieldErrors>({});

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
        </div>
      }
      preview={
        <InvoicePreview
          header={draft.header}
          currency={draft.currency}
          seller={draft.seller}
          customer={draft.customer}
        />
      }
    />
  );
}
