"use client";

import { useRouter } from "next/navigation";
import { WorkspaceHeading, WorkspaceState } from "../../../../components/ui/WorkspaceCollection";
import { StatusBadge, toneForInvoiceStatus } from "../../../../components/ui/StatusBadge";
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
import { downloadInvoicePdf } from "../../../../invoice/create/lib/invoicePdf";
import { buildInvoicePdfPayloadFromEditable } from "../../../../lib/invoiceDetailPdf";
import { InvoiceHeaderSection } from "../../../../invoice/create/components/InvoiceHeaderSection";
import { LineItemsSection } from "../../../../invoice/create/components/LineItemsSection";
import { InvoiceTotalsSection } from "../../../../invoice/create/components/InvoiceTotalsSection";
import { TemplateSelector } from "../../../../invoice/create/components/TemplateSelector";
import { TemplateCustomizationPanel } from "../../../../invoice/create/components/TemplateCustomizationPanel";
import { TextAreaField } from "../../../../invoice/create/components/TextAreaField";
import {
  buildInvoiceUpdatePayload,
  cancelInvoice,
  deleteInvoice,
  duplicateInvoice,
  getInvoice,
  markInvoiceIssued,
  toEditableInvoice,
  type EditableInvoice,
  type InvoiceDetail as InvoiceDetailData,
} from "../../../../lib/invoiceDetail";
import { ConfirmDialog } from "./ConfirmDialog";
import { InvoiceEmailHistorySection } from "./InvoiceEmailHistorySection";
import { PaymentsSection } from "./PaymentsSection";
import { SendInvoiceEmailDialog } from "./SendInvoiceEmailDialog";
import type { InvoicePaymentSummary } from "../../../../lib/payments";

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
 * real audit log exists yet (IG-50, a separate Story - IG-50 wired up the trail server-side, but
 * still no UI reads it back). IG-49 adds Cancel and Delete alongside Save - both destructive,
 * one-way actions confirmed via ConfirmDialog per FSD section 52.
 */
export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const router = useRouter();
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
  const [activeDialog, setActiveDialog] = useState<"cancel" | "delete" | null>(null);
  const [dialogPending, setDialogPending] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  // Bumped on every successful send so <InvoiceEmailHistorySection key={emailHistoryRefreshKey}>
  // remounts and refetches - the section owns its own fetch-on-mount effect, so a fresh key is a
  // simpler way to trigger that than threading a refetch callback down into it.
  const [emailHistoryRefreshKey, setEmailHistoryRefreshKey] = useState(0);

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
    return <WorkspaceState area="invoice" kind="loading">Loading invoice&hellip;</WorkspaceState>;
  }

  if (state === "error" || !detail || !editable) {
    return (
      <p role="alert" className="rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
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

  const closeDialog = () => {
    setActiveDialog(null);
    setDialogError(null);
  };

  const handleConfirmCancel = async () => {
    setDialogPending(true);
    setDialogError(null);
    try {
      const summary = await cancelInvoice(invoiceId);
      setDetail((current) => (current ? { ...current, ...summary } : current));
      setActiveDialog(null);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Failed to cancel this invoice.");
    } finally {
      setDialogPending(false);
    }
  };

  // IG-315: non-destructive, so no confirmation dialog. The server keeps the first issue date.
  const handleMarkIssued = async () => {
    setSaveError(null);
    try {
      const updated = await markInvoiceIssued(invoiceId);
      setDetail((current) => (current ? { ...current, ...updated } : current));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to mark this invoice as issued.");
    }
  };

  const handleConfirmDelete = async () => {
    setDialogPending(true);
    setDialogError(null);
    try {
      await deleteInvoice(invoiceId);
      router.push("/documents/invoices");
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Failed to delete this invoice.");
      setDialogPending(false);
    }
  };

  const handleInvoiceUpdated = (summary: InvoicePaymentSummary) => {
    setDetail((current) => (current ? { ...current, ...summary } : current));
  };

  // IG-197 / FSD section 49: reuses IG-43's stateless PDF endpoint and download logic - the saved
  // invoice's current editable state is mapped into the same payload shape the anonymous creation
  // flow already builds, rather than re-fetching by id (the endpoint takes a full payload, not a
  // reference - it renders whatever it's given, so this is enough to reproduce the saved invoice
  // exactly as last saved).
  const handleDownloadPdf = async () => {
    setPdfDownloading(true);
    setPdfError(null);
    try {
      const payload = buildInvoicePdfPayloadFromEditable(editable, selectedTemplateCode);
      await downloadInvoicePdf(payload);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Failed to generate the PDF.");
    } finally {
      setPdfDownloading(false);
    }
  };

  // FSD section 51: not destructive to the source invoice, so unlike Cancel/Delete this needs
  // no confirmation - lands the user straight on the new draft.
  const handleDuplicate = async () => {
    setDuplicating(true);
    setDuplicateError(null);
    try {
      const summary = await duplicateInvoice(invoiceId);
      router.push(`/documents/invoices/${summary.id}`);
    } catch (error) {
      setDuplicateError(error instanceof Error ? error.message : "Failed to duplicate this invoice.");
      setDuplicating(false);
    }
  };

  return (
    <div>
      <WorkspaceHeading area="invoice" eyebrow="Workspace / Saved invoice" title={detail.invoiceNumber}
        back={{ href: "/documents/invoices", label: "Back to invoices" }}
        description={<StatusBadge tone={toneForInvoiceStatus(detail.status)} label={detail.status === "PartiallyPaid" ? "Partially paid" : detail.status} />}
        actions={<button type="button" onClick={() => void handleSave()} disabled={saveStatus === "saving"}
          className="workspace-button-primary min-h-11">{saveStatus === "saving" ? "Saving..." : "Save"}</button>} />

      <section aria-label="Invoice actions" className="invoice-action-bar">
        <p>Invoice actions</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDuplicate()}
            disabled={duplicating}
            className="workspace-button-secondary"
          >
            {duplicating ? "Duplicating…" : "Duplicate"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={pdfDownloading}
            className="workspace-button-secondary"
          >
            {pdfDownloading ? "Generating…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEmailSent(false);
              setEmailDialogOpen(true);
            }}
            className="workspace-button-secondary"
          >
            Send by Email
          </button>
          {!detail.issuedAt && detail.status !== "Cancelled" ? (
            <button
              type="button"
              onClick={() => void handleMarkIssued()}
              className="workspace-button-secondary"
            >
              Mark as Issued
            </button>
          ) : null}
          {detail.status !== "Cancelled" && detail.status !== "Paid" ? (
            <button
              type="button"
              onClick={() => setActiveDialog("cancel")}
              className="workspace-button-secondary"
            >
              Cancel Invoice
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setActiveDialog("delete")}
            className="rounded-full border border-status-overdue-fg/25 px-4 py-2 text-sm font-semibold text-status-overdue-fg hover:bg-status-overdue-bg/55"
          >
            Delete
          </button>
        </div>
      </section>

      {activeDialog === "cancel" ? (
        <ConfirmDialog
          title="Cancel this invoice?"
          body="The invoice stays visible for your records, but is excluded from outstanding totals and can no longer be marked overdue. This cannot be undone from here."
          confirmLabel="Cancel Invoice"
          dismissLabel="Never mind"
          pending={dialogPending}
          error={dialogError}
          onConfirm={() => void handleConfirmCancel()}
          onDismiss={closeDialog}
        />
      ) : null}

      {activeDialog === "delete" ? (
        <ConfirmDialog
          title="Delete this invoice?"
          body="This removes the invoice from your invoice list. It isn't permanently erased, matching how customer records are archived rather than destroyed."
          confirmLabel="Delete"
          pending={dialogPending}
          error={dialogError}
          onConfirm={() => void handleConfirmDelete()}
          onDismiss={closeDialog}
        />
      ) : null}

      {emailDialogOpen ? (
        <SendInvoiceEmailDialog
          invoiceId={invoiceId}
          invoiceNumber={detail.invoiceNumber}
          customerId={detail.customerId}
          onClose={() => setEmailDialogOpen(false)}
          onSent={() => {
            setEmailDialogOpen(false);
            setEmailSent(true);
            setEmailHistoryRefreshKey((key) => key + 1);
          }}
        />
      ) : null}

      <p className="mt-2 text-xs text-muted">
        Created {formatDateTime(detail.createdAt)} · Last updated {formatDateTime(detail.updatedAt)}
      </p>

      {detail.status === "Paid" ? (
        <p role="alert" className="mt-6 rounded-md border border-status-pending-fg/25 bg-status-pending-bg/60 px-4 py-3 text-sm text-status-pending-fg">
          This invoice is marked Paid. You can still edit it, but changes may affect records that depend on it.
        </p>
      ) : null}

      {duplicateError ? (
        <p role="alert" className="mt-6 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {duplicateError}
        </p>
      ) : null}

      {pdfError ? (
        <p role="alert" className="mt-6 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {pdfError}
        </p>
      ) : null}

      {emailSent ? (
        <p role="status" className="mt-6 rounded-md border border-status-paid-fg/25 bg-status-paid-bg/65 px-4 py-3 text-sm text-status-paid-fg">
          Invoice sent.
        </p>
      ) : null}

      {saveStatus === "saved" ? (
        <p role="status" className="mt-6 rounded-md border border-status-paid-fg/25 bg-status-paid-bg/65 px-4 py-3 text-sm text-status-paid-fg">
          Saved.
        </p>
      ) : null}
      {saveStatus === "error" ? (
        <p role="alert" className="mt-6 flex items-center justify-between gap-3 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          <span>{saveError}</span>
          <button type="button" onClick={() => void handleSave()} className="font-semibold underline">
            Retry
          </button>
        </p>
      ) : null}

      <dl className="invoice-summary" aria-label="Invoice totals">
        {([
          ["Subtotal", detail.subtotal, "lavender"],
          ["Tax", detail.taxAmount, "paper"],
          ["Total", detail.totalAmount, "mint"],
          ["Amount Due", detail.amountDue, "yellow"],
        ] as const).map(([label, value, tone]) => <div key={label} data-tone={tone}>
          <dt>{label}</dt><dd>{formatCurrency(value, detail.currency)}</dd>
        </div>)}
      </dl>

      <div className="invoice-edit-panel">
        <p className="invoice-edit-kicker">Edit invoice</p>
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

        <div className="mt-6 border-t border-border pt-6">
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

        <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
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

        <fieldset className="mt-6 border-t border-border pt-6">
          <legend className="text-base font-semibold text-ink">Terms and Conditions</legend>
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

        <fieldset className="mt-6 border-t border-border pt-6">
          <legend className="text-base font-semibold text-ink">Notes</legend>
          <div className="mt-4">
            <TextAreaField field={NOTES_FIELD} value={editable.notes} rows={4} onChange={(_name, value) => setEditable({ ...editable, notes: value })} onBlur={() => {}} />
          </div>
        </fieldset>

        <fieldset className="mt-6 border-t border-border pt-6">
          <legend className="text-base font-semibold text-ink">Payment Instructions</legend>
          <div className="mt-4 flex flex-col gap-1">
            <label htmlFor="invoice-payment-instructions" className="text-sm font-medium text-ink">
              Payment Instructions
            </label>
            <textarea
              id="invoice-payment-instructions"
              value={editable.paymentInstructions}
              onChange={(event) => setEditable({ ...editable, paymentInstructions: event.target.value })}
              rows={4}
              className="workspace-field rounded-md border border-border px-3 py-2 text-sm text-ink"
            />
          </div>
        </fieldset>

        <PaymentsSection
          invoiceId={invoiceId}
          currency={detail.currency}
          status={detail.status}
          amountDue={detail.amountDue}
          onInvoiceUpdated={handleInvoiceUpdated}
        />

        <InvoiceEmailHistorySection key={emailHistoryRefreshKey} invoiceId={invoiceId} />
      </div>
    </div>
  );
}
