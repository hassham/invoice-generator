"use client";

import { useEffect, useState } from "react";
import {
  PAYMENT_METHODS,
  listPayments,
  recordPayment,
  removePayment,
  type InvoicePaymentSummary,
  type Payment,
  type PaymentMethod,
} from "../../../../lib/payments";

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface PaymentsSectionProps {
  invoiceId: string;
  currency: string;
  status: string;
  amountDue: number;
  onInvoiceUpdated: (summary: InvoicePaymentSummary) => void;
}

/**
 * FSD sections 66-72 (Epic IG-11): payment history plus a Record Payment form. Amount defaults to
 * the invoice's current outstanding balance and Date to today (both remain freely editable) - the
 * backend still enforces the actual overpayment/Cancelled-invoice rules, this just hides the form
 * when there's nothing left to collect or the invoice can't accept new payments, matching how
 * InvoiceDetail already hides Cancel once a status makes it inapplicable.
 */
export function PaymentsSection({ invoiceId, currency, status, amountDue, onInvoiceUpdated }: PaymentsSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(today());
  const [amount, setAmount] = useState(amountDue > 0 ? String(amountDue) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPayments(invoiceId)
      .then((loaded) => {
        if (!cancelled) {
          setPayments(loaded);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load payments for this invoice.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const canRecordPayment = status !== "Cancelled" && amountDue > 0;

  const handleRecord = async () => {
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setRecordError("Amount must be greater than zero.");
      return;
    }

    setRecording(true);
    setRecordError(null);
    try {
      const result = await recordPayment(invoiceId, {
        paymentDate,
        amount: parsedAmount,
        paymentMethod,
        reference: reference.trim().length > 0 ? reference.trim() : null,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      setPayments((current) => [result.payment, ...current]);
      onInvoiceUpdated(result.invoice);
      setPaymentDate(today());
      setAmount(result.invoice.amountDue > 0 ? String(result.invoice.amountDue) : "");
      setPaymentMethod("Cash");
      setReference("");
      setNotes("");
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : "Failed to record this payment.");
    } finally {
      setRecording(false);
    }
  };

  const handleRemove = async (paymentId: string) => {
    setRemovingId(paymentId);
    setRemoveError(null);
    try {
      const summary = await removePayment(invoiceId, paymentId);
      setPayments((current) => current.filter((payment) => payment.id !== paymentId));
      onInvoiceUpdated(summary);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Failed to remove this payment.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <fieldset className="mt-6 border-t border-border pt-6">
      <legend className="text-base font-semibold text-ink">Payments</legend>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {loadError}
        </p>
      ) : null}

      {payments.length > 0 ? (
        <div className="mt-4 workspace-table-scroll">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Method</th>
                <th className="py-2 pr-4 font-medium">Reference</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border">
                  <td className="py-2 pr-4 text-ink">{payment.paymentDate}</td>
                  <td className="py-2 pr-4 text-ink">{formatCurrency(payment.amount, currency)}</td>
                  <td className="py-2 pr-4 text-ink">{payment.paymentMethod}</td>
                  <td className="py-2 pr-4 text-ink">{payment.reference ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => void handleRemove(payment.id)}
                      disabled={removingId === payment.id}
                      className="font-medium text-status-overdue-fg hover:underline disabled:opacity-50"
                    >
                      {removingId === payment.id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No payments recorded yet.</p>
      )}

      {removeError ? (
        <p role="alert" className="mt-4 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {removeError}
        </p>
      ) : null}

      {canRecordPayment ? (
        <div className="mt-6 grid grid-cols-1 gap-4 rounded-md border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="payment-date" className="text-sm font-medium text-ink">
              Date
            </label>
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="workspace-field rounded-md border border-border px-3 py-2 text-sm text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="payment-amount" className="text-sm font-medium text-ink">
              Amount
            </label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="workspace-field rounded-md border border-border px-3 py-2 text-sm text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="payment-method" className="text-sm font-medium text-ink">
              Method
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              className="workspace-field rounded-md border border-border px-3 py-2 text-sm text-ink"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="payment-reference" className="text-sm font-medium text-ink">
              Reference (optional)
            </label>
            <input
              id="payment-reference"
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="workspace-field rounded-md border border-border px-3 py-2 text-sm text-ink"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <label htmlFor="payment-notes" className="text-sm font-medium text-ink">
              Notes (optional)
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="workspace-field rounded-md border border-border px-3 py-2 text-sm text-ink"
            />
          </div>

          {recordError ? (
            <p role="alert" className="sm:col-span-2 lg:col-span-3 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
              {recordError}
            </p>
          ) : null}

          <div>
            <button
              type="button"
              onClick={() => void handleRecord()}
              disabled={recording}
              className="workspace-button-primary disabled:opacity-50"
            >
              {recording ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {status === "Cancelled" ? "Payments cannot be added to a cancelled invoice." : "This invoice is fully paid."}
        </p>
      )}
    </fieldset>
  );
}
