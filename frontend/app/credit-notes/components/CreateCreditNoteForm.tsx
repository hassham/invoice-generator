"use client";

import { useState } from "react";
import { createCreditNote, CreateCreditNoteRequest } from "../../lib/creditNotes";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
}

interface CreateCreditNoteFormProps {
  businessId: string;
  invoices: Invoice[];
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

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);
  const maxAmount = selectedInvoice?.amountDue ?? 0;
  const amountValue = parseFloat(amount) || 0;
  const exceedsMax = amountValue > maxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!invoiceId || !amount || !reason) {
      setError("Please fill in all required fields.");
      return;
    }

    if (exceedsMax) {
      setError(`Credit amount cannot exceed the invoice amount due (${maxAmount.toFixed(2)} ${selectedInvoice?.currency}).`);
      return;
    }

    try {
      setLoading(true);
      const request: CreateCreditNoteRequest = {
        invoiceId,
        amount: amountValue,
        reason,
        notes: notes || undefined,
      };

      await createCreditNote(businessId, request);
      setSuccess(true);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="invoice" className="block text-sm font-medium text-gray-900">
          Invoice *
        </label>
        <select
          id="invoice"
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
        <label htmlFor="amount" className="block text-sm font-medium text-gray-900">
          Credit Amount *
          {selectedInvoice && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Max: {maxAmount.toFixed(2)} {selectedInvoice.currency})
            </span>
          )}
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            exceedsMax ? "border-red-300" : "border-gray-300"
          }`}
          required
        />
        {exceedsMax && (
          <p className="mt-1 text-sm text-red-600">Amount exceeds invoice amount due</p>
        )}
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-900">
          Reason *
        </label>
        <input
          id="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Duplicate invoice, Defective goods, Early payment discount"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Credit note created successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading || exceedsMax}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Creating..." : "Create Credit Note"}
      </button>
    </form>
  );
}
