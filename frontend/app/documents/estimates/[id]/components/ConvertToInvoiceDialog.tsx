"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { convertEstimateToInvoice } from "../../../../lib/estimate";

interface ConvertToInvoiceDialogProps {
  estimateId: string;
  estimateNumber: string;
  onClose: () => void;
}

export function ConvertToInvoiceDialog({ estimateId, estimateNumber, onClose }: ConvertToInvoiceDialogProps) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setConverting(true);
    setError(null);
    try {
      const invoiceId = await convertEstimateToInvoice(estimateId);
      onClose();
      router.push(`/documents/invoices/${invoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert this estimate.");
      setConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-lg bg-paper p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">Convert Estimate to Invoice?</h2>
        <p className="mt-2 text-sm text-muted">
          This will create a new invoice from estimate <strong>{estimateNumber}</strong>. The estimate will be marked as converted.
        </p>
        {error ? (
          <p role="alert" className="mt-4 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-3 py-2 text-sm text-status-overdue-fg">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={converting}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={converting}
            className="workspace-button-primary disabled:opacity-50"
          >
            {converting ? "Converting…" : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}
