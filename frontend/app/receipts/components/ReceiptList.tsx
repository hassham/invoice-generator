"use client";

import { useState } from "react";
import { Receipt, deleteReceipt, downloadReceiptPdf } from "../../lib/receipts";

interface ReceiptListProps {
  businessId: string;
  receipts: Receipt[];
  onReceiptDeleted: () => void;
}

export function ReceiptList({ businessId, receipts, onReceiptDeleted }: ReceiptListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDownload = async (receipt: Receipt) => {
    try {
      setDownloadLoading(receipt.id);
      setError(null);
      await downloadReceiptPdf(businessId, receipt.id, receipt.receiptNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download receipt");
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleDelete = async (receiptId: string) => {
    try {
      setActionLoading(receiptId);
      setError(null);
      await deleteReceipt(businessId, receiptId);
      setConfirmDelete(null);
      onReceiptDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete receipt");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      {error && <div className="rounded-md bg-status-overdue-bg/55 p-4 text-sm text-status-overdue-fg mb-4">{error}</div>}

      <div className="space-y-4">
        {receipts.map((receipt) => (
          <div
            key={receipt.id}
            className="border border-border rounded-lg p-4 hover:border-border"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-ink">{receipt.receiptNumber}</h3>
                <p className="text-sm text-muted mt-1">Invoice {receipt.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-ink">
                  {receipt.amount.toFixed(2)} {receipt.currency}
                </p>
                <p className="text-sm text-muted">{receipt.paymentMethod}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted">Payment Date</p>
                <p className="text-ink">{receipt.paymentDate}</p>
              </div>
              <div>
                <p className="text-muted">Receipt Date</p>
                <p className="text-ink">{receipt.issueDate}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => handleDownload(receipt)}
                disabled={downloadLoading === receipt.id}
                className="flex-1 px-3 py-2 text-sm font-medium text-status-sent-fg bg-status-sent-bg/55 border border-status-sent-fg/25 rounded-md hover:bg-status-sent-bg disabled:opacity-50"
              >
                {downloadLoading === receipt.id ? "Downloading..." : "Download PDF"}
              </button>

              <div className="relative">
                <button
                  onClick={() => setConfirmDelete(confirmDelete === receipt.id ? null : receipt.id)}
                  className="px-3 py-2 text-sm font-medium text-status-overdue-fg bg-status-overdue-bg/55 border border-status-overdue-fg/25 rounded-md hover:bg-status-overdue-bg"
                >
                  Delete
                </button>

                {confirmDelete === receipt.id && (
                  <div className="absolute right-0 top-full mt-1 bg-paper border border-border rounded-lg shadow-lg p-3 z-10 w-48">
                    <p className="text-sm text-ink font-medium mb-2">
                      Delete this receipt permanently?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDelete(receipt.id)}
                        disabled={actionLoading === receipt.id}
                        className="flex-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === receipt.id ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-2 py-1 text-xs font-medium text-ink bg-status-draft-bg rounded hover:bg-status-draft-bg"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
