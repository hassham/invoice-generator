"use client";

import { useEffect, useState } from "react";
import { createReceipt } from "../../lib/receipts";
import { listPayments, Payment } from "../../lib/payments";
import { InvoiceListItem } from "../../lib/invoiceList";

interface CreateReceiptFormProps {
  businessId: string;
  invoices: InvoiceListItem[];
  onSuccess?: () => void;
}

export function CreateReceiptForm({ businessId, invoices, onSuccess }: CreateReceiptFormProps) {
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);

  useEffect(() => {
    if (!invoiceId) return;

    let cancelled = false;

    const loadPayments = async () => {
      try {
        setPaymentsLoading(true);
        setError(null);
        const data = await listPayments(invoiceId);
        if (!cancelled) {
          setPayments(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load payments.");
          setPayments([]);
        }
      } finally {
        if (!cancelled) {
          setPaymentsLoading(false);
        }
      }
    };

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const handleInvoiceChange = (value: string) => {
    setInvoiceId(value);
    setPaymentId("");
    setPayments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!paymentId) {
      setError("Please select a payment to receipt.");
      return;
    }

    try {
      setLoading(true);
      await createReceipt(businessId, { paymentId });
      setSuccess(true);
      setInvoiceId("");
      setPaymentId("");
      setPayments([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create receipt.");
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
          onChange={(e) => handleInvoiceChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select an invoice</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="payment" className="block text-sm font-medium text-gray-900">
          Payment *
        </label>
        <select
          id="payment"
          value={paymentId}
          onChange={(e) => setPaymentId(e.target.value)}
          disabled={!invoiceId || paymentsLoading || payments.length === 0}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          required
        >
          <option value="">
            {!invoiceId
              ? "Select an invoice first"
              : paymentsLoading
                ? "Loading payments..."
                : payments.length === 0
                  ? "No payments recorded on this invoice"
                  : "Select a payment"}
          </option>
          {payments.map((p) => (
            <option key={p.id} value={p.id}>
              {p.paymentDate} - {p.amount.toFixed(2)} {selectedInvoice?.currency} ({p.paymentMethod})
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          The receipt records the payment exactly as it was banked - amount, date and method come
          from the payment itself.
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Receipt created successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !paymentId}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Creating..." : "Create Receipt"}
      </button>
    </form>
  );
}
