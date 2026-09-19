"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BILL_TO_FIELD, ESTIMATE_HEADER_FIELDS, FROM_FIELD, SHIP_TO_FIELD, validateField } from "../../../invoice/create/lib/fields";
import { hasAnyError, validateHeaderFields, type FieldErrors } from "../../../invoice/create/lib/invoiceDraft";
import { calculateInvoiceTotals, validateInvoiceDiscountValue, type InvoiceDiscountType } from "../../../invoice/create/lib/invoiceTotals";
import {
  cloneLineItem,
  createEmptyLineItem,
  hasAnyLineItemError,
  toCalculationInput,
  validateLineItems,
  type LineItem,
  type LineItemErrors,
} from "../../../invoice/create/lib/lineItems";
import { NOTES_FIELD, TERMS_FIELD } from "../../../invoice/create/lib/supportingContent";
import { getDefaultCustomization, sanitizeTemplateCustomization } from "../../../invoice/create/lib/templateCustomization";
import { fetchTemplates, type Template } from "../../../invoice/create/lib/templates";
import { downloadInvoicePdf } from "../../../invoice/create/lib/invoicePdf";
import { InvoiceHeaderSection } from "../../../invoice/create/components/InvoiceHeaderSection";
import { LineItemsSection } from "../../../invoice/create/components/LineItemsSection";
import { InvoiceTotalsSection } from "../../../invoice/create/components/InvoiceTotalsSection";
import { TemplateSelector } from "../../../invoice/create/components/TemplateSelector";
import { TemplateCustomizationPanel } from "../../../invoice/create/components/TemplateCustomizationPanel";
import { TextAreaField } from "../../../invoice/create/components/TextAreaField";
import { CustomerPicker } from "../../../invoice/create/components/CustomerPicker";
import { formatCustomerForBillTo } from "../../../invoice/create/lib/customerPicker";
import { formatBusinessProfileForSeller } from "../../../invoice/create/lib/businessProfileSeller";
import { getBusinessProfile, generateNextEstimateNumber } from "../../../lib/business";
import { listCustomers, type Customer } from "../../../lib/customers";
import { buildEstimateSavePayload, createEmptyEditableEstimate, createEstimate, updateEstimate, type EditableEstimate } from "../../../lib/estimate";
import { buildEstimatePdfPayloadFromEditable } from "../../../lib/estimatePdf";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * IG-220: an authenticated-only create flow ("As a registered user" - the AC's own wording,
 * unlike the invoice editor's anonymous-first design), so this deliberately mirrors
 * InvoiceDetail.tsx's structure (an authenticated editor reusing the shared sub-components) rather
 * than CreateInvoiceEditor.tsx - that component is heavily coupled to anonymous drafts,
 * localStorage auto-save and the account gate, none of which apply here. Adds the customer picker
 * (IG-56) since, unlike InvoiceDetail's edit-only page, this genuinely is a create flow.
 */
export function CreateEstimateEditor() {
  const router = useRouter();
  const [editable, setEditable] = useState<EditableEstimate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null);
  const [headerErrors, setHeaderErrors] = useState<FieldErrors>({});
  const [sellerError, setSellerError] = useState<string | undefined>();
  const [customerError, setCustomerError] = useState<string | undefined>();
  const [shipToError, setShipToError] = useState<string | undefined>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [lineItemErrors, setLineItemErrors] = useState<Record<string, LineItemErrors>>({});
  const [discountError, setDiscountError] = useState<string | undefined>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Bootstraps a brand-new estimate once: business profile (seller/currency defaults) and the
  // next estimate number (a real server-side side effect - generateNextEstimateNumber increments
  // NextEstimateNumber, so this must run exactly once, not speculatively/on every render).
  useEffect(() => {
    let cancelled = false;
    const issueDate = todayIsoDate();
    Promise.all([getBusinessProfile(), generateNextEstimateNumber()])
      .then(([profile, generated]) => {
        if (cancelled) {
          return;
        }
        setEditable(createEmptyEditableEstimate(profile.defaultCurrency, issueDate, addDaysIso(issueDate, 14)));
        setEditable((current) =>
          current
            ? {
                ...current,
                header: { ...current.header, invoiceNumber: generated.estimateNumber },
                seller: formatBusinessProfileForSeller(profile),
              }
            : current,
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to start a new estimate.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTemplates()
      .then((loaded) => {
        if (!cancelled) {
          setTemplates(loaded);
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
    let cancelled = false;
    listCustomers()
      .then((loaded) => {
        if (!cancelled) {
          setCustomers(loaded);
        }
      })
      .catch(() => {
        // Same reasoning as CreateInvoiceEditor - the picker is a convenience, not required to
        // create an estimate, so a failed fetch here just means an empty (not broken) picker.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTemplateCode = templates.find((template) => template.id === editable?.templateId)?.templateCode ?? "";

  const parsedDiscountValue = editable && editable.discountValue.trim().length > 0 ? Number.parseFloat(editable.discountValue) : null;
  const totals = useMemo(
    () =>
      editable
        ? calculateInvoiceTotals(
            editable.lineItems.map(toCalculationInput),
            editable.discountType,
            Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : null,
            "Exclusive",
          )
        : null,
    [editable, parsedDiscountValue],
  );

  if (loadError) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </p>
    );
  }

  if (!editable) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  const handleHeaderChange = (name: string, value: string) => {
    const nextHeader = { ...editable.header, [name]: value };
    setEditable({ ...editable, header: nextHeader });
    if (hasAnyError(headerErrors)) {
      setHeaderErrors(validateHeaderFields(nextHeader));
    }
  };

  const handleHeaderBlur = () => {
    setHeaderErrors(validateHeaderFields(editable.header));
  };

  const handleSelectCustomer = (customer: Customer) => {
    const value = formatCustomerForBillTo(customer);
    setEditable({ ...editable, customer: value });
    if (customerError) {
      setCustomerError(validateField(value, BILL_TO_FIELD));
    }
    setSelectedCustomerId(customer.id);
  };

  const handleLineItemFieldChange = (id: string, field: keyof LineItem, value: string) => {
    const nextItems = editable.lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    setEditable({ ...editable, lineItems: nextItems });
    if (hasAnyLineItemError(lineItemErrors)) {
      setLineItemErrors(validateLineItems(nextItems));
    }
  };

  const handleLineItemFieldBlur = () => {
    setLineItemErrors(validateLineItems(editable.lineItems));
  };

  const handleAddLineItem = () => {
    setEditable({ ...editable, lineItems: [...editable.lineItems, createEmptyLineItem()] });
  };

  const handleRemoveLineItem = (id: string) => {
    if (editable.lineItems.length === 1) {
      setEditable({ ...editable, lineItems: [createEmptyLineItem()] });
      return;
    }
    setEditable({ ...editable, lineItems: editable.lineItems.filter((item) => item.id !== id) });
  };

  const handleDuplicateLineItem = (id: string) => {
    const index = editable.lineItems.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    const duplicate = cloneLineItem(editable.lineItems[index]);
    setEditable({ ...editable, lineItems: [...editable.lineItems.slice(0, index + 1), duplicate, ...editable.lineItems.slice(index + 1)] });
  };

  const handleMoveLineItemUp = (id: string) => {
    const index = editable.lineItems.findIndex((item) => item.id === id);
    if (index <= 0) {
      return;
    }
    const next = [...editable.lineItems];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setEditable({ ...editable, lineItems: next });
  };

  const handleMoveLineItemDown = (id: string) => {
    const index = editable.lineItems.findIndex((item) => item.id === id);
    if (index === -1 || index >= editable.lineItems.length - 1) {
      return;
    }
    const next = [...editable.lineItems];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setEditable({ ...editable, lineItems: next });
  };

  const handleTemplateSelect = (templateId: string) => {
    const selected = templates.find((template) => template.id === templateId);
    setEditable({
      ...editable,
      templateId,
      templateCustomization: selected ? getDefaultCustomization(selected.templateCode) : editable.templateCustomization,
    });
  };

  const isValid = () =>
    !hasAnyError(validateHeaderFields(editable.header)) &&
    !validateField(editable.seller, FROM_FIELD) &&
    !validateField(editable.customer, BILL_TO_FIELD) &&
    !validateField(editable.shipTo, SHIP_TO_FIELD) &&
    !hasAnyLineItemError(validateLineItems(editable.lineItems)) &&
    !validateInvoiceDiscountValue(editable.discountType, editable.discountValue);

  const handleSave = async () => {
    if (!isValid()) {
      setHeaderErrors(validateHeaderFields(editable.header));
      setSellerError(validateField(editable.seller, FROM_FIELD));
      setCustomerError(validateField(editable.customer, BILL_TO_FIELD));
      setShipToError(validateField(editable.shipTo, SHIP_TO_FIELD));
      setLineItemErrors(validateLineItems(editable.lineItems));
      setDiscountError(validateInvoiceDiscountValue(editable.discountType, editable.discountValue));
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);
    try {
      const payload = buildEstimateSavePayload(editable, selectedCustomerId);
      const saved = savedEstimateId ? await updateEstimate(savedEstimateId, payload) : await createEstimate(payload);
      setSavedEstimateId(saved.id);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save this estimate.");
    }
  };

  const handleDownloadPdf = async () => {
    setPdfDownloading(true);
    setPdfError(null);
    try {
      const payload = buildEstimatePdfPayloadFromEditable(editable, selectedTemplateCode);
      await downloadInvoicePdf(payload);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Failed to generate the PDF.");
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* IG-220 AC: visually distinguishable from an invoice, on screen. */}
          <p className="text-sm font-medium text-slate-600">Estimate</p>
          <h1 className="text-2xl font-bold text-slate-950">New Estimate</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={pdfDownloading}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {pdfDownloading ? "Generating…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveStatus === "saving"}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {pdfError ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pdfError}
        </p>
      ) : null}

      {saveStatus === "saved" ? (
        <p role="status" className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Saved.{" "}
          <button type="button" onClick={() => router.push(`/documents/estimates/${savedEstimateId}`)} className="font-semibold underline">
            View saved estimate
          </button>
        </p>
      ) : null}
      {saveStatus === "error" ? (
        <p role="alert" className="mt-6 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{saveError}</span>
          <button type="button" onClick={() => void handleSave()} className="font-semibold underline">
            Retry
          </button>
        </p>
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-200 p-6">
        <TemplateSelector
          templates={templates}
          selectedTemplateId={editable.templateId}
          loading={templatesLoading}
          error={templatesError}
          onSelect={handleTemplateSelect}
        />
        <TemplateCustomizationPanel
          customization={editable.templateCustomization}
          onChange={(next) => setEditable({ ...editable, templateCustomization: sanitizeTemplateCustomization(next, selectedTemplateCode) })}
        />

        <div className="mt-6 border-t border-slate-200 pt-6">
          <InvoiceHeaderSection
            values={editable.header}
            currency={editable.currency}
            errors={headerErrors}
            advancedVisible
            fields={ESTIMATE_HEADER_FIELDS}
            legend="Estimate details"
            onFieldChange={handleHeaderChange}
            onFieldBlur={handleHeaderBlur}
            onCurrencyChange={(value) => setEditable({ ...editable, currency: value })}
          />
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6">
          <TextAreaField
            field={FROM_FIELD}
            value={editable.seller}
            error={sellerError}
            rows={4}
            onChange={(_name, value) => {
              setEditable({ ...editable, seller: value });
              if (sellerError) {
                setSellerError(validateField(value, FROM_FIELD));
              }
            }}
            onBlur={() => setSellerError(validateField(editable.seller, FROM_FIELD))}
          />
          {customers.length > 0 ? <CustomerPicker customers={customers} onSelect={handleSelectCustomer} /> : null}
          <TextAreaField
            field={BILL_TO_FIELD}
            value={editable.customer}
            error={customerError}
            rows={4}
            onChange={(_name, value) => {
              setEditable({ ...editable, customer: value });
              setSelectedCustomerId(null);
              if (customerError) {
                setCustomerError(validateField(value, BILL_TO_FIELD));
              }
            }}
            onBlur={() => setCustomerError(validateField(editable.customer, BILL_TO_FIELD))}
          />
          <TextAreaField
            field={SHIP_TO_FIELD}
            value={editable.shipTo}
            error={shipToError}
            rows={4}
            onChange={(_name, value) => {
              setEditable({ ...editable, shipTo: value });
              if (shipToError) {
                setShipToError(validateField(value, SHIP_TO_FIELD));
              }
            }}
            onBlur={() => setShipToError(validateField(editable.shipTo, SHIP_TO_FIELD))}
          />
        </div>

        <LineItemsSection
          items={editable.lineItems}
          errors={lineItemErrors}
          onFieldChange={handleLineItemFieldChange}
          onFieldBlur={handleLineItemFieldBlur}
          onAdd={handleAddLineItem}
          onMoveUp={handleMoveLineItemUp}
          onMoveDown={handleMoveLineItemDown}
          onDuplicate={handleDuplicateLineItem}
          onRemove={handleRemoveLineItem}
        />

        {totals ? (
          <InvoiceTotalsSection
            currency={editable.currency}
            discountType={editable.discountType}
            discountValue={editable.discountValue}
            discountError={discountError}
            onDiscountTypeChange={(value: InvoiceDiscountType) => {
              setEditable({ ...editable, discountType: value, discountValue: value === "None" ? "" : editable.discountValue });
              setDiscountError(undefined);
            }}
            onDiscountValueChange={(value) => {
              setEditable({ ...editable, discountValue: value });
              if (discountError) {
                setDiscountError(validateInvoiceDiscountValue(editable.discountType, value));
              }
            }}
            onDiscountBlur={() => setDiscountError(validateInvoiceDiscountValue(editable.discountType, editable.discountValue))}
            totals={totals}
          />
        ) : null}

        <fieldset className="mt-6 border-t border-slate-200 pt-6">
          <legend className="text-base font-semibold text-slate-950">Terms and Conditions</legend>
          <div className="mt-4">
            <TextAreaField
              field={TERMS_FIELD}
              value={editable.terms}
              rows={6}
              onChange={(_name, value) => setEditable({ ...editable, terms: value })}
              onBlur={() => {}}
            />
          </div>
        </fieldset>

        <fieldset className="mt-6 border-t border-slate-200 pt-6">
          <legend className="text-base font-semibold text-slate-950">Notes</legend>
          <div className="mt-4">
            <TextAreaField field={NOTES_FIELD} value={editable.notes} rows={4} onChange={(_name, value) => setEditable({ ...editable, notes: value })} onBlur={() => {}} />
          </div>
        </fieldset>

        <fieldset className="mt-6 border-t border-slate-200 pt-6">
          <legend className="text-base font-semibold text-slate-950">Payment Instructions</legend>
          <div className="mt-4 flex flex-col gap-1">
            <label htmlFor="estimate-payment-instructions" className="text-sm font-medium text-slate-700">
              Payment Instructions
            </label>
            <textarea
              id="estimate-payment-instructions"
              value={editable.paymentInstructions}
              onChange={(event) => setEditable({ ...editable, paymentInstructions: event.target.value })}
              rows={4}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            />
          </div>
        </fieldset>
      </div>
    </div>
  );
}
