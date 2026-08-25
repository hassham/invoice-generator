"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BILL_TO_FIELD, FROM_FIELD, SHIP_TO_FIELD, validateField } from "../lib/fields";
import {
  createEmptyDraft,
  hasAnyError,
  todayIsoDate,
  validateHeaderFields,
  type FieldErrors,
  type FieldValues,
  type InvoiceDraft,
} from "../lib/invoiceDraft";
import { getInvalidSectionLabels, hasAdvancedOnlyError, validateInvoice } from "../lib/invoiceValidation";
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
  TERMS_FIELD,
  validateSupportingContent,
  type SupportingContentErrors,
} from "../lib/supportingContent";
import { fetchTemplates, type Template } from "../lib/templates";
import { hasUnsavedChanges } from "../lib/unsavedChanges";
import { EditorModeTabs } from "./EditorModeTabs";
import { InvoiceEditorLayout } from "./InvoiceEditorLayout";
import { InvoiceHeaderSection } from "./InvoiceHeaderSection";
import { InvoicePreview } from "./InvoicePreview";
import { InvoiceTotalsSection } from "./InvoiceTotalsSection";
import { LineItemsSection } from "./LineItemsSection";
import { SupportingContentSection } from "./SupportingContentSection";
import { TemplateSelector } from "./TemplateSelector";
import { TextAreaField } from "./TextAreaField";

export function CreateInvoiceEditor() {
  const [draft, setDraft] = useState(createEmptyDraft);
  const [headerErrors, setHeaderErrors] = useState<FieldErrors>({});
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [sellerError, setSellerError] = useState<string | undefined>();
  const [customerError, setCustomerError] = useState<string | undefined>();
  const [shipToError, setShipToError] = useState<string | undefined>();
  const [lineItems, setLineItems] = useState<LineItem[]>(() => [createEmptyLineItem()]);
  const [lineItemErrors, setLineItemErrors] = useState<Record<string, LineItemErrors>>({});
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<InvoiceDiscountType>("None");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState("");
  const [invoiceDiscountError, setInvoiceDiscountError] = useState<string | undefined>();
  const [supportingContent, setSupportingContent] = useState(createEmptySupportingContent);
  const [supportingContentErrors, setSupportingContentErrors] = useState<SupportingContentErrors>({
    paymentInstructions: {},
  });
  const [reviewed, setReviewed] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // IG-124: "nothing typed yet" baselines for the unsaved-changes guard below. lineItems/discount/
  // supportingContent have no post-mount default-filling, so their very first render's value is
  // already pristine - a plain useRef(initialValue) captures it (useRef's argument is only used on
  // the first call). draft is different: its issue/due dates are filled in by the effect below
  // *after* mount, so its pristine snapshot is captured inside that same effect instead (see there).
  const pristineDraftRef = useRef<InvoiceDraft | null>(null);
  const pristineLineItemsRef = useRef(lineItems);
  const pristineDiscountTypeRef = useRef(invoiceDiscountType);
  const pristineDiscountValueRef = useRef(invoiceDiscountValue);
  const pristineSupportingContentRef = useRef(supportingContent);

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
    setDraft((current) => {
      const next = current.header.issueDate
        ? current
        : {
            ...current,
            header: { ...current.header, issueDate: today, dueDate: today },
          };
      // Captured here, not in a separate effect - a separate effect declared after this one would
      // still close over the pre-fill (empty-dates) draft in this same initial commit, since React
      // runs same-commit passive effects before processing either one's state update, and would
      // wrongly count the auto-filled dates as an unsaved change before the user has typed anything.
      pristineDraftRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    // IG-39: fetches the launch templates (first backend call this app makes - see
    // lib/templates.ts) and, once loaded, defaults to the first one if the user hasn't already
    // picked one. Patches only `templateId` into the existing pristine snapshot rather than
    // recomputing it from `current` draft - recomputing from current would be wrong if the user
    // had already typed something else (e.g. From) while this fetch was still in flight, which
    // would wipe the unsaved-changes guard's memory of that real edit.
    let cancelled = false;
    fetchTemplates()
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        setTemplates(loaded);
        const [firstTemplate] = [...loaded].sort((a, b) => a.sortOrder - b.sortOrder);
        if (firstTemplate) {
          setDraft((current) => {
            if (current.templateId) {
              return current;
            }
            if (pristineDraftRef.current) {
              pristineDraftRef.current = { ...pristineDraftRef.current, templateId: firstTemplate.id };
            }
            return { ...current, templateId: firstTemplate.id };
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplatesError("Failed to load templates.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!pristineDraftRef.current) {
        return;
      }
      const dirty = hasUnsavedChanges(
        { draft, lineItems, invoiceDiscountType, invoiceDiscountValue, supportingContent },
        {
          draft: pristineDraftRef.current,
          lineItems: pristineLineItemsRef.current,
          invoiceDiscountType: pristineDiscountTypeRef.current,
          invoiceDiscountValue: pristineDiscountValueRef.current,
          supportingContent: pristineSupportingContentRef.current,
        },
      );
      if (dirty) {
        // Browsers always show their own generic confirmation text regardless of returnValue's
        // content - both preventDefault() and setting returnValue are needed for cross-browser
        // support (older Firefox/Safari versions rely on returnValue, current Chrome on preventDefault).
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draft, lineItems, invoiceDiscountType, invoiceDiscountValue, supportingContent]);

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

  // FSD section 33: "Selecting a template retains all invoice data" - this touches nothing else.
  const handleTemplateSelect = (templateId: string) => {
    setDraft((current) => ({ ...current, templateId }));
  };

  const handleSellerChange = (_name: string, value: string) => {
    setDraft((current) => ({ ...current, seller: value }));
    if (sellerError) {
      setSellerError(validateField(value, FROM_FIELD));
    }
  };

  const handleSellerBlur = () => {
    setSellerError(validateField(draft.seller, FROM_FIELD));
  };

  const handleCustomerChange = (_name: string, value: string) => {
    setDraft((current) => ({ ...current, customer: value }));
    if (customerError) {
      setCustomerError(validateField(value, BILL_TO_FIELD));
    }
  };

  const handleCustomerBlur = () => {
    setCustomerError(validateField(draft.customer, BILL_TO_FIELD));
  };

  const handleShipToChange = (_name: string, value: string) => {
    setDraft((current) => ({ ...current, shipTo: value }));
    if (shipToError) {
      setShipToError(validateField(value, SHIP_TO_FIELD));
    }
  };

  const handleShipToBlur = () => {
    setShipToError(validateField(draft.shipTo, SHIP_TO_FIELD));
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

  // FSD section 41: runs every section's existing validator at once - equivalent to blurring
  // every field simultaneously, so it reuses each section's existing error rendering rather than
  // introducing new per-field UI. Auto-reveals Advanced if that's where the only errors are, so
  // Review never leaves an error hidden behind the Basic/Advanced toggle (IG-193).
  const handleReviewInvoice = () => {
    const result = validateInvoice({
      header: draft.header,
      seller: draft.seller,
      customer: draft.customer,
      shipTo: draft.shipTo,
      lineItems,
      invoiceDiscountType,
      invoiceDiscountValue,
      supportingContent,
    });
    setHeaderErrors(result.headerErrors);
    setSellerError(result.sellerError);
    setCustomerError(result.customerError);
    setShipToError(result.shipToError);
    setLineItemErrors(result.lineItemErrors);
    setInvoiceDiscountError(result.invoiceDiscountError);
    setSupportingContentErrors(result.supportingContentErrors);
    setReviewed(true);
    if (hasAdvancedOnlyError(result)) {
      setAdvancedVisible(true);
    }
  };

  // Derived from the *current* error states, not a frozen snapshot of the Review click - each
  // section already re-validates live once it has shown an error (the keystroke-revalidation
  // pattern used throughout this component), so this list - and the banner below - shrinks on its
  // own as errors are fixed, without needing another Review click.
  const invalidSectionLabels = useMemo(
    () =>
      getInvalidSectionLabels({
        headerErrors,
        sellerError,
        customerError,
        shipToError,
        lineItemErrors,
        invoiceDiscountError,
        supportingContentErrors,
      }),
    [headerErrors, sellerError, customerError, shipToError, lineItemErrors, invoiceDiscountError, supportingContentErrors],
  );

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

  const selectedTemplateCode = templates.find((template) => template.id === draft.templateId)?.templateCode ?? "";

  return (
    <InvoiceEditorLayout
      editor={
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <EditorModeTabs advancedVisible={advancedVisible} onChange={setAdvancedVisible} />
            <button
              type="button"
              onClick={handleReviewInvoice}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Review invoice
            </button>
          </div>
          {reviewed ? (
            invalidSectionLabels.length > 0 ? (
              <p role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                This invoice isn&apos;t ready yet. Fix the highlighted fields in: {invalidSectionLabels.join(", ")}.
              </p>
            ) : (
              <p role="status" className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                This invoice looks ready.
              </p>
            )
          ) : null}
          <TemplateSelector
            templates={templates}
            selectedTemplateId={draft.templateId}
            loading={templatesLoading}
            error={templatesError}
            onSelect={handleTemplateSelect}
          />
          <div className="mt-6 border-t border-slate-200 pt-6">
            <InvoiceHeaderSection
              values={draft.header}
              currency={draft.currency}
              errors={headerErrors}
              advancedVisible={advancedVisible}
              onFieldChange={handleHeaderChange}
              onFieldBlur={handleHeaderBlur}
              onCurrencyChange={handleCurrencyChange}
            />
          </div>
          <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6">
            <TextAreaField field={FROM_FIELD} value={draft.seller} error={sellerError} rows={4} onChange={handleSellerChange} onBlur={handleSellerBlur} />
            <TextAreaField field={BILL_TO_FIELD} value={draft.customer} error={customerError} rows={4} onChange={handleCustomerChange} onBlur={handleCustomerBlur} />
            <div hidden={!advancedVisible}>
              <TextAreaField field={SHIP_TO_FIELD} value={draft.shipTo} error={shipToError} rows={4} onChange={handleShipToChange} onBlur={handleShipToBlur} />
            </div>
          </div>
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
          <fieldset className="mt-6 border-t border-slate-200 pt-6">
            <legend className="text-base font-semibold text-slate-950">Terms and Conditions</legend>
            <div className="mt-4">
              <TextAreaField
                field={TERMS_FIELD}
                value={supportingContent.terms}
                error={supportingContentErrors.terms}
                rows={6}
                onChange={handleSupportingContentChange}
                onBlur={handleSupportingContentBlur}
              />
            </div>
          </fieldset>
          <div hidden={!advancedVisible}>
            <SupportingContentSection
              values={supportingContent}
              errors={supportingContentErrors}
              onFieldChange={handleSupportingContentChange}
              onFieldBlur={handleSupportingContentBlur}
              onPaymentInstructionChange={handlePaymentInstructionChange}
              onPaymentInstructionBlur={handlePaymentInstructionBlur}
            />
          </div>
        </div>
      }
      preview={
        <InvoicePreview
          header={draft.header}
          currency={draft.currency}
          seller={draft.seller}
          customer={draft.customer}
          shipTo={draft.shipTo}
          lineItems={lineItems}
          totals={totals}
          supportingContent={supportingContent}
          templateCode={selectedTemplateCode}
        />
      }
    />
  );
}
