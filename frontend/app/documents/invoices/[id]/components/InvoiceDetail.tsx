"use client";

import { useEffect, useMemo, useState } from "react";
import { BILL_TO_FIELD, FROM_FIELD, SHIP_TO_FIELD, validateField } from "../../../../invoice/create/lib/fields";
import { hasAnyError, validateHeaderFields, type FieldErrors, type FieldValues } from "../../../../invoice/create/lib/invoiceDraft";
import { calculateInvoiceTotals, validateInvoiceDiscountValue, type InvoiceDiscountType } from "../../../../invoice/create/lib/invoiceTotals";
import {
  cloneLineItem,
  createEmptyLineItem,
  hasAnyLineItemError,
  toCalculationInput,
  validateLineItems,
  type LineItem,
  type LineItemErrors,
} from "../../../../invoice/create/lib/lineItems";
import { NOTES_FIELD, TERMS_FIELD } from "../../../../invoice/create/lib/supportingContent";
import { getDefaultCustomization, sanitizeTemplateCustomization, type TemplateCustomization } from "../../../../invoice/create/lib/templateCustomization";
import { fetchTemplates, type Template } from "../../../../invoice/create/lib/templates";
import { updateInvoice } from "../../../../invoice/create/lib/invoiceSave";
import { InvoiceHeaderSection } from "../../../../invoice/create/components/InvoiceHeaderSection";
import { LineItemsSection } from "../../../../invoice/create/components/LineItemsSection";
import { InvoiceTotalsSection } from "../../../../invoice/create/components/InvoiceTotalsSection";
import { TemplateSelector } from "../../../../invoice/create/components/TemplateSelector";
import { TemplateCustomizationPanel } from "../../../../invoice/create/components/TemplateCustomizationPanel";
import { TextAreaField } from "../../../../invoice/create/components/TextAreaField";
import { buildInvoiceUpdatePayload, getInvoice, toEditableInvoice, type EditableInvoice, type InvoiceDetail as InvoiceDetailData } from "../../../../lib/invoiceDetail";

type LoadState = "loading" | "loaded" | "error";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

interface InvoiceDetailProps {
  invoiceId: string;
}

/**
 * FSD section 49 (Invoice Detail Page) + section 50 (Invoice Edit). Deliberately does NOT reuse
 * CreateInvoiceEditor - that component is heavily coupled to anonymous drafts, localStorage
 * auto-save and the account gate, none of which apply to editing an already-saved, authenticated
 * invoice. Instead reuses its underlying sub-components (header/line-items/totals/template) that
 * have no such coupling. No live InvoicePreview here either - it's built around
 * SupportingContentValues' 7 structured Payment Instructions fields, which this page deliberately
 * doesn't use (see lib/invoiceDetail.ts's doc comment) - a metadata/totals summary stands in for
 * it instead. "Activity" (FSD section 49) is shown minimally as created/updated timestamps - no
 * real audit log exists yet (IG-50, a separate Story).
 */
export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const [state, setState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetailData | null>(null);
  const [editable, setEditable] = useState<EditableInvoice | null>(null);
  const [headerErrors, setHeaderErrors] = useState<FieldErrors>({});
  const [sellerError, setSellerError] = useState<string | undefined>();
  const [customerError, setCustomerError] = useState<string | undefined>();
  const [shipToError, setShipToError] = useState<string | undefined>();
  const [lineItemErrors, setLineItemErrors] = useState<Record<string, LineItemErrors>>({});
  const [invoiceDiscountError, setInvoiceDiscountError] = useState<string | undefined>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvoice(invoiceId)
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        setDetail(loaded);
        setEditable(toEditableInvoice(loaded));
        setState("loaded");
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load this invoice.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

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

  const selectedTemplateCode = templates.find((template) => template.id === editable?.templateId)?.templateCode ?? "";

  const parsedDiscountValue = editable && editable.invoiceDiscountValue.trim().length > 0 ? Number.parseFloat(editable.invoiceDiscountValue) : null;
  const totals = useMemo(
    () =>
      editable
        ? calculateInvoiceTotals(
            editable.lineItems.map(toCalculationInput),
            editable.invoiceDiscountType,
            Number.isFinite(parsedDiscountValue) ? parsedDiscountValue : null,
            "Exclusive",
          )
        : null,
    [editable, parsedDiscountValue],
  );

  if (state === "loading") {
    return <p className="text-sm text-slate-600">Loading invoice…</p>;
  }

  if (state === "error" || !detail || !editable) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </p>
    );
  }

  const handleHeaderChange = (name: string, value: string) => {
    const nextHeader: FieldValues = { ...editable.header, [name]: value };
    setEditable({ ...editable, header: nextHeader });
    if (hasAnyError(headerErrors)) {
      setHeaderErrors(validateHeaderFields(nextHeader));
    }
  };

  const handleHeaderBlur = () => {
    setHeaderErrors(validateHeaderFields(editable.header));
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

  // FSD section 24: with only one row left, "Remove" clears its fields rather than removing the
  // row - an invoice must always have at least one item (same rule CreateInvoiceEditor follows).
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
    !validateInvoiceDiscountValue(editable.invoiceDiscountType, editable.invoiceDiscountValue);

  const handleSave = async () => {
    if (!isValid()) {
      setHeaderErrors(validateHeaderFields(editable.header));
      setSellerError(validateField(editable.seller, FROM_FIELD));
      setCustomerError(validateField(editable.customer, BILL_TO_FIELD));
      setShipToError(validateField(editable.shipTo, SHIP_TO_FIELD));
      setLineItemErrors(validateLineItems(editable.lineItems));
      setInvoiceDiscountError(validateInvoiceDiscountValue(editable.invoiceDiscountType, editable.invoiceDiscountValue));
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);
    try {
      const payload = buildInvoiceUpdatePayload(editable);
      const saved = await updateInvoice(invoiceId, payload);
      setDetail((current) => (current ? { ...current, ...saved } : current));
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save this invoice.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">Invoice</p>
          <h1 className="text-2xl font-bold text-slate-950">{detail.invoiceNumber}</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{detail.status}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveStatus === "saving"}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saveStatus === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Created {formatDateTime(detail.createdAt)} · Last updated {formatDateTime(detail.updatedAt)}
      </p>

      {detail.status === "Paid" ? (
        <p role="alert" className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This invoice is marked Paid. You can still edit it, but changes may affect records that depend on it.
        </p>
      ) : null}

      {saveStatus === "saved" ? (
        <p role="status" className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Saved.
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

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-slate-500">Subtotal</p>
          <p className="font-semibold text-slate-950">{formatCurrency(detail.subtotal, detail.currency)}</p>
        </div>
        <div>
          <p className="text-slate-500">Tax</p>
          <p className="font-semibold text-slate-950">{formatCurrency(detail.taxAmount, detail.currency)}</p>
        </div>
        <div>
          <p className="text-slate-500">Total</p>
          <p className="font-semibold text-slate-950">{formatCurrency(detail.totalAmount, detail.currency)}</p>
        </div>
        <div>
          <p className="text-slate-500">Amount Due</p>
          <p className="font-semibold text-slate-950">{formatCurrency(detail.amountDue, detail.currency)}</p>
        </div>
      </div>

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
          <TextAreaField
            field={BILL_TO_FIELD}
            value={editable.customer}
            error={customerError}
            rows={4}
            onChange={(_name, value) => {
              setEditable({ ...editable, customer: value });
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
            discountType={editable.invoiceDiscountType}
            discountValue={editable.invoiceDiscountValue}
            discountError={invoiceDiscountError}
            onDiscountTypeChange={(value: InvoiceDiscountType) => {
              setEditable({ ...editable, invoiceDiscountType: value, invoiceDiscountValue: value === "None" ? "" : editable.invoiceDiscountValue });
              setInvoiceDiscountError(undefined);
            }}
            onDiscountValueChange={(value) => {
              setEditable({ ...editable, invoiceDiscountValue: value });
              if (invoiceDiscountError) {
                setInvoiceDiscountError(validateInvoiceDiscountValue(editable.invoiceDiscountType, value));
              }
            }}
            onDiscountBlur={() => setInvoiceDiscountError(validateInvoiceDiscountValue(editable.invoiceDiscountType, editable.invoiceDiscountValue))}
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
            <label htmlFor="invoice-payment-instructions" className="text-sm font-medium text-slate-700">
              Payment Instructions
            </label>
            <textarea
              id="invoice-payment-instructions"
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
