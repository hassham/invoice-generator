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
import { getInvalidSectionLabels, hasAdvancedOnlyError, isInvoiceValid, validateInvoice } from "../lib/invoiceValidation";
import { getCurrentSession } from "../../../lib/auth";
import { clearPendingGateAction, loadPendingGateAction, savePendingGateAction } from "../../../lib/pendingGateAction";
import { track } from "../../../../lib/analytics";
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
import { clearDraftSnapshot, loadDraftSnapshot, saveDraftSnapshot } from "../lib/draftStorage";
import { buildInvoicePdfPayload, downloadInvoicePdf } from "../lib/invoicePdf";
import { getDefaultCustomization, sanitizeTemplateCustomization, type TemplateCustomization } from "../lib/templateCustomization";
import { fetchTemplates, type Template } from "../lib/templates";
import { hasUnsavedChanges } from "../lib/unsavedChanges";
import { AccountGateModal } from "./AccountGateModal";
import { EditorModeTabs } from "./EditorModeTabs";
import { InvoiceEditorLayout } from "./InvoiceEditorLayout";
import { InvoiceHeaderSection } from "./InvoiceHeaderSection";
import { InvoicePreview } from "./InvoicePreview";
import { InvoiceTotalsSection } from "./InvoiceTotalsSection";
import { LineItemsSection } from "./LineItemsSection";
import { LogoUpload } from "./LogoUpload";
import { SupportingContentSection } from "./SupportingContentSection";
import { TemplateCustomizationPanel } from "./TemplateCustomizationPanel";
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
  const [draftRestored, setDraftRestored] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  // IG-30: defaults to "anonymous" - there's no synchronous way to know the session state before
  // the /me round trip resolves, and defaulting to authenticated would let an anonymous visitor
  // briefly slip past the gate on a slow connection.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingGateAction, setPendingGateAction] = useState<"download" | "print" | null>(null);
  const selectedTemplateCode = templates.find((template) => template.id === draft.templateId)?.templateCode ?? "";

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
  // IG-29: the auto-save effect below skips its very first invocation using this flag - at that
  // point `draft`/`lineItems`/etc still hold this component's pre-mount-effect values (the mount
  // effect hasn't applied a restored draft or filled in today's date yet: setState calls made
  // inside it don't retroactively change what this same commit's other effects already closed
  // over), so saving on that first run would overwrite a just-restored draft on disk with stale,
  // empty data for one tick.
  const isFirstAutoSaveRef = useRef(true);

  useEffect(() => {
    // IG-29: a previously auto-saved anonymous draft takes priority over today's-date prefill -
    // restoring the visitor's actual in-progress invoice is the point, so an empty draft's "fill in
    // today" default only applies when there's nothing to restore.
    const restored = loadDraftSnapshot();
    if (restored) {
      // Hydrating five separate pieces of state from one localStorage read (an external system) on
      // mount - the same class of problem useSyncExternalStore solves elsewhere in this app, but
      // doing that here would mean collapsing draft/lineItems/discount/supportingContent into one
      // shared atom, a much larger refactor of already-shipped, tested state (IG-29) than this lint
      // rule warrants.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(restored.draft);
      setLineItems(restored.lineItems);
      setInvoiceDiscountType(restored.invoiceDiscountType);
      setInvoiceDiscountValue(restored.invoiceDiscountValue);
      setSupportingContent(restored.supportingContent);
      pristineDraftRef.current = restored.draft;
      pristineLineItemsRef.current = restored.lineItems;
      pristineDiscountTypeRef.current = restored.invoiceDiscountType;
      pristineDiscountValueRef.current = restored.invoiceDiscountValue;
      pristineSupportingContentRef.current = restored.supportingContent;
      setDraftRestored(true);
      return;
    }

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

  // IG-29: "Auto-save locally where possible" (FSD section 81) - every edit re-persists the full
  // snapshot to localStorage so a later refresh/reopen can restore it via the effect above. Skips
  // its first run (see isFirstAutoSaveRef's comment) so it never overwrites a just-restored draft
  // with this component's pre-restore initial values.
  useEffect(() => {
    if (isFirstAutoSaveRef.current) {
      isFirstAutoSaveRef.current = false;
      return;
    }
    saveDraftSnapshot({ draft, lineItems, invoiceDiscountType, invoiceDiscountValue, supportingContent });
  }, [draft, lineItems, invoiceDiscountType, invoiceDiscountValue, supportingContent]);

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
          const defaultCustomization = getDefaultCustomization(firstTemplate.templateCode);
          setDraft((current) => {
            if (current.templateId) {
              return current;
            }
            if (pristineDraftRef.current) {
              pristineDraftRef.current = {
                ...pristineDraftRef.current,
                templateId: firstTemplate.id,
                templateCustomization: defaultCustomization,
              };
            }
            return { ...current, templateId: firstTemplate.id, templateCustomization: defaultCustomization };
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
    let cancelled = false;
    getCurrentSession().then((account) => {
      if (!cancelled) {
        setIsAuthenticated(account !== null);
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

  // FSD section 33: "Selecting a template retains all invoice data" - only templateId and
  // templateCustomization change. Customisation resets to the newly-selected template's defaults
  // (IG-40 scope decision: appearance is tied to the current template, not carried-over invoice
  // data - pick a template, then tweak its colors, same model as switching a doc editor's theme).
  const handleTemplateSelect = (templateId: string) => {
    const selected = templates.find((template) => template.id === templateId);
    setDraft((current) => ({
      ...current,
      templateId,
      templateCustomization: selected ? getDefaultCustomization(selected.templateCode) : current.templateCustomization,
    }));
  };

  const handleCustomizationChange = (next: TemplateCustomization) => {
    setDraft((current) => ({
      ...current,
      templateCustomization: sanitizeTemplateCustomization(next, selectedTemplateCode),
    }));
  };

  const handleLogoChange = (logo: string | null) => {
    setDraft((current) => ({ ...current, logo }));
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

  // IG-29 (AC3): the retention-policy expiry above clears a draft automatically; this is the
  // explicit, user-triggered clear - resets every field and validation-error state back to the
  // same blank slate a fresh mount starts from, not just the five persisted snapshot fields.
  const handleDiscardDraft = () => {
    clearDraftSnapshot();
    // Re-armed so the auto-save effect skips the render this reset triggers, the same way it skips
    // the very first render after a real mount - otherwise it would immediately re-persist this
    // blank state right after the clear above, leaving a (blank) entry in storage instead of none.
    isFirstAutoSaveRef.current = true;
    const today = todayIsoDate();
    const emptyDraft = createEmptyDraft();
    const freshDraft: InvoiceDraft = { ...emptyDraft, header: { ...emptyDraft.header, issueDate: today, dueDate: today } };
    const freshLineItems = [createEmptyLineItem()];
    const freshSupportingContent = createEmptySupportingContent();
    setDraft(freshDraft);
    setHeaderErrors({});
    setSellerError(undefined);
    setCustomerError(undefined);
    setShipToError(undefined);
    setLineItems(freshLineItems);
    setLineItemErrors({});
    setInvoiceDiscountType("None");
    setInvoiceDiscountValue("");
    setInvoiceDiscountError(undefined);
    setSupportingContent(freshSupportingContent);
    setSupportingContentErrors({ paymentInstructions: {} });
    setReviewed(false);
    pristineDraftRef.current = freshDraft;
    pristineLineItemsRef.current = freshLineItems;
    pristineDiscountTypeRef.current = "None";
    pristineDiscountValueRef.current = "";
    pristineSupportingContentRef.current = freshSupportingContent;
    setDraftRestored(false);
  };

  const buildCurrentValidationResult = () =>
    validateInvoice({
      header: draft.header,
      seller: draft.seller,
      customer: draft.customer,
      shipTo: draft.shipTo,
      lineItems,
      invoiceDiscountType,
      invoiceDiscountValue,
      supportingContent,
    });

  // FSD section 41: runs every section's existing validator at once - equivalent to blurring
  // every field simultaneously, so it reuses each section's existing error rendering rather than
  // introducing new per-field UI. Auto-reveals Advanced if that's where the only errors are, so
  // Review never leaves an error hidden behind the Basic/Advanced toggle (IG-193).
  const applyValidationResult = (result: ReturnType<typeof validateInvoice>) => {
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

  const handleReviewInvoice = () => {
    applyValidationResult(buildCurrentValidationResult());
  };

  // FSD section 38's "Validate invoice" step - the first real consumer of isInvoiceValid as "the
  // flag future Save/PDF/Print stories should gate on" (IG-123's plan). An invalid invoice gets
  // exactly the same treatment as clicking "Review invoice" instead of attempting a doomed request.
  const handleDownloadPdf = async () => {
    const result = buildCurrentValidationResult();
    if (!isInvoiceValid(result)) {
      applyValidationResult(result);
      return;
    }
    // IG-30 / FSD section 117: anonymous users see the account gate instead of a download - the
    // gate's own Sign up/Log in links are the only way past this, not a retry of this button.
    // IG-31: the requested action is also persisted (not just held in this component's state) so
    // it survives the navigation to /signup or /login and back.
    if (!isAuthenticated) {
      setPendingGateAction("download");
      savePendingGateAction("download");
      track({ name: "anonymous_gate_shown", properties: { action: "download" } });
      return;
    }
    setPdfDownloading(true);
    setPdfError(null);
    try {
      const payload = buildInvoicePdfPayload({
        draft,
        lineItems,
        invoiceDiscountType,
        invoiceDiscountValue,
        supportingContent,
        templateCode: selectedTemplateCode,
      });
      await downloadInvoicePdf(payload);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Failed to generate the PDF.");
    } finally {
      setPdfDownloading(false);
    }
  };

  // FSD section 40 (Print Invoice) - not gated on isInvoiceValid, unlike Download PDF: this
  // Story's own AC doesn't mention validation, only IG-43's (from FSD section 38's explicit
  // "Validate invoice" step) does. It is gated on authentication (IG-30), same as Download PDF.
  const handlePrint = () => {
    if (!isAuthenticated) {
      setPendingGateAction("print");
      savePendingGateAction("print");
      track({ name: "anonymous_gate_shown", properties: { action: "print" } });
      return;
    }
    window.print();
  };

  // IG-31 AC: "Cancellation returns to the populated invoice without completing the gated action" -
  // clearing the persisted pending action (not just this component's local state) means a cancelled
  // request can't resurface and auto-complete later once IG-32 exists to act on it.
  const handleCloseAccountGate = () => {
    if (pendingGateAction) {
      track({ name: "anonymous_gate_dismissed", properties: { action: pendingGateAction } });
    }
    setPendingGateAction(null);
    clearPendingGateAction();
  };

  // IG-32: "The requested download starts or printer-friendly rendering opens without another
  // click" - once authenticated with a pending action recorded (IG-31), fires it automatically on
  // return. Download still goes through handleDownloadPdf's own validation rather than assuming
  // the draft is still valid; print has no validation gate, matching its normal click behavior.
  // Actually saving the invoice under the account first (this Story's other AC bullet) isn't
  // possible yet - no persistence exists (Epic IG-7/IG-9) - so the pending action is cleared here
  // once the automatic hand-off fires, rather than waiting for a "saved" event that can't happen.
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const pending = loadPendingGateAction();
    if (!pending) {
      return;
    }
    if (pending === "print") {
      clearPendingGateAction();
      track({ name: "pending_action_completed", properties: { action: "print" } });
      window.print();
      return;
    }
    // Download needs the templates list resolved first - selectedTemplateCode looks up the
    // restored draft.templateId against it, and would resolve to nothing if fired too early.
    if (templatesLoading) {
      return;
    }
    clearPendingGateAction();
    track({ name: "pending_action_completed", properties: { action: "download" } });
    // A deliberate one-shot side effect (fire the previously-requested download once, on the
    // render where auth+templates first become ready), not the "derive state from props"
    // anti-pattern this rule targets; handleDownloadPdf's own internal setState calls are
    // conditional on validation, which static analysis here can't see.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void handleDownloadPdf();
    // handleDownloadPdf intentionally isn't a dependency: it closes over the latest
    // draft/lineItems/etc. on every render, and re-running this effect whenever any of those
    // change would re-fire the one-shot auto-resume repeatedly instead of only once when
    // authentication first completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, templatesLoading]);

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

  return (
    <InvoiceEditorLayout
      editor={
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <EditorModeTabs advancedVisible={advancedVisible} onChange={setAdvancedVisible} />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReviewInvoice}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Review invoice
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfDownloading}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                {pdfDownloading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
          {pendingGateAction ? <AccountGateModal action={pendingGateAction} onClose={handleCloseAccountGate} /> : null}
          {draftRestored ? (
            <p role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <span>We restored your unsaved invoice draft from this browser.</span>
              <button type="button" onClick={handleDiscardDraft} className="font-semibold underline">
                Discard draft and start over
              </button>
            </p>
          ) : null}
          {pdfError ? (
            <p role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pdfError}
            </p>
          ) : null}
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
          <TemplateCustomizationPanel customization={draft.templateCustomization} onChange={handleCustomizationChange} />
          <LogoUpload logo={draft.logo} onLogoChange={handleLogoChange} />
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
          templateCustomization={draft.templateCustomization}
          logo={draft.logo}
        />
      }
    />
  );
}
