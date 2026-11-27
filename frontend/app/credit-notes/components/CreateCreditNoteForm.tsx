"use client";

import { useState } from "react";
import { createCreditNote, CreateCreditNoteRequest } from "../../lib/creditNotes";
import { InvoiceListItem } from "../../lib/invoiceList";

interface CreateCreditNoteFormProps {
  businessId: string;
  invoices: InvoiceListItem[];
  onSuccess?: () => void;
}

export function CreateCreditNoteForm({
  businessId,
  invoices,
  onSuccess,
}: CreateCreditNoteFormProps) {
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);
  const amountDue = selectedInvoice?.amountDue ?? 0;
  const invoiceTotal = selectedInvoice?.totalAmount ?? 0;
  const currency = selectedInvoice?.currency ?? "";
  const amountValue = parseFloat(amount) || 0;

  // IG-309 / IG-234 AC 3: two thresholds that mean different things. Above what is still
  // outstanding is allowed once the user confirms - crediting a paid invoice is a real case.
  // Above what the invoice was ever worth is refused outright, so a mistyped amount cannot become
  // a valid accounting document.
  const exceedsAmountDue = Boolean(selectedInvoice) && amountValue > amountDue;
  const exceedsInvoiceTotal = Boolean(selectedInvoice) && amountValue > invoiceTotal;

  const resetConfirmation = () => setPendingConfirmation(false);

  const submit = async (confirmedOverAmountDue: boolean) => {
    try {
      setLoading(true);
      const request: CreateCreditNoteRequest = {
        invoiceId,
        amount: amountValue,
        reason,
        notes: notes || undefined,
        confirmedOverAmountDue,
      };

      await createCreditNote(businessId, request);
      setSuccess(true);
      setPendingConfirmation(false);
      setInvoiceId("");
      setAmount("");
      setReason("");
      setNotes("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create credit note.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!invoiceId || !amount || !reason) {
      setError("Please fill in all required fields.");
      return;
    }

    if (amountValue <= 0) {
      setError("Credit amount must be greater than zero.");
      return;
    }

    if (exceedsInvoiceTotal) {
      setError(
        `Credit amount cannot exceed the invoice total of ${invoiceTotal.toFixed(2)} ${currency}.`
      );
      return;
    }

    if (exceedsAmountDue) {
      // Ask rather than refuse, and state the actual numbers - a generic "are you sure" does not
      // tell the user what they are about to over-credit by.
      setPendingConfirmation(true);
      return;
    }

    await submit(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="invoice" className="block text-sm font-medium text-ink">
          Invoice *
        </label>
        <select
          id="invoice"
          value={invoiceId}
          onChange={(e) => {
            setInvoiceId(e.target.value);
            // Changing the invoice changes both thresholds, so a pending confirmation is no
            // longer about the figures the user agreed to.
            resetConfirmation();
          }}
          className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
          required
        >
          <option value="">Select an invoice</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber} - Due: {inv.amountDue.toFixed(2)} {inv.currency}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-ink">
          Credit Amount *
          {selectedInvoice && (
            <span className="ml-2 text-sm font-normal text-muted">
              (Outstanding: {amountDue.toFixed(2)} {currency} · Invoice total: {invoiceTotal.toFixed(2)} {currency})
            </span>
          )}
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            resetConfirmation();
          }}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            exceedsInvoiceTotal ? "border-status-overdue-fg/40" : exceedsAmountDue ? "border-amber-300" : "border-border"
          }`}
          required
        />
        {exceedsInvoiceTotal ? (
          <p className="mt-1 text-sm text-status-overdue-fg">
            More than the invoice was worth. The most you can credit is {invoiceTotal.toFixed(2)} {currency}.
          </p>
        ) : exceedsAmountDue ? (
          <p className="mt-1 text-sm text-status-pending-fg">
            More than the {amountDue.toFixed(2)} {currency} still outstanding. You will be asked to confirm.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-ink">
          Reason *
        </label>
        <input
          id="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Duplicate invoice, Defective goods, Early payment discount"
          className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
          required
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
        />
      </div>

      {error && <div role="alert" className="rounded-md bg-status-overdue-bg/55 p-4 text-sm text-status-overdue-fg">{error}</div>}

      {success && (
        <div className="rounded-md bg-status-paid-bg/65 p-4 text-sm text-status-paid-fg">
          Credit note created successfully!
        </div>
      )}

      {/* IG-309: states the actual figures rather than a generic "are you sure" - the user needs
          to see what they are over-crediting by before they agree to it. */}
      {pendingConfirmation && (
        <div role="alert" className="rounded-md border border-status-pending-fg/25 bg-status-pending-bg/60 p-4 text-sm text-status-pending-fg">
          <p className="font-semibold">Credit more than is outstanding?</p>
          <p className="mt-1">
            This invoice has {amountDue.toFixed(2)} {currency} outstanding, and you are crediting{" "}
            {amountValue.toFixed(2)} {currency} — {(amountValue - amountDue).toFixed(2)} {currency} more
            than is owed.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={loading}
              className="px-3 py-2 bg-amber-700 text-white rounded-md text-sm font-medium hover:bg-amber-800 disabled:bg-border"
            >
              {loading ? "Creating..." : "Yes, credit this amount"}
            </button>
            <button
              type="button"
              onClick={resetConfirmation}
              disabled={loading}
              className="px-3 py-2 bg-paper border border-border text-ink rounded-md text-sm font-medium hover:bg-canvas"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || exceedsInvoiceTotal || pendingConfirmation}
        className="workspace-button-primary w-full"
      >
        {loading ? "Creating..." : "Create Credit Note"}
      </button>
    </form>
  );
}
