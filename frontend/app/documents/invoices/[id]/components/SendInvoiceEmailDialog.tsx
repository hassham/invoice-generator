"use client";

import { useEffect, useRef, useState } from "react";
import { getCustomer } from "../../../../lib/customers";
import { parseEmailList, sendInvoiceEmail } from "../../../../lib/invoiceEmail";

interface SendInvoiceEmailDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  onClose: () => void;
  onSent: () => void;
}

/**
 * IG-212 / docs/PRD.md section 11: "User enters: Recipient, CC, Subject, Message. System attaches
 * PDF and provides a hosted invoice link" - the latter two happen server-side, this only collects
 * the four sender-authored fields. Mirrors AccountGateModal/ConfirmDialog's established
 * overlay/focus-trap/Escape pattern rather than introducing a different one.
 */
export function SendInvoiceEmailDialog({ invoiceId, invoiceNumber, customerId, onClose, onSent }: SendInvoiceEmailDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(`Invoice ${invoiceNumber}`);
  const [message, setMessage] = useState(`Please find attached invoice ${invoiceNumber}. Let us know if you have any questions.`);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sensible default for Recipient (PRD's own wording) - the saved customer's own email, when
  // this invoice is linked to one. Silently left blank on failure/no email on file - same
  // "convenience, not a hard requirement" reasoning as every other pre-fill in this app.
  useEffect(() => {
    let cancelled = false;
    getCustomer(customerId)
      .then((customer) => {
        if (!cancelled && customer.email) {
          setTo(customer.email);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) {
          return;
        }
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      await sendInvoiceEmail(invoiceId, {
        to: parseEmailList(to),
        cc: parseEmailList(cc),
        subject,
        message,
      });
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send this invoice.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 cursor-default" tabIndex={-1} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-invoice-email-heading"
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl outline-none"
      >
        <h2 id="send-invoice-email-heading" className="text-lg font-bold text-slate-950">
          Send invoice by email
        </h2>
        <p className="mt-1 text-sm text-slate-600">The PDF and a link to view this invoice online are attached automatically.</p>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="send-invoice-to" className="text-sm font-medium text-slate-700">
              Recipient
            </label>
            <input
              id="send-invoice-to"
              type="text"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="customer@example.com"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="send-invoice-cc" className="text-sm font-medium text-slate-700">
              CC
            </label>
            <input
              id="send-invoice-cc"
              type="text"
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="accounts@example.com"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="send-invoice-subject" className="text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              id="send-invoice-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="send-invoice-message" className="text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              id="send-invoice-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
